FROM node:18-alpine

WORKDIR /app

# Copy shared library
COPY shared/ /shared/
WORKDIR /shared
RUN npm install

# Copy App Service files
WORKDIR /app
COPY app-service/package*.json ./
RUN npm install

COPY app-service/ ./

EXPOSE 4003

CMD ["node", "index.js"]
