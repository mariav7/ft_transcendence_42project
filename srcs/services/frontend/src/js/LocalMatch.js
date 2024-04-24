import { BaseClass } from './BaseClass'
import { router } from './Router'
import { initGameTwoD, drawGameElements } from './GameElement';


export class LocalMatch extends BaseClass {
    constructor(id) {
        super();
        this.id = id;
        this.socket = null;
        this.url = window.location.href;
        this.token = localStorage.getItem('token');
        this.addDocumentClickListener();
        this.initWebSocket();
        this.user_1_info = null;
        this.user_2_info = null;
    }

    initWebSocket() {
        const wsProtocol = process.env.PROTOCOL === 'https' ? 'wss:' : 'ws:';
        const wsUrl = `${wsProtocol}//${this.host}:${this.backendPort}/ws/pong/localmatch/${this.id}/`;
    
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
                case 'timer':
                    const { timer } = data
                    this.updateTimer(timer);
                    break;
                case 'game_element':
                    const { game_element } = data;
                    this.updateGameElement(game_element);
                    break;
                case 'match_aborted':
                    this.socket.close();
                    break;
            }
        };

        this.socket.onerror = function(error) {
            console.error('WebSocket error:', error);
        };
    
        this.socket.onclose = function() {
            //console.log('WebSocket (local game) connection closed.');
        };
    }

    async ws_handshake(ws_handshake_message, data)
    {
        switch(ws_handshake_message)
        {
            case 'tell_me_who_you_are':
                const jwtToken = localStorage.getItem('token');
                this.socket.send(JSON.stringify({'type_message' : 'ws_handshake', 'ws_handshake' : 'authorization' , 'authorization' : `${jwtToken}`}));
                break;
            case 'failed_authorization':
                this.showMessageAndRedirect(`You don't have authorization to this match.`);
                break;
            case 'initial_data':
                const { user_1_info, user_2_info } = data
                this.user_1_info = user_1_info;
                this.user_2_info = user_2_info;
                this.initGame(user_1_info, user_2_info);
        }
    }

    updateGameState(game_state_data)
    {
        const game_state = JSON.parse(game_state_data);
        switch (game_state.event)
        {
            case 'init_pong_game':
                initGameTwoD(game_state);
                this.initKeyEvents();
                break;
            case 'someone_left':
                //console.log('Someone left');
                break;
            case 'game_elements':
                drawGameElements(game_state);
                break;
            case 'match_completed':
                this.displayWinner(game_state.winner, game_state.loser);
                break;
            default:
                //console.log(`Sorry, we are out of ${game_state}.`);
        }
    }

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

    getHtmlForMain() {
        return ``;
    }

    showMessageAndRedirect(redirect_reason) {
        document.getElementById('app').innerHTML = `<p>${redirect_reason}<br>You will be redirected in to dashboard page <time><strong id="seconds">5</strong> seconds</time>.</p>`
        let seconds = document.getElementById('seconds'),
        total = seconds.innerHTML;
        this.socket.close();
        let timeinterval = setInterval(() => {
            total = --total;
            seconds.textContent = total;
            if (total <= 0) {
                clearInterval(timeinterval);
                history.pushState('', '', `/dashboard`);
                router();
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
        this.initBoard(user_1_info, user_2_info);
        this.showTimerBeforeMatch();
    }

    initBoard(user_1_info, user_2_info)
    {
        const app = document.getElementById('app');

        const appContainer = document.createElement('div');

        appContainer.classList.add('app-container');
        const game_header = document.createElement('header');
        game_header.classList.add('game-header');
        
        const user1Div = document.createElement('div');
        user1Div.classList.add('user-info');
        user1Div.innerHTML = `
            <span>${user_1_info.username} <span class="controls-info">W</span><span class="controls-info">S</span></span>`;

        const user2Div = document.createElement('div');
        user2Div.classList.add('user-info');
        user2Div.innerHTML = `<span><span class="controls-info">↑</span><span class="controls-info">↓</span></span> ${user_2_info.username} `;

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

        game_header.appendChild(user1Div);
        game_header.appendChild(score_1);
        game_header.appendChild(timerElement);
        game_header.appendChild(score_2);
        game_header.appendChild(user2Div);
        appContainer.appendChild(game_header);

        const board_game = document.createElement('div');
        board_game.setAttribute('id', 'board-game');

        appContainer.appendChild(board_game);
        
        app.appendChild(appContainer);
    }

    showTimerBeforeMatch(){
        const board_game = document.getElementById('board-game');
        let seconds_div = document.createElement('div');
        seconds_div.setAttribute('id', 'countdown');
        board_game.appendChild(seconds_div);
        let seconds = 6;
        let total = seconds
        let timeinterval = setInterval(() => {
            total = --total;
            seconds_div.textContent = total;
            if (total <= 0) {
                clearInterval(timeinterval);
                this.socket.send(JSON.stringify({'type_message' : 'ws_handshake', 'ws_handshake' : 'confirmation'}));
            }
        }, 1000);
    }

    initKeyEvents = () => {
        document.addEventListener('keydown', (e) => {
            if (this.socket.readyState === WebSocket.OPEN)
            {
                switch(e.key){
                    case 'w':
                        this.socket.send(JSON.stringify({'type_message' : 'game_event', 'game_event' : 'move_up' , 'id' : `${this.user_1_info.id}`}));
                        break;
                    case 's':
                        this.socket.send(JSON.stringify({'type_message' : 'game_event', 'game_event' : 'move_down' , 'id' : `${this.user_1_info.id}`}));
                        break;
                    case 'ArrowUp':
                        this.socket.send(JSON.stringify({'type_message' : 'game_event', 'game_event' : 'move_up' , 'id' : `${this.user_2_info.id}`}));
                        break;
                    case 'ArrowDown':
                        this.socket.send(JSON.stringify({'type_message' : 'game_event', 'game_event' : 'move_down' , 'id' : `${this.user_2_info.id}`}));
                        break;       
                }
            }
        });
    }
}


