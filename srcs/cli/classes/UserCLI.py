# Standard modules
import subprocess
import json
import curses
import time
import os
import requests
import jwt


class UserCLI:
    def __init__(self, username, password, host, http="https://", ws="wss://"):
        self.username = username
        self.password = password
        self.host = host
        self.http = http
        self.ws = ws
        self.token = None

    def __str__(self):
        return f"Username: {self.username}\nPassword: {self.password}\nHost: {self.host}\nToken: {self.token}"

    def authenticate(self):
        url = f"{self.http}{self.host}/users/token/"
        data = {"username": self.username, "password": self.password}
        headers = {"Content-Type": "application/json"}
        response = requests.post(url, json=data, headers=headers, verify=False)
        if response.status_code == 200:
            self.token = response.json()["access"]
            decoded_token = jwt.decode(self.token, "S*CR*T", algorithms=['HS256'])
            user_id = decoded_token['user_id']
            if user_id == 1:
                return True
                print("Authentication succesfully!")
            return False
        else:
            print("Failed to get the token for authentication, are you admin?")
            print(f"Log : {response.text}")
            return False

    def send_curl_request(self, endpoint_class, endpoint_uri, http_method):        
        if http_method == 'EXIT':
            return False

        # uri = endpoint_class.set_id(endpoint_uri, endpoint_class.uri_id_question)
        if endpoint_class.handle_http_request(endpoint_uri, http_method, self.token, self.host, self.http) != False:
            print("A JSON file has been created with the response from the API")
        input("Press any to continue ...")
        os.system('clear')
        return True

    def send_wss_request(self, endpoint_class, endpoint_wss):
        endpoint_class.handle_wss_request(endpoint_wss, self.token, self.host, self.ws)
        return True