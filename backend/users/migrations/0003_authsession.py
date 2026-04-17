import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('knox', '0009_extend_authtoken_field'),
        ('users', '0002_alter_user_points_balance_default'),
    ]

    operations = [
        migrations.CreateModel(
            name='AuthSession',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('ip_address', models.GenericIPAddressField(blank=True, null=True)),
                ('user_agent', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('last_seen_at', models.DateTimeField(auto_now=True)),
                ('token', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='session_metadata', to='knox.authtoken')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='auth_sessions', to=settings.AUTH_USER_MODEL)),
            ],
        ),
    ]
