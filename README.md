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
