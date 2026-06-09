# Tech Mahindra Project

## Requisitos

- Tener [Bun](https://bun.sh/) instalado en tu sistema.

## Instalacion inicial

1. Instala dependencias:

```bash
bun install
```

2. Instala los hooks de Git (lefthook):

```bash
bun run hooks:install
```

## Formato de commits

Este proyecto usa `commitlint` con formato convencional:

`tipo(scope): descripcion`

Ejemplo:

`feat(ui): agregar menu responsive en navbar`

### Tipos permitidos

- `feat`
- `fix`
- `docs`
- `style`
- `refactor`
- `perf`
- `test`
- `build`
- `ci`
- `chore`
- `revert`
- `security`

### Scopes permitidos

- `ui`
- `pages`
- `components`
- `styles`
- `assets`
- `api`
- `auth`
- `docker`
- `db`
- `seo`
- `content`
- `config`
- `build`
- `ci`
- `release`
- `deps`
- `repo`

## Comandos utiles

- Validar ultimo commit:

```bash
bun run commit:check
```

- Ejecutar pre-commit manualmente:

```bash
bun run hooks:run:pre-commit
```

## Docker dev

Levantar base de datos, backend Django y frontend React Router con hot reload:

```bash
docker compose --env-file .env -f docker/docker-compose.dev.yml up --build
```

Servicios:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:8000`
- PostgreSQL: `localhost:5432`
- Qdrant: `http://localhost:6333`

En `.env`, para Docker dev usa `AGENT_QDRANT_URL=http://qdrant:6333`. Si ejecutas Django fuera de Docker, usa `http://localhost:6333`.

Sincronizar datos relacionales hacia Qdrant para el agente RAG:

```bash
docker compose --env-file .env -f docker/docker-compose.dev.yml exec backend python manage.py sync_qdrant
```

El agente usa Gemini por defecto. Configura `AGENT_LLM_API_KEY` con tu API key de Gemini para responder con LLM real. La base URL recomendada es `AGENT_LLM_BASE_URL=https://generativelanguage.googleapis.com/v1beta`; si la omites, el backend usa ese valor por defecto cuando `AGENT_LLM_PROVIDER=gemini`. `AGENT_HTTP_TIMEOUT_SECONDS` debe ser menor al timeout de Gunicorn para que el agente devuelva preview con advertencia cuando el proveedor externo tarde demasiado. En produccion, `GUNICORN_TIMEOUT` debe permitir que la sincronizacion manual de Qdrant termine. Los embeddings RAG usan FastEmbed local por defecto, asi que no necesitan API key.

Para detenerlos:

```bash
docker compose --env-file .env -f docker/docker-compose.dev.yml down
```
