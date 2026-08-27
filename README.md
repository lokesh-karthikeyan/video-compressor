# Video Compressor

Web-based video compression tool with server-side processing via RabbitMQ and Garage S3.

## Features

- Browser-side FFmpeg WASM compression (<50MB files, 3/day limit)
- Server-side compression for authenticated users (unlimited)
- Video trimming and cropping for authenticated users
- Preset-based quality settings with target file size
- Real-time progress tracking via polling
- JWT authentication with access/refresh tokens

## Demo



https://github.com/user-attachments/assets/28889414-e5ec-455a-91cd-8f50e0980373



## Prerequisites

- [Bun](https://bun.sh) 1.1+
- [Docker](https://docs.docker.com/get-docker/) + Docker Compose

## Quick Start

```bash
git clone <repo-url> && cd video-compressor
bun install
cp .env.example .env   # fill in secrets
bun run docker:up      # http://localhost:5173
```

## Local Development

Requires a local SQLite database and RabbitMQ/Garage instances, or run individual services:

```bash
bun run db:migrate       # setup database
bun run dev:frontend     # http://localhost:5173
bun run dev:backend      # http://localhost:3000
bun run dev:worker       # background compression worker
```

## Scripts

| Command                | Description                  |
| ---------------------- | ---------------------------- |
| `bun run docker:up`    | Build and start all services |
| `bun run docker:down`  | Stop all services            |
| `bun run docker:logs`  | Tail service logs            |
| `bun run docker:clean` | Stop and remove volumes      |
| `bun run test:all`     | Run all tests                |
