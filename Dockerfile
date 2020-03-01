# Do the npm install in the full image
FROM node:lts as build

COPY package.json package-lock.json tsconfig.json ./
COPY src/** src/

RUN [ "npm", "ci" ]
RUN [ "npm", "run", "build" ]

# Final stage, use a smaller image
FROM node:lts-alpine

COPY ./package.json ./package-lock.json ./
COPY --from=build dist/** dist/

RUN [ "npm", "ci", "--production" ]

LABEL "copyright"="Copyright (C) 2020 Ryc O'Chet <rycochet@rycochet.com>. Licensed under the MIT license."
LABEL "description"="plex-copy"

ENTRYPOINT  [ "node", "dist/cli.js" ]
CMD [ "/data/*", "--delete-empty", "--watch", "--interval", "60" ]
