FROM node:lts-alpine3.18 as base
WORKDIR /app

FROM base as system_dependencies
RUN apk add --no-cache python3 make g++ git

FROM system_dependencies AS yarn
COPY package.json yarn.lock .yarnrc.yml ./
RUN corepack enable && \
    corepack prepare yarn@stable --activate && \
    yarn plugin import workspace-tools

FROM yarn AS development_dependencies
RUN yarn workspaces focus --all

FROM development_dependencies AS production_dependencies
RUN yarn workspaces focus --production

FROM development_dependencies AS builder
COPY . .
RUN yarn prettier && \
    yarn lint && \
    yarn test && \
    yarn build

FROM base
ENV NODE_ENV=production
COPY --from=production_dependencies /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY ./assets ./assets

ENTRYPOINT ["node", "/app/dist/index.js"]
