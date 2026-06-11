# syntax=docker/dockerfile:1
FROM node:22-slim

WORKDIR /app

# Prisma's schema engine (used by `prisma db push`) needs openssl.
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY . .
# Generate the Prisma client, then compile TypeScript.
RUN npx prisma generate && npm run build:ts

# At startup the database is reachable, so sync the schema then launch.
# PORT is provided by the environment (docker-compose).
CMD ["sh", "-c", "npx prisma db push --skip-generate --accept-data-loss && npx fastify start -l info -p ${PORT} -a 0.0.0.0 dist/app.js"]
