from django.core.management.base import BaseCommand

from projects.services import complete_expired_auctions


class Command(BaseCommand):
    help = 'Completa las subastas vencidas y asigna el issue al mejor postor.'

    def handle(self, *args, **options):
        completed = complete_expired_auctions()
        self.stdout.write(self.style.SUCCESS(f'Subastas vencidas procesadas: {completed}'))
