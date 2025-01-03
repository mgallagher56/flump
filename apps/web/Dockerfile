# base node image
FROM node:22.12.0-bullseye as base

SHELL ["/bin/bash", "-c"]

RUN npm install --global pnpm \
    && SHELL=bash pnpm setup \
    && source /root/.bashrc

# set for base and all layer that inherit from it
ENV NODE_ENV production

# Install all node_modules, including dev dependencies
FROM base as deps

WORKDIR /app

ADD package.json .node-version ./
RUN pnpm install --production=false

# Setup production node_modules
FROM base as production-deps

WORKDIR /app

COPY --from=deps /app/node_modules /app/node_modules
ADD package.json .node-version ./
RUN pnpm prune --prod

# Build the app
FROM base as build

WORKDIR /app

COPY --from=deps /app/node_modules /app/node_modules

ADD . .
RUN pnpm run build

# Finally, build the production image with minimal footprint
FROM base

WORKDIR /app

COPY --from=production-deps /app/node_modules /app/node_modules

COPY --from=build /app/build/server /app/build/server
COPY --from=build /app/build/client /app/build/client

ADD . .

CMD ["pnpm", "start"]
