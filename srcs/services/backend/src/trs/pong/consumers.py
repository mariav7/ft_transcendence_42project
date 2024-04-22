import os, json, jwt
from channels.generic.websocket import AsyncWebsocketConsumer
from .models import Match, Tournament
from .serializers import MatchSerializer, TournamentSerializer
from users.models import User
from users.serializers import UserSerializer
from .pong_game import get_game_state
from asgiref.sync import sync_to_async
import asyncio
import random
from urllib.parse import parse_qs
from channels.exceptions import StopConsumer

class LocalPongConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.match_id = self.scope['url_route']['kwargs']['id']
        # Setting group (channels) for sending data to ws
        self.group_name = f'match_{self.match_id}'

        # Database match data
        self.match_info = None

        self.game_user_1 = {}
        self.game_user_2 = {}

        # Match url (Ping system)
        self.match_url = f"{os.getenv('PROTOCOL')}://{os.getenv('HOST_IN_USE')}:{os.getenv('FRONTEND_PORT')}/localmatch/{self.match_id}"
        self.client_url = ''
        self.request_ping_message = True

        self.ball = {
            'elem' : 'ball',
            'size_x' : 0.02,
            'size_y' : 0.04,
            'top' : 0.5,
            'left' : 0.5,
            'speed_x': get_random_speed(),
            'speed_y': get_random_speed()
        }

        self.game_user_1_paddle = {
            'id' : 1,
            'elem' : 'user',
            'score' : 0,
            'size_x' : 0.05,
            'size_y' : 0.25,
            'top' : 0.4,
            'left' : 0,
        }

        self.game_user_2_paddle = {
            'id' : 2,
            'elem' : 'user',
            'score' : 0,
            'size_x' : 0.05,
            'size_y' : 0.25,
            'top' : 0.4,
            'left' : 0.95,
        }

        # Seconds of the match
        self.game_time = 0
        self.game_finish = False
        
        await self.accept()
        # Checking if match exists in DB
        match_info = await self.match_in_db()
        if match_info == None:
            await self.send_to_connection({'type_message' : 'ws_handshake', 'ws_handshake' : 'match_do_not_exist'})
            await self.close()
            return
        # Checking if the match is not already completed
        elif match_info["status"] == 'completed':
            await self.send_to_connection({'type_message' : 'ws_handshake', 'ws_handshake' : 'match_already_completed'})
            await self.close()
            return
    
        # Saving match info in consumer
        self.match_info = match_info
        # Requesting ws handshaking to client
        await self.send_to_connection({'type_message' : 'ws_handshake', 'ws_handshake' : 'tell_me_who_you_are'})

        # Adding a the current connection to the group
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )
        
        asyncio.create_task(self.request_ping())


    async def disconnect(self, close_code):
        await self.send_to_group('match_aborted', 'match_aborted')

        await self.channel_layer.group_discard(
            self.group_name,
            self.channel_name
        )
       
        if close_code == 1:
            self.game_finish = True
            match = await sync_to_async(Match.objects.get)(id=self.match_id)
            # Match aborted
            match.status = 'aborted'
            await sync_to_async(match.save)()

        

    async def websocket_disconnect(self, close_code):
        raise StopConsumer()


    # Receivers
    async def receive(self, text_data):
        data = json.loads(text_data)
        type_message = data.get('type_message')

        match type_message:
            case 'ws_handshake':
                ws_handshake_message = data.get('ws_handshake')
                await self.receive_ws_handshake(ws_handshake_message, data)

            case 'game_event':
                game_event = data.get('game_event')
                user_id = data.get('id')
                user_id = int(user_id) if user_id is not None else None

                if user_id == self.game_user_1['user_id']:
                    if game_event == 'move_up':
                        await self.receive_game_event('move_up_paddle_1')
                    elif game_event == 'move_down':
                        await self.receive_game_event('move_down_paddle_1')
                elif user_id == int(self.game_user_2["user_id"]):
                    if game_event == 'move_up':
                        await self.receive_game_event('move_up_paddle_2')
                    elif game_event == 'move_down':
                        await self.receive_game_event('move_down_paddle_2')
            case 'ping':
                self.client_url = data.get('url')
            case 'match_completed':
                # Stop of ping
                self.request_ping_message = False


    # This function handle the messages received from the client in the `ws_handshake`    
    async def receive_ws_handshake(self, ws_handshake_message, data):
        if ws_handshake_message == 'authorization':
            user_id = get_user_id_by_jwt_token(data, ws_handshake_message)
            # Checking if the user_id match with any user in db
            if user_id == self.match_info["user_1"]:
                await self.send_to_connection({'type_message' : 'ws_handshake', 'ws_handshake' : 'authorized'})
                self.game_user_1['user_id'] = user_id
                self.game_user_1['paddle'] = self.game_user_1_paddle
                self.game_user_2['user_id'] = self.match_info["user_2"]
                self.game_user_2['paddle'] = self.game_user_2_paddle
                await self.send_initial_data()
            else:
                await self.send_to_connection({'type_message' : 'ws_handshake', 'ws_handshake' : 'failed_authorization'})

        elif ws_handshake_message == 'confirmation':
            match = await sync_to_async(Match.objects.get)(id=self.match_id)
            if match.status == 'pending':
                match.status = 'playing'
                await sync_to_async(match.save)()
                asyncio.create_task(self.game_loop())

    async def receive_game_event(self, game_event_message):
        match game_event_message:
            case 'move_up_paddle_1':
                self.game_user_1["paddle"]["top"] -= 0.1
                if self.game_user_1["paddle"]["top"] <= 0:
                    self.game_user_1["paddle"]["top"] = 0
                self.game_user_1["paddle"]["top"] = round(self.game_user_1["paddle"]["top"], 4)
            case 'move_up_paddle_2':
                self.game_user_2["paddle"]["top"] -= 0.1
                if self.game_user_2["paddle"]["top"] <= 0:
                    self.game_user_2["paddle"]["top"] = 0
                self.game_user_2["paddle"]["top"] = round(self.game_user_2["paddle"]["top"], 4)
            case 'move_down_paddle_1':
                self.game_user_1["paddle"]["top"] += 0.1
                if self.game_user_1["paddle"]["top"] >= 0.75:
                    self.game_user_1["paddle"]["top"] = 0.75
                self.game_user_1["paddle"]["top"] = round(self.game_user_1["paddle"]["top"], 4)
            case 'move_down_paddle_2':
                self.game_user_2["paddle"]["top"] += 0.1
                if self.game_user_2["paddle"]["top"] >= 0.75:
                    self.game_user_2["paddle"]["top"] = 0.75
                self.game_user_2["paddle"]["top"] = round(self.game_user_2["paddle"]["top"], 4)


    # Methods for calling to database
    async def match_in_db(self):
        try:
            match = await sync_to_async(Match.objects.get)(id=self.match_id)
            match_json = MatchSerializer(match)
            return match_json.data
        except Match.DoesNotExist:
            return None

    async def user_in_db(self, user_id):
        try:
            user = await sync_to_async(User.objects.get)(id=user_id)
            user_json = UserSerializer(user)
            return user_json.data
        except User.DoesNotExist:
            return None

    async def request_ping(self):
        while self.game_finish == False and self.request_ping_message == True:
            if self.client_url != '':
                # This connection has chaning of url
                if self.client_url != self.match_url:
                    # Deleting the user of the channels group
                    try:
                        # Deleting the user of the channels group
                        await self.disconnect(1)
                        await self.websocket_disconnect(1)
                        self.game_finish = True
                    except StopConsumer:
                        pass
                    break
            await self.send_to_connection({'type_message' : 'request_ping'})
            await asyncio.sleep(0.01)

    # Senders
    async def send_initial_data(self):
        self.db_user_1 = await self.user_in_db(self.match_info["user_1"])
        self.db_user_2 = await self.user_in_db(self.match_info["user_2"])
        users_data = {
            'type_message' : 'ws_handshake',
            'ws_handshake' : 'initial_data',
            'user_1_info' : self.db_user_1,
            'user_2_info' : self.db_user_2
        }
        await self.send_to_connection(users_data)


    async def send_to_group(self, type_message, message):
        await self.channel_layer.group_send(
                self.group_name,
                {
                    'type': 'send_game_state',
                    'type_message' : f'{type_message}',
                    f'{type_message}': f'{message}',
                    'sender_to' : self.group_name
                }
            )

    async def send_to_connection(self, event):
        await self.send(text_data=json.dumps(event))

    async def send_game_state(self, event):
        await self.send(text_data=json.dumps(event))

    async def game_timer(self):
        timer_type = 'normal'
        while self.game_finish == False:
            await self.send_to_group('timer', json.dumps({'time_remaininig' : f'{self.game_time}', 'type' : f'{timer_type}'}))
            await asyncio.sleep(1)
            self.game_time += 1

    async def game_loop(self):
        init_pong_game_data = {
            'event' : 'init_pong_game',
            'ball_game' : self.ball,
            'user_paddle_1' : self.game_user_1["paddle"],
            'user_paddle_2' : self.game_user_2["paddle"]
        }

        await self.send_to_group('game_state', json.dumps(init_pong_game_data))
        # Start timer
        asyncio.create_task(self.game_timer())

        flag_speed = False

        while (self.game_finish == False) and (self.game_user_1["paddle"]["score"] < 5 and self.game_user_2["paddle"]["score"] < 5):
            # Bouncing the ball in Y Axis
            if self.ball['top'] <= 0 or self.ball['top'] >= 0.96:
                self.ball['speed_y'] *= -1
            

            # Bouncing the ball in X Axis
            if self.ball['left'] <= 0 or (self.ball['left'] + self.ball['size_x']) >= 0.985:
                self.ball['speed_x'] *= -1

            # Checking possible hit with game_user_1
            if self.ball['left'] <= 0.05:
                if check_hit(self.ball['top'], self.ball['size_y'], self.game_user_1["paddle"]['top'], self.game_user_1["paddle"]['size_y']):
                    self.ball['speed_x'] *= -1
            # Checking possible hit with game_user_2
            if (self.ball['left'] + self.ball['size_x']) >= 0.94:
                if check_hit(self.ball['top'], self.ball['size_y'], self.game_user_2["paddle"]['top'], self.game_user_2["paddle"]['size_y']):
                    self.ball['speed_x'] *= -1

            # Checking for points
            if self.ball['left'] <= 0:
                self.game_user_2["paddle"]["score"] += 1
                if self.game_user_2["paddle"]["score"] == 3 and flag_speed == False:
                    flag_speed = True
                    if self.ball['speed_x'] < 0:
                        self.ball['speed_x'] = 0.07
                    elif self.ball['speed_x'] > 0:
                        self.ball['speed_x'] = -0.07
            
                # Put the ball in the center
                self.ball['top'] = 0.5
                self.ball['left'] = 0.5
                

            if (self.ball['left'] + self.ball['size_x']) >= 1:
                self.game_user_1["paddle"]["score"] += 1
                if self.game_user_1["paddle"]["score"] == 3 and flag_speed == False:
                    flag_speed = True
                    if self.ball['speed_x'] < 0:
                        self.ball['speed_x'] = 0.07
                    elif self.ball['speed_x'] > 0:
                        self.ball['speed_x'] = -0.07
                # Putting the ball in the center
                self.ball['top'] = 0.5
                self.ball['left'] = 0.5
        
            # Checking and setting precision limits for ball in top and left coordinates
            self.ball['top'] += self.ball['speed_y']
            if self.ball['top'] <= 0:
                self.ball['top'] = 0
            else:
                self.ball['top'] = round(self.ball['top'], 5)
    
            self.ball['left'] += self.ball['speed_x']
            if self.ball['left'] <= 0:
                self.ball['left'] = 0
            else:
                self.ball['left'] = round(self.ball['left'], 5)
            
            game_elements = {
                'event' : 'game_elements',
                'ball_game' : self.ball,
                'user_paddle_1' : self.game_user_1["paddle"],
                'user_paddle_2' : self.game_user_2["paddle"]
            }

            # Sending elements info
            await self.send_to_group('game_state', json.dumps(game_elements))
            # Sleeping one miliseconds for thread 
            await asyncio.sleep(0.1)
        
        # print("SALIMOS DEL JUEGOOOOO")
        self.game_finish = True
        # Finishing and saving the match
        await self.finish_and_save_match()

    async def finish_and_save_match(self):
        match = await sync_to_async(Match.objects.get)(id=self.match_id)
        # print(match.status)
        # May be completed in case of client deconnection
        if match.status == 'aborted':
            return

        # print("MATCH FINISHHHHH")
        # print("The score:")
        # print(f'User 1 {self.game_user_1["paddle"]["score"]}')
        # print(f'User 2 {self.game_user_2["paddle"]["score"]}')
        # Setting score
        match.score_user_1 = self.game_user_1["paddle"]["score"]
        match.score_user_2 = self.game_user_2["paddle"]["score"]
        # Defining winner and loser
        if match.score_user_1 > match.score_user_2:
            match.winner = match.user_1
            match.loser = match.user_2
        else:
            match.winner = match.user_2
            match.loser = match.user_1
        # Match completed
        match.time_elapsed = self.game_time
        match.status = 'completed'
        await sync_to_async(match.save)()

        # Redirect
        redirect_info = {
            'event' : 'match_completed',
            'winner' : match.winner.username,
            'loser' : match.loser.username
        }

        await self.send_to_group('game_state', json.dumps(redirect_info))


class PongConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # Getting params (token and type of connection)
        query_string = self.scope['query_string'].decode()
        # Parsing params
        token, type_connection = parse_query_params(query_string)
        self.type_connection = type_connection
        decoded_token = jwt.decode(token, os.getenv("SECRET_KEY"), algorithms=['HS256'])
        self.id_from_token = decoded_token['user_id']
        # Getting id from url (ws)
        self.match_id = self.scope['url_route']['kwargs']['id']
        # Setting group (channels) for sending data to ws
        self.group_name = f'match_{self.match_id}'
        # Match url (Ping system)
        self.match_url = f"{os.getenv('PROTOCOL')}://{os.getenv('HOST_IN_USE')}:{os.getenv('FRONTEND_PORT')}/match/{self.match_id}"
        self.client_url = ''
        self.request_ping_message = True
        # Database match data
        self.match_info = None
        # Database user data
        self.db_user_1 = None
        self.db_user_2 = None
        # Flags variables for ws_handshaking
        self.total_game_users = 0
        self.game_user_1 = {}
        self.game_user_2 = {}

        self.who_i_am_id = None
        self.role_id = 0
        self.confirmation = False

        # Total connections
        self.other_know_I_am_here = 0
        # Other is connected
        self.other_is_connected = False

        # Consumers leader
        self.leader = False
        self.not_leader = True

        self.ball = {
            'elem' : 'ball',
            'size_x' : 0.02,
            'size_y' : 0.04,
            'top' : 0.5,
            'left' : 0.5,
            'speed_x': 0.05,
            'speed_y': 0.05
        }

        self.game_user_1_paddle = {
            'id' : 1,
            'elem' : 'user',
            'score' : 0,
            'size_x' : 0.05,
            'size_y' : 0.25,
            'top' : 0.4,
            'left' : 0,
        }

        self.game_user_2_paddle = {
            'id' : 2,
            'elem' : 'user',
            'score' : 0,
            'size_x' : 0.05,
            'size_y' : 0.25,
            'top' : 0.4,
            'left' : 0.95,
        }

        # Seconds of the match
        self.game_time = 0
        self.game_finish = False

        # Accepting the connection
        await self.accept()
        # Checking if match exists in DB
        match_info = await self.match_in_db()
        if match_info == None:
            await self.send_to_connection({'type_message' : 'ws_handshake', 'ws_handshake' : 'match_do_not_exist'})
            await self.close()
            return
        # Checking if the match is not already completed
        elif match_info["status"] == 'completed':
            await self.send_to_connection({'type_message' : 'ws_handshake', 'ws_handshake' : 'match_already_completed'})
            await self.close()
            return

        # Requesting authentification
        await self.send_to_connection({'type_message' : 'ws_handshake', 'ws_handshake' : 'tell_me_who_you_are'})
        #await asyncio.sleep(1)

        # Saving match info in consumer
        self.match_info = match_info

        # Adding a the current connection to the group
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )

        if self.type_connection == 'player':
            # Sending initial data
            await self.send_initial_data()
            # Waiting for another user 
            asyncio.create_task(self.waiting_users())

    # REMOTE MATCH
    async def disconnect(self, close_code):
        # print("DISCONNECT**************************")
        await self.channel_layer.group_discard(
            self.group_name,
            self.channel_name
        )

    async def websocket_disconnect(self, close_code):
        # print("DISCONNECT!!!!!!!!!!!!!!!!!!!!!!!!!!")
        if self.type_connection == 'player': 
            self.game_finish = True
            await self.send_to_group('game_state', json.dumps({'event' : 'someone_left'}))

        raise StopConsumer()


    # Receivers
    async def receive(self, text_data):
        data = json.loads(text_data)
        type_message = data.get('type_message')

        ## print(type_message)
        match type_message:
            # Handling ws_handshake message
            case 'ws_handshake':
                ws_handshake_message = data.get('ws_handshake')
                await self.receive_ws_handshake(ws_handshake_message, data)
            # Catching other connection
            case 'user_token':
                user_token = data.get('user_token')
                if (int(user_token) != self.id_from_token) and self.other_is_connected == False:
                    self.other_is_connected = True
            case 'i_am_the_other':
                user_token = data.get('i_am_the_other')
                if (int(user_token) != self.id_from_token) and self.other_is_connected == True:
                    self.other_know_I_am_here = 1
            # Setting one consumer connection as leader
            case 'leader':
                user_token = data.get('leader')
                if (int(user_token) != self.id_from_token) and self.not_leader == True:
                    self.not_leader = False
            # Receiving game events (paddles movement)
            case 'game_event':
                game_event = data.get('game_event')
                if self.type_connection == 'cli_client':
                    user_id = data.get('user_id')
                elif self.type_connection == 'player':
                    user_id = get_user_id_by_jwt_token(data, 'token')
                
                await self.send_to_group('game_state', json.dumps({'event' : 'broadcasted_game_event', 'broadcasted_game_event' : f'{game_event}', 'user_id' : f'{user_id}'}))
            # Broadcasting an event
            case 'broadcasted_game_event':
                broadcast_game_event = data.get('broadcasted_game_event')
                user_id = data.get('user_id')
                await self.receive_broadcast_event(broadcast_game_event, user_id)
            # Receiving url from client ping
            case 'ping':
                self.client_url = data.get('url')
            case 'match_completed':
                # Stop of ping
                self.request_ping_message = False
            case 'match_aborted':
                await self.abort_match()
                

    async def abort_match(self):
        match = await sync_to_async(Match.objects.get)(id=self.match_id)

        if self.match_info["user_1"] == self.id_from_token:
            match.score_user_1 = 5
            match.score_user_2 = 0
            match.winner = match.user_1
            match.loser = match.user_2
        else:
            match.score_user_1 = 0
            match.score_user_2 = 5
            match.winner = match.user_2
            match.loser = match.user_1
                
        # Match completed
        match.status = 'completed'
        await sync_to_async(match.save)()

        self.game_finish = True
        # self.time_remaining = 0

        # Redirect
        redirect_info = {
            'event' : 'disconnection',
            'winner' : match.winner.username,
            'loser' : match.loser.username
        }

        await self.send_to_group('game_state', json.dumps(redirect_info))
        
        if match.tournament:
            # print("THIS MATCH IS PART OF A TOURNAMENT")
            tournament_id = match.tournament_id
            tournament = await sync_to_async(Tournament.objects.get)(id=tournament_id)

            tournament.matches_played += 1

            if tournament.matches_played == 6:
                tournament.status = 'finished'
                tournament.calculate_winner_and_leaderboard()

            await sync_to_async(tournament.save)()

    # This function handle the messages received from the client in the `ws_handshake`    
    async def receive_ws_handshake(self, ws_handshake_message, data):
        if ws_handshake_message == 'authorization':
            # Getting id for authorization
            user_id = get_user_id_by_jwt_token(data, ws_handshake_message)
            if user_id == 1:
                await self.send_to_connection({'type_message' : 'ws_handshake', 'ws_handshake' : 'authorization_succesfully'})
            # Checking if the user_id match with any user in db
            elif user_id != self.match_info["user_1"] and user_id != self.match_info["user_2"]:
                await self.send_to_connection({'type_message' : 'ws_handshake', 'ws_handshake' : 'failed_authorization'})

    async def receive_broadcast_event(self, broadcast_game_event_message, user_id):
        if self.leader == True:
            match broadcast_game_event_message:
                case 'score':
                    await self.send_to_group('game_state', json.dumps({'event' : 'score', 'user_1' : f'{self.game_user_1["paddle"]["score"]}', 'user_2' : f'{self.game_user_2["paddle"]["score"]}'}))
                case 'move_up':
                    if int(user_id) == self.game_user_1["user_id"]:
                        self.game_user_1["paddle"]["top"] -= 0.1
                        if self.game_user_1["paddle"]["top"] <= 0:
                            self.game_user_1["paddle"]["top"] = 0
                        self.game_user_1["paddle"]["top"] = round(self.game_user_1["paddle"]["top"], 4)
                    
                    elif int(user_id) == self.game_user_2["user_id"]:
                        self.game_user_2["paddle"]["top"] -= 0.1
                        if self.game_user_2["paddle"]["top"] <= 0:
                            self.game_user_2["paddle"]["top"] = 0
                        self.game_user_2["paddle"]["top"] = round(self.game_user_2["paddle"]["top"], 4)
                
                case 'move_down':
                    if int(user_id) == self.game_user_1["user_id"]:
                        self.game_user_1["paddle"]["top"] += 0.1
                        if self.game_user_1["paddle"]["top"] >= 0.75:
                            self.game_user_1["paddle"]["top"] = 0.75
                        self.game_user_1["paddle"]["top"] = round(self.game_user_1["paddle"]["top"], 4)
                        
                    elif int(user_id) == self.game_user_2["user_id"]:
                        self.game_user_2["paddle"]["top"] += 0.1
                        if self.game_user_2["paddle"]["top"] >= 0.75:
                            self.game_user_2["paddle"]["top"] = 0.75
                        self.game_user_2["paddle"]["top"] = round(self.game_user_2["paddle"]["top"], 4)


    # Methods for calling to database
    async def match_in_db(self):
        try:
            match = await sync_to_async(Match.objects.get)(id=self.match_id)
            match_json = MatchSerializer(match)
            return match_json.data
        except Match.DoesNotExist:
            return None

    async def user_in_db(self, user_id):
        try:
            user = await sync_to_async(User.objects.get)(id=user_id)
            user_json = UserSerializer(user)
            return user_json.data
        except User.DoesNotExist:
            return None

    # Waiting for both connections
    async def waiting_users(self):
        while self.other_is_connected == False or self.other_know_I_am_here == 0:
            match = await sync_to_async(Match.objects.get)(id=self.match_id)
            if match.status == 'completed':
                self.request_ping = False
                return

            if self.id_from_token == self.match_info["user_1"]:
                await asyncio.sleep(0.1)
            elif self.id_from_token == self.match_info["user_2"]:
                await asyncio.sleep(0.5)
    
            await self.send_to_group('user_token', self.id_from_token)
            await self.send_to_group('i_am_the_other', self.id_from_token)
            if self.not_leader == False:
                return

        await self.send_to_group('leader', self.id_from_token)
        self.leader = True
        
        if self.leader == True and self.id_from_token == self.match_info["user_1"]:
            # Setting leader as user_1 in match
            self.game_user_1['user_id'] = self.id_from_token
            self.game_user_1['paddle'] = self.game_user_1_paddle
            # Setting other user as user_2 in match
            self.game_user_2['user_id'] = self.match_info["user_2"]
            self.game_user_2['paddle'] = self.game_user_2_paddle
        elif self.leader == True and self.id_from_token == self.match_info["user_2"]:
            # Setting leader as user_2 in match
            self.game_user_2['user_id'] = self.id_from_token
            self.game_user_2['paddle'] = self.game_user_2_paddle
            # Setting other user as user_1 in match
            self.game_user_1['user_id'] = self.match_info["user_1"]
            self.game_user_1['paddle'] = self.game_user_1_paddle

        asyncio.create_task(self.game_loop())

    async def request_ping(self):
        while self.game_finish == False and self.request_ping_message == True:
            if self.client_url != '':
                # This connection has chaning of url
                if self.client_url != self.match_url:
                    self.game_finish = True
                    try:
                        # Deleting the user of the channels group
                        await self.disconnect(1)
                        await self.websocket_disconnect(1)
                    except StopConsumer:
                        pass
                    break
            try:
                await self.send_to_connection({'type_message' : 'request_ping'})
            except Disconnected:
                break
            await asyncio.sleep(0.01)

    # Senders
    async def send_initial_data(self):
        match = await sync_to_async(Match.objects.get)(id=self.match_id)
        if match.status == 'completed':
            return

        self.db_user_1 = await self.user_in_db(self.match_info["user_1"])
        self.db_user_2 = await self.user_in_db(self.match_info["user_2"])
        users_data = {
            'type_message' : 'ws_handshake',
            'ws_handshake' : 'initial_data',
            'user_1_info' : self.db_user_1,
            'user_2_info' : self.db_user_2
        }
        # Sending data for draw initial data in board game
        await self.send_to_connection(users_data)
        # Requesting ping for handling deconnection
        asyncio.create_task(self.request_ping())

    # Senders
    async def send_to_group(self, type_message, message):
        await self.channel_layer.group_send(
                self.group_name,
                {
                    'type': 'send_game_state',
                    'type_message' : f'{type_message}',
                    f'{type_message}': f'{message}',
                    'sender_to' : self.group_name
                }
            )

    async def send_to_connection(self, event):
        await self.send(text_data=json.dumps(event))

    async def send_game_state(self, event):
        await self.send(text_data=json.dumps(event))

    async def game_timer(self):
        timer_type = 'normal'
        while self.game_finish == False:
            await self.send_to_group('timer', json.dumps({'time_remaininig' : f'{self.game_time}', 'type' : f'{timer_type}'}))
            await asyncio.sleep(1)
            self.game_time += 1

    async def game_loop(self):
        if not self.game_user_1 or not self.game_user_2:
            return

        match = await sync_to_async(Match.objects.get)(id=self.match_id)
        match.status = 'playing'
        await sync_to_async(match.save)()
       
        init_pong_game_data = {
            'event' : 'init_pong_game',
            'ball_game' : self.ball,
            'user_paddle_1' : self.game_user_1["paddle"],
            'user_paddle_2' : self.game_user_2["paddle"]
        }

        # Sending ball and paddles
        await self.send_to_group('game_state', json.dumps(init_pong_game_data))
        # Start timer
        asyncio.create_task(self.game_timer())

        # Flag speed
        flag_speed = False

        while self.game_user_1["paddle"]["score"] < 5 and self.game_user_2["paddle"]["score"] < 5:
            # Bouncing the ball in Y Axis
            if self.ball['top'] <= 0 or self.ball['top'] >= 0.96:
                self.ball['speed_y'] *= -1

            # Bouncing the ball in X Axis
            if self.ball['left'] <= 0 or (self.ball['left'] + self.ball['size_x']) >= 0.985:
                self.ball['speed_x'] *= -1

            # Checking possible hit with game_user_1
            if self.ball['left'] <= 0.05:
                if check_hit(self.ball['top'], self.ball['size_y'], self.game_user_1["paddle"]['top'], self.game_user_1["paddle"]['size_y']):
                    self.ball['speed_x'] *= -1

            # Checking possible hit with game_user_2
            if (self.ball['left'] + self.ball['size_x']) >= 0.94:
                if check_hit(self.ball['top'], self.ball['size_y'], self.game_user_2["paddle"]['top'], self.game_user_2["paddle"]['size_y']):
                    self.ball['speed_x'] *= -1

            # Checking for points
            if self.ball['left'] <= 0:
                self.game_user_2["paddle"]["score"] += 1
                if self.game_user_2["paddle"]["score"] == 3 and flag_speed == False:
                    flag_speed = True
                    if self.ball['speed_x'] < 0:
                        self.ball['speed_x'] = 0.07
                    elif self.ball['speed_x'] > 0:
                        self.ball['speed_x'] = -0.07
            
                # Put the ball in the center
                self.ball['top'] = 0.5
                self.ball['left'] = 0.5
                

            if (self.ball['left'] + self.ball['size_x']) >= 1:
                self.game_user_1["paddle"]["score"] += 1
                if self.game_user_1["paddle"]["score"] == 3 and flag_speed == False:
                    flag_speed = True
                    if self.ball['speed_x'] < 0:
                        self.ball['speed_x'] = 0.07
                    elif self.ball['speed_x'] > 0:
                        self.ball['speed_x'] = -0.07
                # Putting the ball in the center
                self.ball['top'] = 0.5
                self.ball['left'] = 0.5
        
            #Checking and setting precision limits for ball in top and left coordinates
            self.ball['top'] += self.ball['speed_y']
            if self.ball['top'] <= 0:
                self.ball['top'] = 0
            else:
                self.ball['top'] = round(self.ball['top'], 5)
    
            self.ball['left'] += self.ball['speed_x']
            if self.ball['left'] <= 0:
                self.ball['left'] = 0
            else:
                self.ball['left'] = round(self.ball['left'], 5)

            game_elements = {
                'event' : 'game_elements',
                'ball_game' : self.ball,
                'user_paddle_1' : self.game_user_1["paddle"],
                'user_paddle_2' : self.game_user_2["paddle"]
            }

            # Sending elements info
            await self.send_to_group('game_state', json.dumps(game_elements))
            # Sleeping one miliseconds for thread
            await asyncio.sleep(0.1)

        self.game_finish = True
        await self.finish_and_save_match()

    async def finish_and_save_match(self):
        match = await sync_to_async(Match.objects.get)(id=self.match_id)
        # May be completed in case of client deconnection
        if match.status == 'completed':
            return
        # Setting score
        match.score_user_1 = self.game_user_1["paddle"]["score"]
        match.score_user_2 = self.game_user_2["paddle"]["score"]
        # Defining winner and loser
        if match.score_user_1 > match.score_user_2:
            match.winner = match.user_1
            match.loser = match.user_2
        elif match.score_user_2 > match.score_user_1:
            match.winner = match.user_2
            match.loser = match.user_1

        # Match completed
        match.status = 'completed'
        match.time_elapsed = self.game_time
        await sync_to_async(match.save)()

        # Redirect
        redirect_info = {
            'event' : 'match_completed',
            'winner' : match.winner.username,
            'loser' : match.loser.username
        }

        await self.send_to_group('game_state', json.dumps(redirect_info))

        if match.tournament:
            # print("THIS MATCH IS PART OF A TOURNAMENT")
            tournament_id = match.tournament_id
            tournament = await sync_to_async(Tournament.objects.get)(id=tournament_id)

            tournament.matches_played += 1

            if tournament.matches_played == 6:
                tournament.status = 'finished'
                tournament.calculate_winner_and_leaderboard()

            await sync_to_async(tournament.save)()

class MatchConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        query_params = parse_qs(self.scope['query_string'].decode())
        # Getting the user id connection
        self.match_id = query_params.get('id_match', [None])[0]
        # All the users (ws) that we are going to play a match will be stored in this group
        self.room_group_name = 'matches_group'

        # Match lobby url (Ping system)
        self.match_url = f"{os.getenv('PROTOCOL')}://{os.getenv('HOST_IN_USE')}:{os.getenv('FRONTEND_PORT')}/match_lobby"
        self.client_url = ''
        self.request_ping_message = True
        
        await self.accept()

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        asyncio.create_task(self.request_ping())

    async def disconnect(self, close_code):
        # # print('////// DECONNECTIONNNNNNN IN MATCH LOBBY //////////////')
        # # print(close_code)
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def websocket_disconnect(self, close_code):
        # # print('////// DECONNECTION WEBSOCKET IN MATCH LOBBY  //////////////')
        # # print(close_code)
        self.request_ping_message = False
        if close_code == 1:
            try:
                match = await sync_to_async(Match.objects.get)(id=self.match_id)
                match.status = 'aborted'
                await sync_to_async(match.save)()
                await self.send_to_group('match_aborted', 'match_aborted')
            except Match.DoesNotExist:
                pass

        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

        raise StopConsumer()


    async def receive(self, text_data):
        data = json.loads(text_data)
        type_message = data.get('type_message')

        match type_message:
            case 'match_id':
                self.match_id = data.get('match_id')
            # Receiving url from client ping
            case 'ping':
                self.client_url = data.get('url')

    async def request_ping(self):
        # await self.send_to_group('action', 'join_play')
        while self.request_ping_message == True:
            if self.client_url != '':
                # This connection has chaning of url
                if self.client_url != self.match_url:
                    # Deleting the user of the channels group
                    try:
                        await self.websocket_disconnect(2)
                    except StopConsumer:
                        pass
                    break
            await self.send_to_group('request_ping', 'ping')
            await asyncio.sleep(0.5)

    async def send_to_group(self, type_message, message):
        await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'send_match_lobby_notification',
                    'type_message' : f'{type_message}',
                    f'{type_message}': f'{message}'
                }
            )

    async def send_match_lobby_notification(self, event):
        await self.send(text_data=json.dumps(event))

class TournamentConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        # print("Connecting to TournamentConsumer")
        self.room_name = 'tournament'
        self.room_group_name = 'tournament_group'

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        # You can handle incoming messages if needed
        pass

    async def send_tournament_notification(self, event):
        # Send tournament-related notifications to the WebSocket
        message = event['message']
        tournament_id = event['tournament_id']

        await self.send(text_data=json.dumps({
            'type': 'tournament_notification',
            'message': message,
            'tournament_id': tournament_id,
        }))


# Utils
def parse_query_params(query_string):
    token = None
    connection = None
    query_params = query_string.split('&')
    for param in query_params:
        key, value = param.split('=')
        if key == 'token':
            token = value
        elif key == 'connection':
            connection = value
    
    return token, connection

def get_user_id_by_jwt_token(data, key_in_message):
    user_jwt_token = data.get(key_in_message)
    decoded_token = jwt.decode(user_jwt_token, os.getenv("SECRET_KEY"), algorithms=['HS256'])
    user_id = decoded_token['user_id']
    return user_id

def get_random_speed():
    random_speed = random.choice([0.03, 0.04, 0.05])
    if random.random() < 0.5:
        random_speed *= -1
    return random_speed

def check_hit(ball_top, ball_size_y, paddle_top, paddle_size_y):
    ball_bottom = ball_top + ball_size_y
    paddle_bottom = paddle_top + paddle_size_y

    if ball_bottom >= paddle_top and ball_top <= paddle_bottom:
        return True
    else:
        return False
