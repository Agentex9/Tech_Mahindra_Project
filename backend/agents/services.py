import json
import os
from dataclasses import dataclass
from decimal import Decimal
from typing import Any
from urllib import error, request

from django.db.models import Count, Q
from django.utils import timezone

from projects.models import IssueAuctions, Issues, ProjectRisks, Projects, Sprints


@dataclass
class AgentRuntimeConfig:
    embedding_api_key: str
    embedding_base_url: str
    embedding_model: str
    embedding_provider: str
    llm_api_key: str
    llm_base_url: str
    llm_model: str
    llm_provider: str
    qdrant_api_key: str
    qdrant_collection: str
    qdrant_url: str
    rag_enabled: bool

    @classmethod
    def from_env(cls):
        llm_provider = os.getenv('AGENT_LLM_PROVIDER', 'openai').strip().lower()
        llm_base_url = os.getenv('AGENT_LLM_BASE_URL', '').strip()
        if not llm_base_url:
            llm_base_url = 'https://api.openai.com/v1' if llm_provider == 'openai' else 'https://api.anthropic.com/v1'

        embedding_provider = os.getenv('AGENT_EMBEDDING_PROVIDER', 'fastembed').strip().lower()
        embedding_base_url = os.getenv('AGENT_EMBEDDING_BASE_URL', '').strip() or 'https://api.openai.com/v1'
        llm_api_key = os.getenv('AGENT_LLM_API_KEY', '').strip()
        embedding_api_key = os.getenv('AGENT_EMBEDDING_API_KEY', '').strip() or llm_api_key

        return cls(
            embedding_api_key=embedding_api_key,
            embedding_base_url=embedding_base_url.rstrip('/'),
            embedding_model=os.getenv('AGENT_EMBEDDING_MODEL', 'BAAI/bge-small-en-v1.5').strip(),
            embedding_provider=embedding_provider,
            llm_api_key=llm_api_key,
            llm_base_url=llm_base_url.rstrip('/'),
            llm_model=os.getenv('AGENT_LLM_MODEL', 'gpt-4.1-mini').strip(),
            llm_provider=llm_provider,
            qdrant_api_key=os.getenv('AGENT_QDRANT_API_KEY', '').strip(),
            qdrant_collection=os.getenv('AGENT_QDRANT_COLLECTION', '').strip(),
            qdrant_url=os.getenv('AGENT_QDRANT_URL', '').strip().rstrip('/'),
            rag_enabled=os.getenv('AGENT_RAG_ENABLED', 'true').strip().lower() in {'1', 'true', 'yes', 'on'},
        )

    @property
    def llm_ready(self):
        return bool(self.llm_api_key and self.llm_model)

    @property
    def embeddings_ready(self):
        if self.embedding_provider == 'openai':
            return bool(self.embedding_api_key and self.embedding_model)
        return self.embedding_provider == 'fastembed' and bool(self.embedding_model)

    @property
    def qdrant_ready(self):
        return bool(self.qdrant_url and self.qdrant_collection)

    @property
    def rag_ready(self):
        return self.rag_enabled and self.embeddings_ready and self.qdrant_ready


class AgentAnalysisService:
    def __init__(self, config: AgentRuntimeConfig | None = None):
        self.config = config or AgentRuntimeConfig.from_env()

    def analyze(self, *, question: str, project_id: str | None = None, top_k: int = 5) -> dict[str, Any]:
        stats = self._build_workspace_stats(project_id=project_id)
        warnings: list[str] = []
        context_snippets: list[dict[str, Any]] = []

        if self.config.rag_enabled and not self.config.rag_ready:
            warnings.append(
                'RAG esta habilitado, pero faltan variables de embeddings o Qdrant. Se uso solo el snapshot relacional.'
            )

        if self.config.rag_ready:
            try:
                context_snippets = self._search_qdrant(question=question, top_k=top_k)
            except Exception as exc:  # pragma: no cover - defensive against remote failures
                warnings.append(f'No fue posible recuperar contexto desde Qdrant: {exc}')

        prompt = self._build_prompt(question=question, stats=stats, context_snippets=context_snippets)

        if not self.config.llm_ready:
            warnings.append('Falta configurar el proveedor LLM externo. Se devolvio un preview con stats y contexto disponible.')
            return {
                'answer': self._build_preview_answer(stats=stats, context_snippets=context_snippets, warnings=warnings),
                'context_snippets': context_snippets,
                'llm_model': self.config.llm_model,
                'llm_provider': self.config.llm_provider,
                'mode': 'preview',
                'question': question,
                'rag_enabled': self.config.rag_enabled,
                'stats': stats,
                'warnings': warnings,
            }

        try:
            answer = self._call_llm(prompt)
            mode = 'llm'
        except Exception as exc:  # pragma: no cover - defensive against remote failures
            warnings.append(f'No fue posible consultar el LLM externo: {exc}')
            answer = self._build_preview_answer(stats=stats, context_snippets=context_snippets, warnings=warnings)
            mode = 'preview'

        return {
            'answer': answer,
            'context_snippets': context_snippets,
            'llm_model': self.config.llm_model,
            'llm_provider': self.config.llm_provider,
            'mode': mode,
            'question': question,
            'rag_enabled': self.config.rag_enabled,
            'stats': stats,
            'warnings': warnings,
        }

    def _build_workspace_stats(self, *, project_id: str | None = None) -> dict[str, Any]:
        project_filters = Q()
        issue_filters = Q()
        auction_filters = Q()
        risk_filters = Q()
        sprint_filters = Q()

        if project_id:
            project_filters &= Q(project_id=project_id)
            issue_filters &= Q(project_id=project_id)
            auction_filters &= Q(issue__project_id=project_id)
            risk_filters &= Q(project_id=project_id)
            sprint_filters &= Q(project_id=project_id)

        project_status_breakdown = {
            entry['status']: entry['total']
            for entry in Projects.objects.filter(project_filters)
            .values('status')
            .annotate(total=Count('project_id'))
            .order_by('status')
        }
        issues_by_status = {
            entry['status']: entry['total']
            for entry in Issues.objects.filter(issue_filters)
            .values('status')
            .annotate(total=Count('issue_id'))
            .order_by('status')
        }

        projects = []
        annotated_projects = (
            Projects.objects.filter(project_filters)
            .annotate(
                issue_total=Count('issues', distinct=True),
                open_issue_total=Count('issues', filter=~Q(issues__status='Completed'), distinct=True),
                risk_total=Count('risks', distinct=True),
                sprint_total=Count('sprints', filter=Q(sprints__status='In Progress'), distinct=True),
                active_auction_total=Count(
                    'issues__auctions',
                    filter=Q(issues__auctions__status='In Progress'),
                    distinct=True,
                ),
            )
            .order_by('name')
        )
        for project in annotated_projects:
            projects.append(
                {
                    'active_auctions': project.active_auction_total,
                    'active_sprints': project.sprint_total,
                    'issues': project.issue_total,
                    'name': project.name,
                    'open_issues': project.open_issue_total,
                    'project_id': str(project.project_id),
                    'risks': project.risk_total,
                    'status': project.status,
                }
            )

        return {
            'active_auctions': IssueAuctions.objects.filter(auction_filters, status='In Progress').count(),
            'active_sprints': Sprints.objects.filter(sprint_filters, status='In Progress').count(),
            'issues_by_status': issues_by_status,
            'open_issues': Issues.objects.filter(issue_filters).exclude(status='Completed').count(),
            'project_count': Projects.objects.filter(project_filters).count(),
            'project_status_breakdown': project_status_breakdown,
            'projects': projects,
            'total_issues': Issues.objects.filter(issue_filters).count(),
            'total_risks': ProjectRisks.objects.filter(risk_filters).count(),
        }

    def _build_prompt(self, *, question: str, stats: dict[str, Any], context_snippets: list[dict[str, Any]]) -> str:
        prompt_payload = {
            'question': question,
            'generated_at': timezone.now().isoformat(),
            'workspace_stats': stats,
            'context_snippets': context_snippets,
        }
        return (
            'Eres un analista de riesgos y operaciones para WorkTrack. '\
            'Usa solo el contexto disponible para resumir el estado general, detectar riesgos operativos, '\
            'señalar huecos de informacion y proponer acciones concretas en bullets. '\
            'Si faltan datos, dilo explicitamente.\n\n'
            f'{json.dumps(prompt_payload, ensure_ascii=False, indent=2, default=self._json_default)}'
        )

    def _build_preview_answer(self, *, stats: dict[str, Any], context_snippets: list[dict[str, Any]], warnings: list[str]) -> str:
        top_project_names = ', '.join(project['name'] for project in stats['projects'][:3]) or 'sin proyectos registrados'
        snippet_count = len(context_snippets)
        warning_text = ' '.join(warnings) if warnings else 'Sin advertencias adicionales.'
        return (
            'Preview del agente listo. '\
            f'Se detectaron {stats["project_count"]} proyectos, {stats["total_issues"]} issues, '\
            f'{stats["total_risks"]} riesgos y {stats["active_auctions"]} subastas activas. '\
            f'Proyectos visibles: {top_project_names}. '\
            f'Contexto RAG recuperado: {snippet_count} fragmentos. '\
            f'Advertencias: {warning_text}'
        )

    def _search_qdrant(self, *, question: str, top_k: int) -> list[dict[str, Any]]:
        vector = self._embed_query(question)
        payload = {
            'vector': vector,
            'limit': top_k,
            'with_payload': True,
        }
        response = self._http_post_json(
            f'{self.config.qdrant_url}/collections/{self.config.qdrant_collection}/points/search',
            payload,
            headers={'api-key': self.config.qdrant_api_key} if self.config.qdrant_api_key else None,
        )
        results = response.get('result') or []
        snippets = []
        for item in results:
            payload = item.get('payload') or {}
            snippets.append(
                {
                    'id': str(item.get('id', '')),
                    'metadata': payload,
                    'score': float(item.get('score', 0)),
                    'text': payload.get('text') or payload.get('content') or '',
                    'title': payload.get('title') or payload.get('source') or '',
                }
            )
        return [snippet for snippet in snippets if snippet['text']]

    def _embed_query(self, question: str) -> list[float]:
        if self.config.embedding_provider == 'fastembed':
            try:
                from fastembed import TextEmbedding
            except ImportError as exc:
                raise RuntimeError('Falta instalar fastembed para usar embeddings locales.') from exc

            model = TextEmbedding(model_name=self.config.embedding_model)
            embeddings = list(model.embed([question]))
            if not embeddings:
                raise RuntimeError('FastEmbed no devolvio vectores.')
            return embeddings[0].tolist()

        if self.config.embedding_provider != 'openai':
            raise RuntimeError(f'Proveedor de embeddings no soportado: {self.config.embedding_provider}.')

        response = self._http_post_json(
            f'{self.config.embedding_base_url}/embeddings',
            {
                'input': question,
                'model': self.config.embedding_model,
            },
            headers={
                'Authorization': f'Bearer {self.config.embedding_api_key}',
            },
        )
        data = response.get('data') or []
        if not data:
            raise RuntimeError('El proveedor de embeddings no devolvio vectores.')
        return data[0]['embedding']

    def _call_llm(self, prompt: str) -> str:
        if self.config.llm_provider == 'anthropic':
            response = self._http_post_json(
                f'{self.config.llm_base_url}/messages',
                {
                    'max_tokens': 900,
                    'messages': [
                        {
                            'role': 'user',
                            'content': prompt,
                        }
                    ],
                    'model': self.config.llm_model,
                },
                headers={
                    'anthropic-version': '2023-06-01',
                    'x-api-key': self.config.llm_api_key,
                },
            )
            content = response.get('content') or []
            text_blocks = [block.get('text', '') for block in content if block.get('type') == 'text']
            return '\n'.join(part for part in text_blocks if part).strip()

        response = self._http_post_json(
            f'{self.config.llm_base_url}/chat/completions',
            {
                'messages': [
                    {
                        'role': 'system',
                        'content': 'Responde en español con foco ejecutivo, riesgos y acciones concretas.',
                    },
                    {
                        'role': 'user',
                        'content': prompt,
                    },
                ],
                'model': self.config.llm_model,
                'temperature': 0.2,
            },
            headers={
                'Authorization': f'Bearer {self.config.llm_api_key}',
            },
        )
        choices = response.get('choices') or []
        if not choices:
            raise RuntimeError('El proveedor LLM no devolvio respuestas.')
        return choices[0].get('message', {}).get('content', '').strip()

    def _http_post_json(self, url: str, payload: dict[str, Any], headers: dict[str, str] | None = None) -> dict[str, Any]:
        request_headers = {
            'Content-Type': 'application/json',
        }
        if headers:
            request_headers.update({key: value for key, value in headers.items() if value})

        raw_request = request.Request(
            url,
            data=json.dumps(payload).encode('utf-8'),
            headers=request_headers,
            method='POST',
        )
        try:
            with request.urlopen(raw_request, timeout=30) as response:
                body = response.read().decode('utf-8')
        except error.HTTPError as exc:
            error_body = exc.read().decode('utf-8', errors='replace')
            raise RuntimeError(f'HTTP {exc.code}: {error_body}') from exc
        except error.URLError as exc:
            raise RuntimeError(str(exc.reason)) from exc

        return json.loads(body)

    def _json_default(self, value: Any):
        if isinstance(value, Decimal):
            return float(value)
        return str(value)
