#!/bin/bash

check_postgres_ready() {
    while ! pg_isready --dbname=trs --host=db --port=5432 --username=root; do
        echo "Waiting for PostgreSQL..."
        sleep 1
    done
    echo "PostgreSQL database is ready."
}

check_postgres_ready

cd src/trs
echo "Applying database migrations..."
python manage.py makemigrations
python manage.py migrate
python create_user.py


echo "Starting server..."
daphne -e ssl:8000:privateKey=/etc/ssl/private/selfsigned.key:certKey=/etc/ssl/private/selfsigned.crt trs.asgi:application
