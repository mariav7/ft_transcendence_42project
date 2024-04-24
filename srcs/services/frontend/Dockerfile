FROM node:21

RUN apt-get update && \
    apt-get install -y openssl

WORKDIR /app

COPY ./dependencies/* .

RUN npm install --save

COPY ./src ./src

EXPOSE ${FRONTEND_PORT}

CMD ["npm", "run", "dev"]
