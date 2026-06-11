# syntax=docker/dockerfile:1
FROM node:22-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# PORT and HOST are provided by the environment (docker-compose).
CMD ["node", "dist/server.js"]
