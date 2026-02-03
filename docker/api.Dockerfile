FROM node:20-bullseye-slim

WORKDIR /app
ENV NODE_ENV=production

COPY api/package*.json ./
RUN npm ci

COPY api ./
RUN npm run build

RUN mkdir -p /app/data
COPY api/src/data/rural_venues.sql /app/data/rural_venues.sql

EXPOSE 4000
CMD ["node", "dist/index.js"]
