FROM node:20-bullseye-slim

WORKDIR /app

COPY api/package*.json ./
RUN npm ci

COPY api ./
RUN npm run build

ENV NODE_ENV=production

RUN mkdir -p /app/data
COPY api/src/data/rural_venues.sql /app/data/rural_venues.sql

EXPOSE 4000
CMD ["node", "dist/index.js"]
