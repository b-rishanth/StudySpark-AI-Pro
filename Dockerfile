# =============================================================================
# StudySpark AI Pro — Dockerfile
# Single lightweight container: Express backend serves the static frontend
# and proxies AI requests to Gemini. Built for AWS App Runner / any container host.
# =============================================================================

FROM node:18-alpine AS base
WORKDIR /app

# ---- Install backend dependencies (cached layer) ----
COPY backend/package*.json ./backend/
RUN cd backend && npm install --omit=dev

# ---- Copy application source ----
COPY backend ./backend
COPY frontend ./frontend

# ---- Runtime configuration ----
ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

# Run as a non-root user for better container security.
RUN addgroup -S studyspark && adduser -S studyspark -G studyspark
USER studyspark

WORKDIR /app/backend

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/api/health || exit 1

CMD ["node", "server.js"]
