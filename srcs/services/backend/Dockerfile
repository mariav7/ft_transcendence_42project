FROM python:3.10

RUN apt-get update && \
    apt-get install -y postgresql-client openssl

WORKDIR /code

RUN openssl genrsa -out /etc/ssl/private/selfsigned.key 2048

RUN openssl req -x509 -nodes -days 365 -newkey rsa:2048 -key /etc/ssl/private/selfsigned.key -out /etc/ssl/private/selfsigned.crt -subj "/C=FR/ST=Ile-de-France/L=Paris/O=42/OU=42Paris/CN=ft_transcendence"

ENV PYTHONUNBUFFERED 1

ENV PYTHONDONTWRITEBYTECODE 1

RUN pip install pipenv

RUN mkdir dependencies

COPY ./dependencies/Pipfile ./dependencies/Pipfile

COPY ./dependencies/Pipfile.lock ./dependencies/Pipfile.lock

WORKDIR /code/dependencies

RUN pipenv install --deploy --system

WORKDIR /code

COPY src/ /code/src/

COPY ./script/start_django.sh ./script/start_django.sh

RUN chmod +x ./script/start_django.sh

ENTRYPOINT ["./script/start_django.sh"]