FROM node:14-alpine

WORKDIR /app

COPY package.json package-lock.json ./
COPY src ./src

RUN npm ci

CMD ["npm", "start"]
