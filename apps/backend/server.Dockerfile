FROM alpine:3.19.0@sha256:13b7e62e8df80264dbb747995705a986aa530415763a6c58f84a3ca8af9a5bcd
RUN apk --update --no-cache add nodejs npm
WORKDIR /app
COPY package.json .
RUN npm i --production

FROM alpine
RUN apk --update --no-cache add nodejs
WORKDIR /app
COPY --from=0 /app/node_modules /app/node_modules
COPY . .
CMD ["node", "bin/www"]
