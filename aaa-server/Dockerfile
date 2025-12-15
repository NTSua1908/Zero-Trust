FROM node:18-alpine

WORKDIR /app

# Copy shared library first
COPY shared/ /shared/

# Install shared dependencies
WORKDIR /shared
RUN npm install

# Copy AAA Server files
WORKDIR /app
COPY aaa-server/package*.json ./
RUN npm install

COPY aaa-server/ ./

EXPOSE 4001

CMD ["node", "index.js"]
