import { BaseClass } from './BaseClass';
import { navigateTo } from './Router';

export class Chat extends BaseClass {
    constructor() {
        super();
        this.chatSocket = null;
        this.token = localStorage.getItem('token');
        this.profileData;
        this.addDocumentClickListener();
    }

    async handleDocumentClick(event) {
        const target = event.target;
        if (target.tagName === 'BUTTON' || target.closest('button')) 
        {
            const link = document.querySelector(`[id*="profile_${target.id}"]`);
            event.preventDefault();
            this.initChatWindow(target.id, link.innerText, event);
        }
    }


    async notifyGame(targetId){
        const requestBody = {
            message: `@${this.profileData.username} invited you to a Pong Game ! Go to Dashboard to start playing !`,
            sender: this.profileData.username,
            recipient: targetId
        };
    
        try {
            const response = await fetch(`${this.httpProtocol}://${this.host}:${this.backendPort}/notify/invite/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
            });
        } catch (error) {
            // Handle error here
            console.error('Error creating match:', error);
        }
    }

    async createMatch(targetId){
        const requestBody = {
            user_1: this.profileData.id,
            user_2: targetId
        };
    
        try {
            const response = await fetch(`${this.httpProtocol}://${this.host}:${this.backendPort}/pong/matches/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
            });
    
            const message = "You're invited to a game of pong! Go to DASHBOARD to start playing.";
            this.chatSocket.send(JSON.stringify({
                type: 'message',
                token: this.token,
                message: message,
            }));
            await this.notifyGame(targetId);
        } catch (error) {
            console.error('Error creating match:', error);
        }
    }

    async blockFriendUser(targetId, targetUsername){
        await fetch(`${this.httpProtocol}://${this.host}:${this.backendPort}/chat/block-user/${targetId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json',
            },
        })
        .then(response => {
            if (!response.ok) {
                console.error('Error:', response.status);
            }
            return response.json();
        })
        .then(data => {
            const blockButt = document.getElementById(`block_${targetId}`);
            const inviteButt = document.getElementById(`invite_${targetId}`);
            blockButt.remove();
            inviteButt.remove();
            const chatLog = document.getElementById('chatLog');
            chatLog.innerHTML = `YOU HAVE BLOCKED ${targetUsername}.`;
        })
        .catch(error => console.error('Error:', error));
    }

    generateChatBubble(sender, message, time){
        return `<div class="p-0 mt-2 row align-items-center ${(this.profileData.username == sender) ? `justify-content-end` : `justify-content-start`}">
                    <div class="p-0 m-0 col-xl-6 col-md-8 col-11 ${(this.profileData.username == sender) ? `text-end justify-content-end` : `text-start justify-content-start`}">
                        <div class="px-2 m-0 row ${(this.profileData.username == sender) ? `justify-content-end` : `justify-content-start`}">
                            <div class="p-0 m-0 col">
                                <p class="p-1 m-0 rounded-3 conchasuwrawra" style="background-color: ${(this.profileData.username == sender) ? '#FFFFFC' : 'rgba(166, 118, 255, 0.5)'};">${message}</p>
                                <p class="time px-1 rounded-3 text-muted ${(this.profileData.username == sender) ? `text-end` : `text-start`}">${time}</p>
                            </div>
                        </div>
                    </div>
                </div>`;
    }

    async auto_scroll_down(){
        const winchat = document.getElementById('chatLog');
        winchat.scrollTop = winchat.scrollHeight;
    }

    async startConvo(targetId) {
        if (this.chatSocket != null && this.chatSocket.readyState === WebSocket.OPEN) {
            this.chatSocket.close();
            this.chatSocket = null;
        }
        const wsProtocol = process.env.PROTOCOL === 'https' ? 'wss:' : 'ws:';
        this.chatSocket = new WebSocket(`${wsProtocol}//${this.host}:${this.backendPort}/ws/chat/${targetId}/?token=${this.token}`);
        this.chatSocket.onopen = function (e) {
            //console.log('Socket successfully connected.');
            const authenticateMessage = {
                type: 'authenticate',
                token: this.token,
            };
        }
        this.chatSocket.onmessage = function (e) {
            const data = JSON.parse(e.data);
            document.querySelector('#chatLog').innerHTML += this.generateChatBubble(data.senderUsername, data.message, data.time)
            this.auto_scroll_down();
        }.bind(this);
        this.chatSocket.onclose = function (e) {
            //console.log('Socket closed unexpectedly');

        }.bind(this);

        // document.querySelector('#chat-message-input').focus();
        document.querySelector('#chat-message-input').onkeyup = function (e) {
            if (e.keyCode == 13){
                const messageInputDom = document.querySelector('#chat-message-input');
                const message = messageInputDom.value;
                this.chatSocket.send(JSON.stringify({
                    type: 'message',
                    token: this.token,
                    message: message,
                }));
                messageInputDom.value = '';
            }
        }.bind(this);
    }

    async isFriendBlocked(id) {
        const jwtAccess = localStorage.getItem('token');
        try {
            const response = await fetch(`${this.httpProtocol}://${this.host}:${this.backendPort}/chat/is-blocked/${id}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${jwtAccess}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                if (response.status === 401) {
                    console.error('Unauthorized access. Please log in.');
                } else {
                    console.error('Error:', response.status);
                }
                throw new Error('Unauthorized');
            }
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error:', error);
            throw error;
        }
    }

    async initChatWindow(targetId, targetUsername, event) {
        const chatHeader = document.getElementById('chatHeader');
        const isBlocked = await this.isFriendBlocked(targetId);
        chatHeader.innerHTML = `<h5 class="chatHead">#${targetUsername}</h5>`;

        const chatWindow = document.getElementById('chatWindow');
        chatWindow.innerHTML = '';
        
        // Create a div for chat log
        const chatLog = document.createElement('div');
        chatLog.setAttribute('id', 'chatLog');
        chatLog.setAttribute('class', 'chatLog col');
        chatWindow.appendChild(chatLog);
    
        const chatInput = document.getElementById('chatInput');
        chatInput.innerHTML = '';
        const inputGroup = document.createElement('div');
        inputGroup.setAttribute('class', 'input-group p-2');
        inputGroup.style.backgroundColor = 'rgba(148, 103, 150, 0.336)';
        const chatInputField = document.createElement('input');
        chatInputField.setAttribute('class', 'form-control p-0');
        chatInputField.setAttribute('id', 'chat-message-input');
        chatInputField.setAttribute('type', 'text');
        chatInputField.setAttribute('placeholder', `Send message to ${targetUsername}`);
        const inputGroupAppend = document.createElement('div');
        inputGroupAppend.setAttribute('class', 'input-group-append');
        inputGroupAppend.style.borderRadius = '0px';
        inputGroup.appendChild(chatInputField);
        inputGroup.appendChild(inputGroupAppend);
        chatInput.appendChild(inputGroup);

        const blockDiv = document.getElementById('blockUser');
        blockDiv.innerText = "";
        const inviteDiv = document.getElementById('invitePong');
        inviteDiv.innerText = "";
        if (isBlocked.blocked === false){
            const blockLink = document.createElement('a');
            blockLink.href = "#";
            blockLink.setAttribute('id', `block_${targetId}`);
            blockLink.setAttribute('class', 'chatFooter');
            blockLink.innerHTML = '<i class="bi bi-slash-circle""></i><i>  BLOCK</i>';
            blockLink.addEventListener('click', function(event) {
                event.preventDefault(); 
                this.blockFriendUser(`${targetId}`, `${targetUsername}`); 
            }.bind(this));

            
            const inviteLink = document.createElement('a');
            inviteLink.href = "#";
            inviteLink.setAttribute('id', `invite_${targetId}`);
            inviteLink.innerHTML = '<i class="bi bi-joystick"></i><i>  INVITE</i>';
            inviteLink.addEventListener('click', function(event) {
                event.preventDefault(); 
                this.createMatch(`${targetId}`); 
            }.bind(this));
            blockDiv.appendChild(blockLink);
            inviteDiv.appendChild(inviteLink);
        }
        else
        {
            blockDiv.innerHTML = '<i class="bi bi-slash-circle""></i><i>  BLOCKED</i>';
            inviteDiv.innerText = "";
        }

        await this.startConvo(targetId);
    }

    async getFriendData(id) {
        const jwtAccess = localStorage.getItem('token');
        try {
            const response = await fetch(`${this.httpProtocol}://${this.host}:${this.backendPort}/users/${id}/`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${jwtAccess}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                if (response.status === 401) {
                    console.error('Unauthorized access. Please log in.');
                } else {
                    console.error('Error:', response.status);
                }
                throw new Error('Unauthorized');
            }
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error:', error);
            throw error;
        }
    }

    async generateFriendElements(friends) {
        const friendListContainer = document.getElementById('friendList');
        friendListContainer.innerHTML = '';
    
        for (const friend of friends) {
            const friendUsername = friend[Object.keys(friend)[0]];
            const friendId = friend[Object.keys(friend)[1]];
            
            try {
                const friendData = await this.getFriendData(friendId);
                const divRow = document.createElement('div');
                divRow.classList.add('row', 'friend-row', 'text-white');
                const contentContainer = document.createElement('div');
                contentContainer.classList.add('d-flex', 'align-items-center');
    
                const messageButton = document.createElement('button');
                messageButton.setAttribute('class', 'btn btn-dark btn-small mr-2');
                messageButton.setAttribute('id', `${friendId}`);
    
                const chatIcon = document.createElement('i');
                chatIcon.setAttribute('class', 'bi bi-chat');
                chatIcon.setAttribute('id', `${friendId}`);
                messageButton.appendChild(chatIcon);
    
                const image = document.createElement('img');
                image.setAttribute('src', friendData.profile_pic.replace(`${this.host}:${this.backendPort}`, `${this.host}:${this.frontendPort}`));
                image.setAttribute('class', 'chatvatar');
    
                const link = document.createElement('a');
                link.setAttribute('id', `profile_${friendId}${friendUsername}`)
                link.addEventListener('click', (event) => {
                    if (event.target.tagName === 'A') {
                        event.preventDefault();
                        navigateTo(event.target.href);
                    }
                });
                link.href = `/profile/${friendId}`;
                link.innerText = ` ${friendUsername}`;
    
                contentContainer.appendChild(messageButton);
                contentContainer.appendChild(image); // Append image
                contentContainer.appendChild(link);
                divRow.appendChild(contentContainer);
                friendListContainer.appendChild(divRow);
            } catch (error) {
                console.error('Error fetching user data:', error);
            }
        }
    }

    async displayFriendList() {
        await fetch(`${this.httpProtocol}://${this.host}:${this.backendPort}/users/friendship/${this.profileData.username}/`, {
            method : 'GET',
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json',
            },
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Error');
            }
            return response.json();
        })
        .then(data => {
            if (data.length == 0){
                document.getElementById('chatWindow').innerHTML = `No friends yet :( <br>Add some friends to start chatting.`;
                return ;
            }
            else
                this.generateFriendElements(data);
        })
        .catch(error => {
            console.error('Error fetching friendlist : ', error);
        });
    }

    async getUserData() {
        try {
            const response = await fetch(`${this.httpProtocol}://${this.host}:${this.backendPort}/users/profile/`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                if (response.status === 401) {
                    console.error('Unauthorized access. Please log in.');
                } else {
                    console.error('Error:', response.status);
                }
                throw new Error('Unauthorized');
            }
            const data = await response.json();
            this.profileData = data;
            return data;
        } catch (error) {
            console.error('Error:', error);
            throw error;
        }
    }

    async getHtmlForMain() {
        await this.getUserData();
        this.displayFriendList();
        return `<div class="container">
        <div class="row align-items-start">
            <div class="col-2 p-3">
                <h1 class="chat-title">Messages</i></h1>
            </div>

            <div class="col-4 mr-10">
                <div class="row" id="friendList">
                </div>
            </div>

            <div class="col-6" id="conchasucolita">
                <div class="row" id="chatHeader"></div>
                <div class="row" id="chatWindow"></div>
                <div class="row" id="chatInput"></div>
                <div class="row" id="chatFooter">
                    <div class="col text-start" id="blockUser"></div>
                    <div class="col text-end" id="invitePong"></div>
            </div>
        </div>
            `;
    }

    cleanup() {
        this.removeDocumentClickListener();
        if (this.chatSocket != null && this.chatSocket.readyState === WebSocket.OPEN) {
            this.chatSocket.close();
            this.chatSocket = null;
        }
    }
} 

