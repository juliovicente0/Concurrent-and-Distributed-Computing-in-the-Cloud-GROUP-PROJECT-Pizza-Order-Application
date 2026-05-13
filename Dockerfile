# syntax=docker/dockerfile:1.7

# =========================================================
# Stage 1 — deps: install ONLY production dependencies
# =========================================================
FROM node:22-alpine AS deps

WORKDIR /app

# Copy manifests first so this layer is cached when source changes
COPY package.json package-lock.json* ./

# Use npm ci for reproducible installs based on package-lock.json.
# --omit=dev skips devDependencies (nodemon, etc.) — we don't need them in prod.
RUN npm ci --omit=dev && npm cache clean --force


# =========================================================
# Stage 2 — runtime: minimal image with only what runs
# =========================================================
FROM node:22-alpine AS runtime

# Tini gives us PID 1 with proper signal handling (SIGTERM → graceful shutdown)
RUN apk add --no-cache tini wget

ENV NODE_ENV=production \
    PORT=8080

WORKDIR /app

# Copy production node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy application source
COPY package.json ./
COPY src ./src

# Run as the built-in non-root "node" user (UID/GID 1000 in node:alpine images)
USER node

EXPOSE 8080

# Healthcheck hits the existing /healthCheck endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/healthCheck || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "src/server/app.js"]
