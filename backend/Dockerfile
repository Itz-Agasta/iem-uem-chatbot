# syntax=docker/dockerfile:1

# build tools here are just a fallback in case canvas/sharp can't grab a
# prebuilt binary for the target platform and have to compile from source
FROM node:20-bookworm-slim AS deps
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ pkg-config \
    libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev \
    && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# no env vars needed at build time - all routes are dynamic and db.ts/ask
# route both have non-throwing fallbacks. real values go in at runtime.
RUN npm run build

FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8000
ENV HOSTNAME=0.0.0.0

RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# next's standalone tracing grabs onnxruntime-node's and canvas' .node files
# but misses the .so libs they dlopen at runtime (libonnxruntime.so.1 etc).
# both ship those libs bundled inside their own package dir though (not linked
# against system cairo/pango/etc), so copying the whole package is enough.
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/onnxruntime-node ./node_modules/onnxruntime-node
COPY --from=deps --chown=nextjs:nodejs /app/node_modules/canvas ./node_modules/canvas

USER nextjs
EXPOSE 8000

CMD ["node", "server.js"]
