import uuid

from django.core.management.base import BaseCommand, CommandError

from agents.services import AgentAnalysisService, AgentRuntimeConfig
from projects.models import (
    IssueAuctions,
    IssueBids,
    IssueComments,
    Issues,
    ProjectFinancials,
    ProjectPlannings,
    ProjectRisks,
    Projects,
    Sprints,
)


EMBEDDING_DIMENSIONS = {
    'BAAI/bge-small-en-v1.5': 384,
    'text-embedding-3-small': 1536,
    'text-embedding-3-large': 3072,
    'text-embedding-ada-002': 1536,
}
POINT_NAMESPACE = uuid.UUID('2a3a2f42-87c5-4d9b-9c35-7df136b31d39')


class Command(BaseCommand):
    help = 'Synchronize WorkTrack relational data into the configured Qdrant collection.'

    def add_arguments(self, parser):
        parser.add_argument('--batch-size', type=int, default=32)
        parser.add_argument('--dry-run', action='store_true')
        parser.add_argument('--project-id')
        parser.add_argument('--recreate', action='store_true')

    def handle(self, *args, **options):
        config = AgentRuntimeConfig.from_env()
        self._validate_config(config)

        documents = [document for document in self._build_documents(project_id=options.get('project_id')) if document]
        if not documents:
            self.stdout.write(self.style.WARNING('No hay datos para sincronizar con Qdrant.'))
            return

        if options['dry_run']:
            self.stdout.write(f'Se generarian {len(documents)} documentos para Qdrant.')
            for document in documents[:5]:
                self.stdout.write(f'- {document["payload"]["source_type"]}:{document["payload"]["source_id"]}')
            return

        from qdrant_client import QdrantClient
        from qdrant_client.models import PointStruct

        client = QdrantClient(
            url=config.qdrant_url,
            api_key=config.qdrant_api_key or None,
            timeout=30,
        )
        service = AgentAnalysisService(config=config)
        vector_size = self._get_vector_size(config)

        if options['recreate']:
            client.recreate_collection(
                collection_name=config.qdrant_collection,
                vectors_config=self._vector_params(vector_size),
            )
        else:
            self._ensure_collection(client, config.qdrant_collection, vector_size)

        synced = 0
        batch_size = max(options['batch_size'], 1)
        for start in range(0, len(documents), batch_size):
            batch = documents[start : start + batch_size]
            points = []
            for document in batch:
                text = document['payload']['text']
                points.append(
                    PointStruct(
                        id=document['id'],
                        vector=service._embed_query(text),
                        payload=document['payload'],
                    )
                )

            client.upsert(collection_name=config.qdrant_collection, points=points, wait=True)
            synced += len(points)
            self.stdout.write(f'Sincronizados {synced}/{len(documents)} documentos...')

        self.stdout.write(self.style.SUCCESS(f'Qdrant sincronizado: {synced} documentos.'))

    def _validate_config(self, config):
        if not config.qdrant_url:
            raise CommandError('Falta AGENT_QDRANT_URL.')
        if not config.qdrant_collection:
            raise CommandError('Falta AGENT_QDRANT_COLLECTION.')
        if not config.embeddings_ready:
            raise CommandError('Faltan AGENT_EMBEDDING_API_KEY/AGENT_LLM_API_KEY o AGENT_EMBEDDING_MODEL.')

    def _ensure_collection(self, client, collection_name, vector_size):
        if client.collection_exists(collection_name=collection_name):
            return

        client.create_collection(
            collection_name=collection_name,
            vectors_config=self._vector_params(vector_size),
        )

    def _get_vector_size(self, config):
        if config.embedding_provider == 'fastembed':
            return EMBEDDING_DIMENSIONS.get(config.embedding_model, 384)
        return EMBEDDING_DIMENSIONS.get(config.embedding_model, 1536)

    def _vector_params(self, vector_size):
        from qdrant_client.models import Distance, VectorParams

        return VectorParams(size=vector_size, distance=Distance.COSINE)

    def _point_id(self, source_type, source_id):
        return str(uuid.uuid5(POINT_NAMESPACE, f'{source_type}:{source_id}'))

    def _document(self, source_type, source_id, title, text, **metadata):
        clean_text = ' '.join(str(text).split())
        if not clean_text:
            return None

        payload = {
            'source_id': str(source_id),
            'source_type': source_type,
            'text': clean_text[:12000],
            'title': title,
            **{key: self._stringify(value) for key, value in metadata.items()},
        }
        return {
            'id': self._point_id(source_type, source_id),
            'payload': payload,
        }

    def _build_documents(self, project_id=None):
        project_filter = {'project_id': project_id} if project_id else {}
        issue_filter = {'project_id': project_id} if project_id else {}
        nested_project_filter = {'issue__project_id': project_id} if project_id else {}

        for project in Projects.objects.filter(**project_filter).select_related('project_manager').order_by('name'):
            manager = self._user_label(project.project_manager)
            yield self._document(
                'project',
                project.project_id,
                project.name,
                (
                    f'Proyecto {project.name}. Estado: {project.status}. Cliente: {project.client or "sin cliente"}. '
                    f'Tipo: {project.project_type or "sin tipo"}. Project manager: {manager}. '
                    f'Descripcion: {project.description or "sin descripcion"}.'
                ),
                project_id=project.project_id,
                status=project.status,
                updated_at=project.updated_at,
            )

        for planning in ProjectPlannings.objects.filter(**project_filter).select_related('project').order_by('project__name'):
            yield self._document(
                'project_planning',
                planning.planning_id,
                f'Planeacion de {planning.project.name}',
                (
                    f'Planeacion del proyecto {planning.project.name}. Inicio planeado: {planning.planned_start_date}. '
                    f'Fin planeado: {planning.planned_end_date}. Duracion estimada: {planning.estimated_duration} dias. '
                    f'Metodologia: {planning.methodology or "sin metodologia"}. '
                    f'Sprints estimados: {planning.estimated_sprint_count}. Alcance: {planning.scope_statement or "sin alcance"}.'
                ),
                project_id=planning.project_id,
                updated_at=planning.updated_at,
            )

        for financial in ProjectFinancials.objects.filter(**project_filter).select_related('project').order_by('project__name'):
            yield self._document(
                'project_financial',
                financial.financial_id,
                f'Finanzas de {financial.project.name}',
                (
                    f'Finanzas del proyecto {financial.project.name}. Presupuesto estimado: {financial.estimated_budget}. '
                    f'Costo mensual estimado: {financial.estimated_monthly_cost}. '
                    f'Modelo de facturacion: {financial.billing_model or "sin modelo"}.'
                ),
                project_id=financial.project_id,
                updated_at=financial.updated_at,
            )

        for risk in ProjectRisks.objects.filter(**project_filter).select_related('project').order_by('project__name'):
            yield self._document(
                'project_risk',
                risk.risk_id,
                f'Riesgo {risk.risk_name}',
                (
                    f'Riesgo {risk.risk_name} del proyecto {risk.project.name}. '
                    f'Descripcion: {risk.risk_description or "sin descripcion"}. '
                    f'Tolerancia de desviacion: {risk.deviation_tolerance_percentage}%. '
                    f'Peso retraso: {risk.delay_weight}. Peso presupuesto: {risk.budget_weight}. '
                    f'Complejidad: {risk.complexity_level or "sin complejidad"}. '
                    f'Dependencias externas: {risk.external_dependencies or "sin dependencias externas"}.'
                ),
                project_id=risk.project_id,
                updated_at=risk.updated_at,
            )

        for sprint in Sprints.objects.filter(**project_filter).select_related('project').order_by('project__name', 'name'):
            yield self._document(
                'sprint',
                sprint.sprint_id,
                f'Sprint {sprint.name}',
                (
                    f'Sprint {sprint.name} del proyecto {sprint.project.name}. Estado: {sprint.status}. '
                    f'Inicio: {sprint.start_date}. Fin: {sprint.end_date}. Objetivos: {sprint.goals or "sin objetivos"}.'
                ),
                project_id=sprint.project_id,
                status=sprint.status,
                updated_at=sprint.updated_at,
            )

        issues = (
            Issues.objects.filter(**issue_filter)
            .select_related('project', 'assigned_to', 'informed_by')
            .prefetch_related('labels')
            .order_by('project__name', 'title')
        )
        for issue in issues:
            labels = ', '.join(label.name for label in issue.labels.all()) or 'sin etiquetas'
            yield self._document(
                'issue',
                issue.issue_id,
                f'Issue {issue.title}',
                (
                    f'Issue {issue.title} del proyecto {issue.project.name}. Estado: {issue.status}. '
                    f'Tipo: {issue.issue_type or "sin tipo"}. Prioridad: {issue.priority or "sin prioridad"}. '
                    f'Asignacion: {issue.assignment_type or "sin asignacion"}. Story points: {issue.story_points or "sin story points"}. '
                    f'Reward points: {issue.reward_points or "sin reward points"}. Precio: {issue.price_points or "sin precio"}. '
                    f'Fecha limite: {issue.due_date or "sin fecha limite"}. '
                    f'Asignado a: {self._user_label(issue.assigned_to)}. Informado por: {self._user_label(issue.informed_by)}. '
                    f'Etiquetas: {labels}. Descripcion: {issue.description or "sin descripcion"}.'
                ),
                project_id=issue.project_id,
                issue_id=issue.issue_id,
                status=issue.status,
                updated_at=issue.updated_at,
            )

        comments = IssueComments.objects.filter(**nested_project_filter).select_related('issue', 'issue__project', 'created_by')
        for comment in comments.order_by('issue__project__name', 'issue__title', 'created_at'):
            yield self._document(
                'issue_comment',
                comment.comment_id,
                f'Comentario en {comment.issue.title}',
                (
                    f'Comentario del issue {comment.issue.title} del proyecto {comment.issue.project.name}. '
                    f'Autor: {self._user_label(comment.created_by)}. Comentario: {comment.comment_text}.'
                ),
                project_id=comment.issue.project_id,
                issue_id=comment.issue_id,
                updated_at=comment.updated_at,
            )

        auctions = IssueAuctions.objects.filter(**nested_project_filter).select_related('issue', 'issue__project', 'winner')
        for auction in auctions.order_by('issue__project__name', 'issue__title', 'start_date'):
            yield self._document(
                'issue_auction',
                auction.auction_id,
                f'Subasta de {auction.issue.title}',
                (
                    f'Subasta del issue {auction.issue.title} del proyecto {auction.issue.project.name}. '
                    f'Estado: {auction.status}. Inicio: {auction.start_date}. Fin: {auction.end_date}. '
                    f'Ganador: {self._user_label(auction.winner)}.'
                ),
                project_id=auction.issue.project_id,
                issue_id=auction.issue_id,
                status=auction.status,
                updated_at=auction.updated_at,
            )

        bids = IssueBids.objects.filter(auction__issue__project_id=project_id) if project_id else IssueBids.objects.all()
        bids = bids.select_related('auction', 'auction__issue', 'auction__issue__project', 'bidder')
        for bid in bids.order_by('auction__issue__project__name', 'auction__issue__title', 'created_at'):
            yield self._document(
                'issue_bid',
                bid.bid_id,
                f'Oferta de {bid.auction.issue.title}',
                (
                    f'Oferta para la subasta del issue {bid.auction.issue.title} del proyecto {bid.auction.issue.project.name}. '
                    f'Bidder: {self._user_label(bid.bidder)}. Monto: {bid.bid_amount}.'
                ),
                project_id=bid.auction.issue.project_id,
                issue_id=bid.auction.issue_id,
                auction_id=bid.auction_id,
                updated_at=bid.updated_at,
            )

    def _user_label(self, user):
        if not user:
            return 'sin usuario'
        return getattr(user, 'username', str(user))

    def _stringify(self, value):
        if value is None:
            return ''
        return str(value)
