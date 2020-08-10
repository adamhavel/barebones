FROM node:alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm i

COPY server server/

CMD ["npm", "start"]
