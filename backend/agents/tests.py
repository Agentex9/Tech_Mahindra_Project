from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from agents.services import AgentAnalysisService, AgentRuntimeConfig
from projects.models import IssueAuctions, Issues, ProjectRisks, Projects, Sprints


User = get_user_model()


class AgentAnalysisApiTests(APITestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            username='admin-user',
            password='password123',
            role='Admin',
        )
        self.pm = User.objects.create_user(
            username='pm-user',
            password='password123',
            role='PM',
        )
        self.developer = User.objects.create_user(
            username='developer-user',
            password='password123',
            role='Developer',
        )
        self.project = Projects.objects.create(
            name='Proyecto agente',
            status='In Progress',
            created_by=self.pm,
            updated_by=self.pm,
            project_manager=self.pm,
        )
        self.issue = Issues.objects.create(
            project=self.project,
            title='Issue abierto',
            assignment_type='Bidding',
            status='In Progress',
            created_by=self.pm,
            updated_by=self.pm,
        )
        IssueAuctions.objects.create(
            issue=self.issue,
            start_date='2026-01-01T10:00:00Z',
            end_date='2026-01-02T10:00:00Z',
            status='In Progress',
            created_by=self.pm,
            updated_by=self.pm,
        )
        ProjectRisks.objects.create(
            project=self.project,
            risk_name='Dependencia externa',
            deviation_tolerance_percentage='15.00',
            delay_weight='40.00',
            budget_weight='20.00',
            created_by=self.pm,
            updated_by=self.pm,
        )
        Sprints.objects.create(
            project=self.project,
            name='Sprint 1',
            start_date='2026-01-01',
            end_date='2026-01-10',
            status='In Progress',
            created_by=self.pm,
            updated_by=self.pm,
        )

    def test_privileged_user_receives_preview_when_llm_is_not_configured(self):
        self.client.force_authenticate(user=self.pm)

        response = self.client.post(
            reverse('agents:analyze'),
            {
                'question': 'Resume los riesgos generales del workspace.',
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['mode'], 'preview')
        self.assertEqual(response.data['stats']['project_count'], 1)
        self.assertEqual(response.data['stats']['total_issues'], 1)
        self.assertEqual(response.data['stats']['total_risks'], 1)
        self.assertEqual(response.data['stats']['active_auctions'], 1)
        self.assertIn('Falta configurar el proveedor LLM externo', ' '.join(response.data['warnings']))

    def test_developer_cannot_access_agent_analysis(self):
        self.client.force_authenticate(user=self.developer)

        response = self.client.post(
            reverse('agents:analyze'),
            {
                'question': 'Esto no deberia pasar.',
            },
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    @patch('agents.views.call_command')
    def test_admin_can_sync_qdrant(self, call_command_mock):
        self.client.force_authenticate(user=self.admin)

        response = self.client.post(reverse('agents:sync-qdrant'), {}, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['detail'], 'Qdrant sincronizado correctamente.')
        call_command_mock.assert_called_once()
        self.assertEqual(call_command_mock.call_args.args[0], 'sync_qdrant')

    @patch('agents.views.call_command')
    def test_pm_cannot_sync_qdrant(self, call_command_mock):
        self.client.force_authenticate(user=self.pm)

        response = self.client.post(reverse('agents:sync-qdrant'), {}, format='json')

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        call_command_mock.assert_not_called()


class AgentAnalysisServiceTests(APITestCase):
    def test_llm_high_demand_error_is_user_friendly(self):
        service = AgentAnalysisService()

        message = service._friendly_llm_error(
            RuntimeError(
                'HTTP 500: {"error":{"message":"gemini-3.5-flash is currently experiencing high demand","code":"api_error"}}'
            )
        )

        self.assertEqual(
            message,
            'El proveedor LLM esta saturado temporalmente. Se genero un resumen preliminar con los datos locales.',
        )
        self.assertNotIn('HTTP 500', message)
        self.assertNotIn('gemini-3.5-flash', message)

    def test_gemini_llm_call_uses_interactions_rest_api(self):
        config = AgentRuntimeConfig(
            embedding_api_key='',
            embedding_base_url='https://api.openai.com/v1',
            embedding_model='BAAI/bge-small-en-v1.5',
            embedding_provider='fastembed',
            http_timeout_seconds=20,
            llm_api_key='test-key',
            llm_base_url='https://generativelanguage.googleapis.com/v1beta',
            llm_model='gemini-3.5-flash',
            llm_provider='gemini',
            qdrant_api_key='',
            qdrant_collection='',
            qdrant_url='',
            rag_enabled=False,
        )
        service = AgentAnalysisService(config=config)
        calls = []

        def fake_post(url, payload, headers=None):
            calls.append((url, payload, headers))
            return {'output_text': 'Respuesta ejecutiva'}

        service._http_post_json = fake_post

        self.assertEqual(service._call_llm('Analiza el workspace'), 'Respuesta ejecutiva')
        self.assertEqual(calls[0][0], 'https://generativelanguage.googleapis.com/v1beta/interactions')
        self.assertEqual(
            calls[0][1],
            {
                'input': 'Analiza el workspace',
                'model': 'gemini-3.5-flash',
            },
        )
        self.assertEqual(
            calls[0][2],
            {
                'Api-Revision': '2026-05-20',
                'x-goog-api-key': 'test-key',
            },
        )
