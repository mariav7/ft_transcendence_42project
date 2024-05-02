<div align="center">

![Demo:](misc/demo.gif)

---
Coded with ~~blood and tears~~ love by: [mflores-](https://github.com/mariav7), [dnieto-c](https://github.com/DanielAlejandro2605) and [lo-jo](https://github.com/lo-jo)

</div>

## Project

The purpose of ft_transcendence is to familiarize us with web developement by creating a version of the original [Pong](https://en.wikipedia.org/wiki/Pong) (1972) and to render a fullstack website using pure vanilla [JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript) for the Frontend, [Python](https://www.python.org/) for the Backend and [Docker](https://www.docker.com/) for containerizing the application, which aids in deploying and running the application consistently across different environments.

---

## Supported feautures

**Mandatory part**:
* Frontend developed using pure vanilla JavaScript
* Website must be a [single-page-application](https://en.wikipedia.org/wiki/Single-page_application)
* Website must be compatible with the latest stable version of Google Chrome
* Everything must be launched with a single command line to run docker containers example: `docker-compose up --build`
* Pong game:
  * Keys to move paddle in Pong game:
    * `W` move up
    * `S` move down
  * Keys for LOCAL match (2nd player):
    * `↑` move up
    * `↓` move down
  * Tournament (4 players in total facing each other)

**7 Modules chosen:**
* **Major module:** Use a Framework as backend [Django](https://docs.djangoproject.com/en/5.0/)
* **Minor module:** Use a toolkit for the Frontend [Bootrstrap](https://getbootstrap.com/docs/5.3/getting-started/introduction/)
* **Minor module:** Use a database for the backend and more [PostgreSQL](https://www.postgresql.org/docs/)
* **Major module:** Standard user management, authentication, users across tournaments
  * User can subscribe to the website in a secure way
  * Restered user can log in in a secure way
  * User can update their information
  * Users can upload an avatar, with a default option if none is provided
  * User can add others as friends and view their online status
  * User profiles display stats, such as wins and losses
  * Each user has a match history
* **Major module:** Remote players (have players connected to the website in different computers)
* **Major moduel:** Live Chat
  * User should be able to send direct messages to other users
  * User should be able to block other users
  * User should be able to invite other users to play a Pong game
  * User should be able to access other players profiles
* **Major module:** Implement Two-Factor-Authentication (2FA) and JWT
  * Implement [2FA](https://en.wikipedia.org/wiki/Multi-factor_authentication) as an additional layer of security
  * Utilize [JSON Web Tokens](https://en.wikipedia.org/wiki/JSON_Web_Token) as a secure metho for authentication and authorization ensuring that user sessions and access to resources are managed
securely
  * Provide a user-friendly setup process for enabling 2FA (QR code using Google Authenticator)
  * Ensure that JWT tokens are issued and validated securely
* **Major module:** Replacing Basic Pong with Server-Side Pong and Implementing an API
  * Develop server-side logic for the Pong game to handle gameplay, ball movement, scoring and player interactions
  * Create an API that exposes the necessary resources and endpoints to interact with the Pong game allowing partial usage of the game via the Command-Line Interface (CLI) and web interface

---

## Installation

**Clone repository and run docker:**
```bash
git clone git@github.com:mariav7/ft_transcendence_42project.git
cd ft_transcendence_42project 
```

> [!WARNING]  
> You must create an .env file at the root of the project

**Example of an .env file:**
```
DEBUG=True
SECRET_KEY=S*CR*T
POSTGRES_USER=root
POSTGRES_PASSWORD=12345
POSTGRES_DB=trs
POSTGRES_HOST=db
POSTGRES_PORT=5432
PROTOCOL=https
HOST_IN_USE=localhost
FRONTEND_PORT=5173
BACKEND_PORT=8000
ADMIN=god
PASSADMIN=12345
EMAILADMIN=god@yopmail.com
```

**Run docker and create containers:**
```bash
make up
```

**Open Google Chrome and visit [https://localhost:5173/](https://localhost:5173/), enjoy!:**
```bash
google-chrome https://localhost:5173/
```

---