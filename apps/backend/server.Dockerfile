FROM alpine
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
