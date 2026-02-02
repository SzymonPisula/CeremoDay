FROM node:20-bullseye-slim

WORKDIR /app

ENV NODE_ENV=production

COPY api/package*.json ./
RUN npm ci

COPY api ./
RUN npm run build

EXPOSE 4000
CMD ["node", "dist/index.js"]
