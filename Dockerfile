# ==============================================================================
# Multi-Stage Dockerfile for EdgePilot Delta Option Buying Bot
# Stage 1: Build the Vite + React Graphite Violet Frontend
# Stage 2: Minimal Python ASGI Backend Serving API & Static Assets on 0.0.0.0:8000
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Build Frontend
# ------------------------------------------------------------------------------
FROM node:20-alpine AS frontend-builder
WORKDIR /app/dashboard

COPY dashboard/package*.json ./
RUN npm install

COPY dashboard/ ./
RUN npm run build

# ------------------------------------------------------------------------------
# Stage 2: Runtime Environment
# ------------------------------------------------------------------------------
FROM python:3.11-slim AS runner

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    HOST=0.0.0.0 \
    PORT=8000 \
    ENVIRONMENT=TESTNET

# Install curl for healthchecks
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Create volume directory for persistent data
RUN mkdir -p /app/data

# Copy backend application and MCP server
COPY backend/ ./backend/
COPY mcp/ ./mcp/
COPY .env.example .env.example

# Copy compiled frontend from Stage 1 directly into dashboard/dist
COPY --from=frontend-builder /app/dashboard/dist ./dashboard/dist

# Expose HTTP port for API and Dashboard
EXPOSE 8000

# Health check probe
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://127.0.0.1:8000/api/health/live || exit 1

# Start bot service binding 0.0.0.0:8000
CMD ["python", "-m", "backend.main"]
