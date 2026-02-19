# Local Development

## Prerequisites

- Docker & Docker Compose
- (Optional) Node.js 22 + pnpm 9 for running outside Docker

## Quick start

```bash
# Clone and enter the repo
cd ai-studio

# Copy environment file
cp .env.example .env

# Start everything (Next.js + Redis)
docker compose up --build
```

The app will be available at **http://localhost:3001**.

## Environment variables

| Variable     | Default                  | Description                                       |
|--------------|--------------------------|---------------------------------------------------|
| `APP_PORT`   | `3001`                   | Host port mapped to the container                  |
| `PORT`       | `3000`                   | Internal Next.js port (inside container)           |
| `REDIS_URL`  | `redis://redis:6379`     | Redis connection URL                               |
| `DATA_DIR`   | `/data`                  | Persistent data directory (SQLite, assets, config) |
| `NODE_ENV`   | `development`            | Node environment                                   |
| `LOG_LEVEL`  | `info`                   | Logging level (debug, info, warn, error)           |

## Common commands

```bash
# Start in background
docker compose up -d --build

# View logs (follow)
docker compose logs -f app

# Restart after code changes (usually auto-reloads via Next.js HMR)
docker compose restart app

# Full rebuild (after dependency changes)
docker compose up --build --force-recreate

# Stop everything
docker compose down

# Stop and remove volumes (resets data)
docker compose down -v
```

## Confirm the app is healthy

```bash
curl http://localhost:3001/api/health
# Expected: {"status":"ok","db":"connected","timestamp":"..."}
```

Or check compose service health:

```bash
docker compose ps
# Look for "(healthy)" next to the app service
```

## Overriding the host port

If port 3001 is already in use, set `APP_PORT` in your `.env` or inline:

```bash
APP_PORT=3002 docker compose up --build
```

## Troubleshooting

### Port conflict

```bash
# Find what's using the port
lsof -i :3001

# Kill the process
kill -9 <PID>

# Or just use a different port
APP_PORT=3002 docker compose up --build
```

### Stale node_modules

The `node_modules` volume is anonymous to avoid syncing host modules into the container. If dependencies get out of sync:

```bash
docker compose down -v
docker compose up --build
```

### Turbo cache issues

```bash
# Clear turbo cache inside the container
docker compose exec app rm -rf /tmp/.turbo
docker compose restart app
```

## Running outside Docker

If you prefer running directly on your host:

```bash
# Install dependencies
pnpm install

# Start Redis (required)
docker compose up redis -d

# Set env vars
export REDIS_URL=redis://localhost:6379
export DATA_DIR=./data

# Start dev servers
pnpm dev
```

This runs `turbo dev`, which starts:
- `apps/web` — Next.js dev server on port 3000
- `packages/worker` — BullMQ worker process
