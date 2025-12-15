FROM node:18-alpine

WORKDIR /app

# Copy shared library
COPY shared/ /shared/
WORKDIR /shared
RUN npm install

# Copy Gateway files
WORKDIR /app
COPY gateway/package*.json ./
RUN npm install

COPY gateway/ ./

EXPOSE 4002

CMD ["node", "index.js"]
