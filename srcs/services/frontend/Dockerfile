FROM node:21

RUN apt-get update && \
    apt-get install -y openssl

WORKDIR /app

COPY ./dependencies/* .

RUN npm install --save

COPY ./src ./src

EXPOSE ${FRONTEND_PORT}
# EXPOSE 5173

# Running entry point starting server
CMD ["npm", "run", "dev"]
