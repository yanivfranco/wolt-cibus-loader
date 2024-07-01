FROM node:18 AS builder

WORKDIR /usr/src/app
COPY package.json ./
# COPY yarn.lock ./
COPY package-lock.json ./

RUN npm ci --only=production
COPY ./dist .
COPY ./google-credentials.json .
COPY ./token.json .


FROM node:18 AS runner
# install chromium dependencies
RUN apt-get update && apt-get install -y \
    # gconf-service \
    # libasound2 \
    # libatk1.0-0 \
    # libc6 \
    # libcairo2 \
    # libcups2 \
    # libdbus-1-3 \
    # libexpat1 \
    # libfontconfig1 \
    # libgcc1 \
    # libgconf-2-4 \
    # libgdk-pixbuf2.0-0 \
    # libglib2.0-0 \
    # libgtk-3-0 \
    # libnspr4 \
    # libpango-1.0-0 \
    # libpangocairo-1.0-0 \
    # libstdc++6 \
    # libx11-6 \
    # libx11-xcb1 \
    # libxcb1 \
    # libxcomposite1 \
    # libxcursor1 \
    # libxdamage1 \
    # libxext6 \
    # libxfixes3 \
    # libxi6 \
    # libxrandr2 \
    # libxrender1 \
    # libxss1 \
    # libxtst6 \
    # ca-certificates \
    # fonts-liberation \
    # libappindicator1 \
    # libnss3 \
    # lsb-release \
    # xdg-utils \
    sudo \
    wget
RUN sudo apt install -y \
    chromium \
    xvfb 

WORKDIR /usr/src

COPY --from=builder /usr/src/app .
ENV NODE_ENV=production
CMD node ./main2.js

#####################################################################

# # copy with all permissions
# RUN addgroup --system --gid 1001 usergroup && \
#     adduser --system  --uid 1001 user --ingroup usergroup && \
#     chown -R user:usergroup /usr/src
# COPY --from=builder --chown=user:usergroup --chmod=777 /usr/src ./
# # Set user home directory
# RUN usermod -d /usr/src user


# USER user
# WORKDIR /usr/src/app
# ENV NODE_ENV=production
# # CMD node node_modules/puppeteer/install.js
# CMD node ./main.js