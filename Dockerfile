# syntax=docker/dockerfile:1.7
ARG NODE_VERSION=26
ARG PNPM_VERSION=12.21.0

FROM node:${NODE_VERSION} AS base
ARG PNPM_VERSION
WORKDIR /app
ENV PNPM_HOME="/pnpm"
ENV PATH="${PNPM_HOME}:${PATH}"
# Node 25+ no longer ships corepack, so install pnpm directly
RUN npm install -g pnpm@${PNPM_VERSION} && pnpm --version

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --store-dir=/pnpm/store

FROM deps AS build
COPY . .
RUN pnpm prettier && \
    pnpm lint && \
    pnpm test && \
    pnpm build

FROM base AS prod-deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm install --frozen-lockfile --prod --store-dir=/pnpm/store

FROM node:${NODE_VERSION}-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/assets ./assets
EXPOSE 3000
CMD ["node", "dist/index.js"]
