import websocket
import subprocess
import requests
import json
import curses
import time # to delete

from modules.prompt import prompt
from .WebSocketClient import WebSocketClient

class BaseEndpoint:
    def __init__(self, endpoint):
        # Main endpoint
        self.last_command = None
        self.endpoint = endpoint
        self.ws_client = None

    def __str__(self):
        return self.endpoint

    # Main methods
    def handle_http_request(self, endpoint_uri, http_method, token_user, host, http):
        if endpoint_uri in self.switch_request_http:
            endpoint_methods = self.switch_request_http[endpoint_uri]
            if http_method in endpoint_methods:
                func = endpoint_methods[http_method]
            else:
                print(f"HTTP method {http_method} not supported for endpoint {endpoint_uri}")
                return False
        else:
            print(f"Endpoint {endpoint_uri} not found in switch_request")
            return False

        command = func(endpoint_uri, http_method, token_user, host, http)
        last_command = command

        try:
            output = subprocess.check_output(command, stderr=subprocess.DEVNULL)
            json_response = output.decode()
            self.create_temp_file(json_response)
            return True
        except subprocess.CalledProcessError as e:
            print(f"Error to execute request: {e}")
            return False

    def handle_wss_request(self, endpoint_wss, token_user, host, ws):
        if endpoint_wss in self.switch_request_wss:
            func = self.switch_request_wss[endpoint_wss]
            endpoint_wss_connection, match_id = func(endpoint_wss)
            ws_url = f"{ws}{host}/{endpoint_wss_connection}/?token={token_user}&connection=cli_client" 
            self.ws_client = WebSocketClient(ws_url, token_user, match_id, host)
            self.ws_client.run_client()
        else:
            print("Error searching the correct function!")

    # HTTP Methods
    def request_get_collection(self, endpoint_uri, http_method, token_user, host, http):
        url = f'{http}{host}{endpoint_uri}'
        command = ['curl', '-k', '-X', http_method, '-H', f'Authorization: Bearer {token_user}', f'{url}']
        return command

    def request_get_single_element(self, endpoint_uri, http_method, token_user, host, http):
        endpoint_uri_with_id = self.set_id(endpoint_uri, self.uri_id_question)
        url = f'{http}{host}{endpoint_uri}'
        command = ['curl', '-k' , '-X', http_method, '-H', f'Authorization: Bearer {token_user}', f'{url}']
        return command

    # File method
    def create_temp_file(self, json_response):
        with open('json_response.json', 'w') as file:
            file.write(json_response)
    
    # Input methods
    def request_id(self, message):
        while True:
            id = input(message).strip()
            if id == '':
                return None
            elif id.isdigit():
                return id
            else:
                print("Please enter a valid positive integer for ID.")


    def set_id(self, endpoint_uri, question):
        if '<id>' in endpoint_uri:
            id = self.request_id(question)
            endpoint_uri = endpoint_uri.replace('<id>', id)
        return endpoint_uri


class UsersEndpoint(BaseEndpoint):
    def __init__(self):
        super().__init__('/users/')

        self.switch_request = ['HTTPS']

        self.switch_request_http = {
            '/users/': {
                'GET' : self.request_get_collection,
            },
            '/users/<id>/' : {
                'GET' : self.request_get_single_element
            },
            '/users/<id>/profile' : {
                'GET' : self.request_get_single_element
            }
        }

        self.uri_id_question = "Enter the user ID: "

    # HTTP functions
    def request_post(self):
        pass

class PongEndpoint(BaseEndpoint):
    def __init__(self):
        super().__init__('/pong/')

        self.switch_request = ['HTTPS', 'WSS']

        self.switch_request_wss = {
            'ws/pong/match/<id>' : self.request_join_match
        }  

        self.switch_request_http = {
            '/pong/matches/': {
                'GET' : self.request_get_collection,
                'POST' : self.request_post_collection,
            },
            '/pong/matches/<id>/' : {
                'GET' : self.request_get_single_element
            },
            '/pong/delete-all-items/' : {
                'POST' : self.delete_all_items
            }
        }
        self.uri_id_question = "Enter the match ID: "
    
    def request_post_collection(self, endpoint_uri, http_method, token_user, host, http):
        match_data = self.get_data_for_post()
        match_data_json = json.dumps(match_data)
        command = [
            'curl', '-k', '-X', 'POST',
            '-H', f'Authorization: Bearer {token_user}',
            '-H', 'Content-Type: application/json',
            '-d', match_data_json,
            f'{http}{host}{endpoint_uri}'
        ]
        return command
    
    def get_data_for_post(self):
        print("This CLI only supports match initializations as pending, match users and tournament id are optional.")
        
        match_data = {
            'status': 'pending',
        }

        user_1_id = self.request_id("Enter the ID for user_1: (leave blank if none): ")
        if user_1_id:
            match_data['user_1'] = user_1_id

        user_2_id = self.request_id("Enter the ID for user_2: (leave blank if none): ")
        if user_2_id:
            match_data['user_2'] = user_2_id

        tournament_id = self.request_id("Enter the ID of tournament: (leave blank if none): ")
        if tournament_id:
            match_data['tournament'] = tournament_id

        return match_data

    def post_join_match(self, endpoint_uri, http_method, token_user, host):
        command = [
            'curl', '-k' ,'-X', 'POST',
            '-H', f'Authorization: Bearer {token_user}',
            f'{host}{endpoint_uri}'
        ]
        return command

    def delete_all_items(self, endpoint_uri, http_method, token_user, host, http):
        command = [
            'curl', '-k' ,'-X', 'POST',
            '-H', f'Authorization: Bearer {token_user}',
            f'{http}{host}{endpoint_uri}'
        ]
        return command

    def request_join_match(self, endpoint_wss):
        final_endpoint_wss = self.set_id(endpoint_wss, self.uri_id_question)
        match_id = final_endpoint_wss.split("/")[-1]
        return final_endpoint_wss, match_id

    def request_join_lobby(self, endpoint_wss):
        print("Request join lobby for match!")

