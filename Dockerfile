# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Enable Corepack and specify pnpm version
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

# Copy package config and lockfile
COPY package.json pnpm-lock.yaml .npmrc .node-version ./

# Install dependencies with engine strictness bypassed
RUN pnpm install --frozen-lockfile --engine-strict=false

# Copy source code
COPY . .

# Build application
RUN pnpm build

# Stage 2: Production Dependencies
FROM node:20-alpine AS dependencies

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

COPY package.json pnpm-lock.yaml .npmrc .node-version ./

# Install only production dependencies
RUN pnpm install --prod --frozen-lockfile --engine-strict=false

# Stage 3: Runtime
FROM node:20-alpine AS runner

WORKDIR /app

# Create non-root system user
RUN addgroup -S nodeapp && adduser -S nodeapp -G nodeapp

ENV NODE_ENV=production

# Copy output files
COPY --from=builder /app/dist ./dist
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/package.json ./package.json

USER nodeapp

EXPOSE 3000

# Default command starts the API; can be overridden to starts the Worker in ECS/K8s
CMD ["node", "dist/bootstrap/api.main.js"]
