# syntax=docker/dockerfile:1

FROM oven/bun:1.2-slim AS deps
WORKDIR /app
COPY package.json bun.lock ./
COPY apps/web/package.json apps/web/
COPY apps/api/package.json apps/api/
COPY apps/worker/package.json apps/worker/
COPY packages/shared/package.json packages/shared/
COPY packages/database/package.json packages/database/
RUN bun install --frozen-lockfile

FROM oven/bun:1.2-slim AS runtime-base
RUN apt-get update \
 && apt-get install -y --no-install-recommends ffmpeg ca-certificates curl \
 && rm -rf /var/lib/apt/lists/*

FROM runtime-base AS app
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY packages ./packages
COPY apps/api ./apps/api
COPY apps/worker ./apps/worker

FROM app AS api
EXPOSE 3000
CMD ["bun", "run", "apps/api/src/index.ts"]

FROM app AS worker
CMD ["bun", "run", "apps/worker/src/index.ts"]

FROM app AS db-init
CMD ["sh", "-c", "bun run --cwd packages/database db:migrate"]

FROM app AS garage-init
WORKDIR /app
COPY infra/garage/init-garage.ts ./init-garage.ts
ENTRYPOINT ["bun", "run", "init-garage.ts"]
