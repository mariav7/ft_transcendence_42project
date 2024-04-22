import { BaseClass } from './BaseClass'
import { router } from './Router'

export class MatchLobby extends BaseClass {
    constructor() {
        super();
        this.socket = null;
        
        this.run();
    }
    
    async run()
    {
        // await this.initWebSocketLobby();
        await this.postMatch();
    }


    async postMatch() {
        const url = `${this.httpProtocol}://${this.host}:${this.backendPort}/pong/join_match/`;
        const jwtAccess = localStorage.getItem('token');
        
        const options = {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${jwtAccess}`,
                'Content-Type': 'application/json',
            },
        };
        
        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                if (response.status === 401) {
                    console.error('Unauthorized access. Please log in.');
                } else {
                    console.error('Error:', response.status);
                }
                throw new Error('Unauthorized');
            }
            else
            {
                const json_response = await response.json();
                
                const { action, match_id } = json_response;

                this.initWebSocketLobby(match_id);
                if (action === 'join_play')
                {
                    if (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)
                        this.socket.close();
                    history.pushState('', '', `/match/${match_id}`);
                    router();
                }
            }
        } catch (error) {
            console.error('Error:', error);
            throw error;
        }
    }

    showMessageAndRedirect(redirect_reason) {
        document.getElementById('app').innerHTML = `<p>${redirect_reason}<br>You will be redirected in to dashboard page <time><strong id="seconds">5</strong> seconds</time>.</p>`
        let seconds = document.getElementById('seconds'),
        total = seconds.innerHTML;
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

    async initWebSocketLobby(id_match) {
        const wsProtocol = process.env.PROTOCOL === 'https' ? 'wss:' : 'ws:';
        const wsUrl = `${wsProtocol}//${this.host}:${this.backendPort}/ws/pong/lobby/?id_match=${id_match}`;
    
        this.socket = new WebSocket(wsUrl);

        this.socket.onopen = function() {
            //console.log('WebSocket(match lobby) connection established.');
        };

        this.socket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            const { type_message } = data;
            if (this.socket.readyState === WebSocket.OPEN)
            {
                switch (type_message)
                {
                    case 'action':
                        const { action, match_id } = data;
                        if (action === 'join_play')
                        {
                            //console.log('JOIN PLAY BY WSS');
                            if (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)
                                this.socket.close();
                            history.pushState('', '', `/match/${match_id}`);
                            router();
                        }
                        break;
                    case 'request_ping':
                        this.socket.send(JSON.stringify({'type_message' : 'ping', 'url' : `${window.location.href}`}));
                        break;
                    case 'match_aborted':
                        this.socket.close();
                        break;
                }
            }
        };

        this.socket.onerror = function(error) {
            // this.showMessageAndRedirect('Tesssst')
            //console.log(error);
        };
    
        this.socket.onclose = function() {
            //console.log('WebSocket (match lobby) connection closed.');
        };
    }


    /*Method to get the HTML of the dashboard*/
    getHtmlForMain() {
        return `<div>
                    <p> Searching for opponent...</p>
                    <br>
                </div>
                <div class="spinner-border" role="status">
                </div>`;
    }
}
