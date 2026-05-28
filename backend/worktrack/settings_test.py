from .settings import *

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': ':memory:',
    }
}

PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.MD5PasswordHasher',
]

DEBUG = False
DEBUG_TOOLBAR_ENABLED = False
ALLOWED_HOSTS = ['testserver', 'localhost', '127.0.0.1']
