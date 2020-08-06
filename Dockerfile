FROM node:alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN apk update && apk add --no-cache gcc g++ python3
RUN npm ci

FROM node:alpine
WORKDIR /app
COPY --from=build /app .
COPY src src/
CMD ["npm", "start"]
