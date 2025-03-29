FROM node:22 AS base
WORKDIR /app
ENV PNPM_HOME="/root/.local/share/pnpm"
ENV PATH="${PATH}:${PNPM_HOME}"
RUN npm install -g pnpm@latest-10

FROM base AS installer
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm prettier && \
    pnpm lint && \
    pnpm test && \
    pnpm build

FROM node:22-slim AS runner
WORKDIR /app
COPY --from=installer /app/dist ./dist
COPY --from=installer /app/node_modules .node_modules
COPY ./assets ./assets
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "/app/dist/index.js"]
