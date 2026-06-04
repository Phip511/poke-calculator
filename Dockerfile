FROM node:24-alpine

WORKDIR /app

COPY package.json ./
COPY server.js ./
COPY index.html ./
COPY styles.css ./
COPY js ./js
COPY db ./db
COPY scripts ./scripts

EXPOSE 3000

CMD ["node", "server.js"]
