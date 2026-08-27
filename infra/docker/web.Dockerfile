# syntax=docker/dockerfile:1

FROM oven/bun:1.2-slim AS build
WORKDIR /app
COPY package.json bun.lock ./
COPY apps/web/package.json apps/web/
COPY apps/api/package.json apps/api/
COPY apps/worker/package.json apps/worker/
COPY packages/shared/package.json packages/shared/
COPY packages/database/package.json packages/database/
RUN bun install --frozen-lockfile
COPY apps/web ./apps/web
COPY apps/api ./apps/api
COPY packages ./packages
COPY tsconfig.json ./
RUN mkdir -p apps/web/static/ffmpeg && cp node_modules/@ffmpeg/core/dist/esm/* apps/web/static/ffmpeg/

ARG VITE_API_URL=http://localhost:5173/api
ENV VITE_API_URL=$VITE_API_URL
RUN bun run --cwd apps/web build

FROM nginx:1.27-alpine
COPY infra/nginx/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/build /usr/share/nginx/html
EXPOSE 80
