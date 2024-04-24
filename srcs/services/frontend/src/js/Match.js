import { BaseClass } from './BaseClass'
import { router } from './Router'
import { initGameTwoD, drawGameElements } from './GameElement';


export class Match extends BaseClass {
    constructor(id) {
        super();
        /*Url*/
        /*Id of the match*/
        this.id = id;
        /*Socket*/
        this.socket = null;

        /*Getting token*/
        this.token = localStorage.getItem('token');

        /*Game users*/
        this.total_game_user = 0
        this.game_user_1 = {}
        this.game_user_2 = {}

        this.addDocumentClickListener();
        // this.insertCssLink();
        this.initWebSocket();
    }

    initWebSocket() {
        // new WebSocket(`ws://localhost:8000/ws/chat/${targetId}/?token=${this.token}`);
        const wsProtocol = process.env.PROTOCOL === 'https' ? 'wss:' : 'ws:';
        const wsUrl = `${wsProtocol}//${this.host}:${this.backendPort}/ws/pong/match/${this.id}/?token=${this.token}&connection=player`;
    
        this.socket = new WebSocket(wsUrl);

        this.socket.onopen = () => {
            //console.log('WebSocket(match gameeee) connection established.');
        };

        this.socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            const { type_message } = data;
            switch(type_message)
            {
                case 'ws_handshake':
                    const { ws_handshake } = data;
                    this.ws_handshake(ws_handshake, data);
                    break;
                case 'request_ping':
                    this.socket.send(JSON.stringify({'type_message' : 'ping', 'url' : `${window.location.href}`}));
                    break;
                case 'game_state':
                    const { game_state } = data;
                    this.updateGameState(game_state);
                    break;
                case 'user_token':
                    const { user_token } = data;
                    this.socket.send(JSON.stringify({'type_message' : 'user_token', 'user_token' : user_token}));
                    break;
                case 'i_am_the_other':
                    const { i_am_the_other} = data;
                    this.socket.send(JSON.stringify({'type_message' : 'i_am_the_other', 'i_am_the_other' : i_am_the_other}));
                    break;
                case 'leader':
                    const { leader} = data;
                    this.socket.send(JSON.stringify({'type_message' : 'leader', 'leader' : leader}));
                    break;
                case 'timer':
                    const { timer } = data
                    this.updateTimer(timer);
                    break;
                case 'game_element':
                    const { game_element } = data;
                    this.updateGameElement(game_element);
                    break;
            }
        };

        this.socket.onerror = function(error) {
            console.error('WebSocket error:', error);
        };
    
        this.socket.onclose = function() {
            //console.log('WebSocket (match game) connection closed.');
        };
    }

    /*Methods for match handshake*/
    async ws_handshake(ws_handshake_message, data)
    {
        switch(ws_handshake_message)
        {
            case 'match_do_not_exist':
                this.showMessageAndRedirect('You have tried to join a non-existent match, try with a valid ID');
                break;
            case 'match_already_completed':
                this.showMessageAndRedirect('You have tried to join a match already completed.');
                break;
            case 'tell_me_who_you_are':
                const jwtToken = localStorage.getItem('token');
                this.socket.send(JSON.stringify({'type_message' : 'ws_handshake', 'ws_handshake' : 'authorization' , 'authorization' : `${jwtToken}`}));
                break;
            case 'failed_authorization':
                this.showMessageAndRedirect(`You don't have authorization to play this match.`);
                break;
            case 'initial_data':
                if (window.location.href === `${this.httpProtocol}://${this.host}:${this.frontendPort}/match/${this.id}`)
                {
                    const { user_1_info, user_2_info } = data
                    this.initGame(user_1_info, user_2_info);
                }
                break;
            case 'request_confirmation':
                //console.log("Sending confirmation!");
                this.socket.send(JSON.stringify({'type_message' : 'ws_handshake', 'ws_handshake' : 'confirmation'}));
                break;
        }
    }

    /*Methods to update the game state*/
    updateGameState(game_state_data)
    {
        const game_state = JSON.parse(game_state_data);
        switch (game_state.event)
        {
            case 'init_pong_game':
                initGameTwoD(game_state);
                this.initKeyEvents();
                break;
            case 'show_timer':
                this.showTimerBeforeMatch();
                break;
            case 'someone_left':
                this.socket.send(JSON.stringify({'type_message' : 'match_aborted'}));
                break;
            case 'broadcasted_game_event':
                const { broadcasted_game_event, user_id } = game_state;
                this.socket.send(JSON.stringify({'type_message' : 'broadcasted_game_event', 'broadcasted_game_event' : `${broadcasted_game_event}`, 'user_id' : `${user_id}`}));
                break;
            case 'game_elements':
                drawGameElements(game_state);
                break;
            case 'match_completed':
                // this.socket.send(JSON.stringify({'type_message' : 'match_completed'}));
                this.displayWinner(game_state.winner, game_state.loser);
                // this.showMessageAndRedirect(`Match finished<br>Winner: ${game_state.winner}<br>Loser: ${game_state.loser}`);
                break;
            case 'disconnection':
                this.showMessageAndRedirect(`We are so sorry! Your opponent left the game...<br>Match finished<br>Winner: ${game_state.winner}<br>Loser: ${game_state.loser}`);
                break;
            default:
                //console.log(`Sorry, we are out of ${game_state}.`);
        }
    }

    /*Update the game elements */
    updateGameElement(game_element_data)
    {
        const game_element = JSON.parse(game_element_data);
        switch (game_element.elem) {
            case 'ball':
                drawBall(game_element);
                break;
            case 'user':
                drawUser(game_element);
                break;
            default:
                break;
        }
    }

    /*Method to get the HTML of the dashboard*/
    getHtmlForMain() {
        return ``;
    }

    showMessageAndRedirect(redirect_reason) {
        document.getElementById('app').innerHTML = `<p>${redirect_reason}<br>You will be redirected to the dashboard page in <br><time><strong id="seconds">5</strong><br> seconds</time>.</p>`
        let seconds = document.getElementById('seconds'),
        total = seconds.innerHTML;
        let timeinterval = setInterval(() => {
            this.socket.close();
            if (document.getElementById('seconds')){
                total = --total;
                seconds.textContent = total;
                if (total <= 0) {
                    clearInterval(timeinterval);
                    history.pushState('', '', `/dashboard`);
                    router();
                }
            }
        }, 1000);
    }

    displayWinner(winner, loser) {
        document.getElementById('app').innerHTML = `
        <div class="wrapper"><h1>game completed</h1><br>
        ${winner} won against ${loser}</div>
            
            <p><br>Redirection to the dashboard in<p><time><strong id="seconds">5</strong><br> seconds</time>.</p>
        `
        let seconds = document.getElementById('seconds'),
        total = seconds.innerHTML;
        let timeinterval = setInterval(() => {
            this.socket.close();
            if (document.getElementById('seconds'))
            {
                total = --total;
                seconds.textContent = total;
                if (total <= 0) {
                    clearInterval(timeinterval);
                    history.pushState('', '', `/dashboard`);
                    router();
                }
            }
        }, 1000);
    }

    
    updateTimer(timer_data) {
        const timer = JSON.parse(timer_data);
        const { time_remaininig, type } = timer;

        const timerDiv = document.getElementById('timer');
        if (type == 'normal')
        {
            timerDiv.classList.remove('color-changing');
        }
        else
        {
            timerDiv.classList.add('color-changing');
        }

        const seconds = parseInt(time_remaininig, 10);
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;

        const formattedMinutes = String(minutes).padStart(2, '0');
        const formattedSeconds = String(remainingSeconds).padStart(2, '0');
        timerDiv.innerText = `${formattedMinutes}:${formattedSeconds}`;
    }
    
    initGame(user_1_info, user_2_info)
    {
        // //console.log(`initGame call()`);
        this.initBoard(user_1_info, user_2_info);
        // this.showTimerBeforeMatch();
    }

    initBoard(user_1_info, user_2_info)
    {
        const app = document.getElementById('app');

        const appContainer = document.createElement('div');

        /*Adding 'app-container' class to app div*/
        appContainer.classList.add('app-container');
        /*Creating game header container for show user names and timer*/
        const game_header = document.createElement('header');
        game_header.classList.add('game-header');
        
        /*Creating user names div*/
        const user1Div = document.createElement('div');
        user1Div.classList.add('user-info');
        user1Div.innerHTML = `
        <span>${user_1_info.username} <span class="controls-info">W</span><span class="controls-info">S</span></span>`;

        const user2Div = document.createElement('div');
        user2Div.classList.add('user-info');
        user2Div.innerHTML = `<span><span class="controls-info">W</span><span class="controls-info">S</span></span> ${user_2_info.username} `;

        /*Creating timer*/
        const timerElement = document.createElement('div');
        timerElement.id = 'timer';
        timerElement.classList.add('timer');
        timerElement.textContent = '00:00';

        const score_1 = document.createElement('div');
        score_1.setAttribute('id', 'score-1');
        score_1.className = `score`;
        score_1.innerHTML = `0`;

        const score_2 = document.createElement('div');
        score_2.setAttribute('id', 'score-2');
        score_2.className = `score`;
        score_2.innerHTML = `0`;


        // Adding childs of game header
        game_header.appendChild(user1Div);
        game_header.appendChild(score_1);
        game_header.appendChild(timerElement);
        game_header.appendChild(score_2);
        game_header.appendChild(user2Div);
        /*Addind header to appContainer */
        appContainer.appendChild(game_header);

        /*Creating board game, parent of ball and paddles*/
        const board_game = document.createElement('div');
        board_game.setAttribute('id', 'board-game');

        /*Waiting for the other user*/

        const waiting_message = document.createElement('div');
        waiting_message.setAttribute('id', 'waiting-message');

        waiting_message.innerHTML = `<p>Waiting for the other user!</p>`;

        board_game.appendChild(waiting_message);

        /*Adding board game to app div */
        appContainer.appendChild(board_game);
        
        /*Adding all the app container*/
        // app.appendChild(appContainer);
        app.innerHTML = appContainer.innerHTML;
    }

    showTimerBeforeMatch(){
        const board_game = document.getElementById('board-game');
        let seconds_div = document.createElement('div');
        seconds_div.setAttribute('id', 'seconds');
        board_game.appendChild(seconds_div);
        let seconds = 6;
        let total = seconds
        let timeinterval = setInterval(() => {
            total = --total;
            seconds_div.textContent = total;
            if (total <= 0) {
                clearInterval(timeinterval);      
            }
        }, 1000);
    }

    initKeyEvents = () => {
        const jwtToken = localStorage.getItem('token');
        document.addEventListener('keydown', (e) => {
            switch(e.key){
                case 'w':
                    if (this.socket.readyState === WebSocket.OPEN)
                    {
                        this.socket.send(JSON.stringify({'type_message' : 'game_event', 'game_event' : 'move_up' , 'token' : `${jwtToken}`}));
                    }
                    break;
                case 's':
                    if (this.socket.readyState === WebSocket.OPEN)
                    {
                        this.socket.send(JSON.stringify({'type_message' : 'game_event', 'game_event' : 'move_down' , 'token' : `${jwtToken}`}));
                    }
                    break;       
            }
        });
    }
}


