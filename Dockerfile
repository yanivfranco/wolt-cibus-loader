FROM node:18 AS builder

WORKDIR /usr/src/app
COPY package.json ./
COPY yarn.lock ./
RUN yarn --frozen-lockfile

COPY ./dist .
COPY ./google-credentials.json .
COPY ./token.json .


FROM node:18 AS runner

# install chromium dependencies
RUN apt-get update && apt-get install -y \
    sudo \
    wget
RUN sudo apt install -y \
    chromium \
    xvfb 

WORKDIR /usr/src

COPY --from=builder /usr/src/app .
ENV NODE_ENV=production
CMD node ./main.js
