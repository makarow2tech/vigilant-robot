FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

ENV PORT=8787
EXPOSE 8787
VOLUME ["/app/data"]
CMD ["node", "server/index.mjs"]