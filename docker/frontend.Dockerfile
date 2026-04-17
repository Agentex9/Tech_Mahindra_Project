FROM oven/bun:1.3.11

WORKDIR /app/frontend

COPY bunfig.toml /app/bunfig.toml
COPY frontend/package.json frontend/bun.lock frontend/tsconfig.json frontend/react-router.config.ts frontend/vite.config.ts /app/frontend/
RUN bun install

EXPOSE 5173

CMD ["bun", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]
