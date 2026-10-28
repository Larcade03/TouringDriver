FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

# Inicializar y sembrar la base de datos si no existe
RUN node seed.js

EXPOSE 4000

ENV NODE_ENV=production
ENV PORT=4000

CMD ["node", "server.js"]
