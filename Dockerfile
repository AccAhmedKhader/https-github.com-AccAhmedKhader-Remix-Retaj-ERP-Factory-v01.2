# Multi-stage build for production-ready Enterprise SaaS ERP

# Stage 1: Build Stage
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Build Vite frontend assets and bundle backend server
RUN npm run build

# Stage 2: Production Runner
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY package*.json ./
RUN npm ci --only=production

# Copy built bundles from the builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.ts ./
# If TS execution is needed or standard JS
# We use the compiled dist/server.cjs from build stage

EXPOSE 3000

CMD ["node", "dist/server.cjs"]
