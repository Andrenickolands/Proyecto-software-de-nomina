# ---------- 1. Compilar el frontend React ----------
FROM node:22-bookworm-slim AS cliente
WORKDIR /cliente
COPY client/package*.json ./
RUN npm ci --no-audit --no-fund
COPY client/ ./
RUN npm run build

# ---------- 2. Dependencias de producción del servidor ----------
FROM node:22-bookworm-slim AS dependencias
WORKDIR /app
COPY server/package*.json ./
RUN npm ci --omit=dev --no-audit --no-fund

# ---------- 3. Imagen final mínima ----------
FROM node:22-bookworm-slim
ENV NODE_ENV=production \
    PORT=3000 \
    PUBLIC_DIR=/app/public \
    SQLITE_FILE=/app/data/nomina.sqlite
WORKDIR /app
COPY --from=dependencias --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node server/package.json ./
COPY --chown=node:node server/src ./src
COPY --from=cliente --chown=node:node /cliente/dist ./public
RUN mkdir -p /app/data && chown node:node /app/data
# nunca se ejecuta como root
USER node
EXPOSE 3000
VOLUME ["/app/data"]
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "src/main.js"]
