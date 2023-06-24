FROM node:18.16.1-alpine3.18 as base
WORKDIR /app

FROM base as system_dependencies
RUN apk add --no-cache python3 make g++ git

FROM system_dependencies AS prod_dependencies
COPY package.json yarn.lock ./
RUN yarn --production=true

FROM prod_dependencies as dev_dependencies
RUN yarn --production=false

FROM dev_dependencies AS builder
COPY . .
RUN yarn prettier --loglevel silent && \
    yarn lint --quiet && \
    yarn test --silent && \
    yarn build

FROM base
ENV DOCKER=true \
    NODE_ENV=production
COPY package.json .
COPY --from=prod_dependencies /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY ./assets ./assets

ENTRYPOINT ["node", "/app/dist/index.js"]
