FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY src/ ./src/

RUN mkdir -p logs

EXPOSE 5002

CMD ["node", "src/server.js"]
