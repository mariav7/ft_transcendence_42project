import curses
import signal
import getpass
import os
import time
import sys
# Own classes and modules
from classes.UserCLI import UserCLI
from classes.Endpoints import UsersEndpoint, PongEndpoint
from modules.prompt import prompt
from modules.signal_handler import signal_handler

signal.signal(signal.SIGINT, signal_handler)

# Endpoints container dict
endpoints = {
    '/users/': UsersEndpoint(),
    '/pong/': PongEndpoint(),
    # '/tournaments/': UsersEndpoint(),
}

# Http methods
http_methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']


def main():
    # Authentification
    host = sys.argv[1]
    port = sys.argv[2]
    host_user_cli = host + ':' + port
    username = input("Username: ")
    password = getpass.getpass("Password: ")
    user_cli = UserCLI(username, password, host_user_cli)
    if user_cli.authenticate() == False:
        return
    #os.system('clear')
    # CLI main loop
    # The main endpoint, the uri and the http method are choosed for send the request
    while True:
        endpoint_choice = curses.wrapper(lambda stdscr: prompt(stdscr, list(endpoints.keys()), "Choose the main endpoint:\n", False))
        if endpoint_choice == 'EXIT':
            break
        endpoint_class = endpoints.get(endpoint_choice)
        # endpoint_uri = curses.wrapper(lambda stdscr: prompt(stdscr, list(endpoint_class.switch_request.keys()), "Choose uri for entrypoint:\n", True))
        protocol = curses.wrapper(lambda stdscr: prompt(stdscr, list(endpoint_class.switch_request), "Choose the communication protocol:\n", True))
        if protocol == 'GO BACK':
            continue
        elif protocol == 'EXIT':
            break
        else:
            if protocol == 'HTTPS':
                endpoint_uri = curses.wrapper(lambda stdscr: prompt(stdscr, list(endpoint_class.switch_request_http.keys()), "Choose the uri endpoint:\n", True))
                
                if endpoint_uri == 'GO BACK':
                    continue
                elif endpoint_uri == 'EXIT':
                    break
                # http_method = curses.wrapper(lambda stdscr: prompt(stdscr, http_methods, "Choosee the allowed HTTP Method for your request and type 'Enter':\n", True))
                http_method = curses.wrapper(lambda stdscr: prompt(stdscr, list(endpoint_class.switch_request_http[endpoint_uri].keys()), "Choosee the allowed HTTP Method for your request and type 'Enter':\n", True))
                if http_method == 'GO BACK':
                    continue
                elif http_method == 'EXIT':
                    break
                if not user_cli.send_curl_request(endpoint_class, endpoint_uri, http_method):
                    break
            elif protocol == 'WSS':
                endpoint_wss = curses.wrapper(lambda stdscr: prompt(stdscr, list(endpoint_class.switch_request_wss), "Choose the uri endpoint:\n", True))
                if endpoint_wss == 'GO BACK':
                    continue
                elif endpoint_wss == 'EXIT':
                    break

                if not user_cli.send_wss_request(endpoint_class, endpoint_wss):
                    break


if __name__ == "__main__":
    main()