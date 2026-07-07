# Stage 1: Build
FROM node:24-alpine AS builder

WORKDIR /app

# Enable Corepack and pnpm
RUN corepack enable && corepack prepare pnpm@11.9.0 --activate

# Copy package config and lockfile
COPY package.json pnpm-lock.yaml .npmrc .node-version ./

# Copy Prisma schema
COPY prisma ./prisma/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build application
RUN pnpm build

# Stage 2: Production Dependencies
FROM node:24-alpine AS dependencies

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@11.9.0 --activate

COPY package.json pnpm-lock.yaml .npmrc .node-version ./
COPY prisma ./prisma/

# Install only production dependencies
RUN pnpm install --prod --frozen-lockfile

# Stage 3: Runtime
FROM node:24-alpine AS runner

WORKDIR /app

# Create non-root system user
RUN addgroup -S nodeapp && adduser -S nodeapp -G nodeapp

ENV NODE_ENV=production

# Copy output files
COPY --from=builder /app/dist ./dist
COPY --from=dependencies /app/node_modules ./node_modules
COPY --from=dependencies /app/package.json ./package.json
COPY --from=dependencies /app/prisma ./prisma

USER nodeapp

EXPOSE 3000

CMD ["node", "dist/main.js"]
