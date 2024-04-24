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
# Apply database migrations
echo "Applying database migrations..."
# python manage.py makemigrations
python manage.py makemigrations
python manage.py migrate
python create_user.py


echo "Starting server..."
daphne -e ssl:8000:privateKey=/etc/ssl/private/selfsigned.key:certKey=/etc/ssl/private/selfsigned.crt trs.asgi:application


# Start server
# runserver is asynchronous, any command after \
# that will be executed once the server is shutdown
# python manage.py runserver 0.0.0.0:8000
