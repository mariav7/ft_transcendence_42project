import { BaseClass } from './BaseClass';
import jwt_decode from 'jwt-decode';

export class LoadProfile extends BaseClass
{
    constructor(id) {
        super();
        this.id = id;
    }

    async getUserData() {
        const jwtAccess = localStorage.getItem('token');
        try {
            const response = await fetch(`${this.httpProtocol}://${this.host}:${this.backendPort}/users/${this.id}/`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${jwtAccess}`,
                    'Content-Type': 'application/json',
                },
            });
            if (!response.ok) {
                throw response.status
            }
            const data = await response.json();
            return data;
        } catch (error) {
            if (error === 401)
                throw `Unauthorized access. Please log in.`;
            else if (error === 404)
                throw `Not found`;
            throw error;
        }
    }
    
    async getFriendshipStatus(user) {
        const jwtAccess = localStorage.getItem('token');
        let decoded_token = jwt_decode(jwtAccess);
        fetch(`${this.httpProtocol}://${this.host}:${this.backendPort}/users/friendship/${user.username}/`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${jwtAccess}`,
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
            const hasValue = data.some(item => (
                (item.hasOwnProperty("recipient_id") && item.recipient_id === decoded_token.user_id) ||
                (item.hasOwnProperty("sender_id") && item.sender_id === decoded_token.user_id)
              ));
            if (hasValue){
                const friendRequestLink = document.createElement('text');
                friendRequestLink.innerText = `You and ${user.username} are friends :)`;
                document.getElementById('friendRequest').appendChild(friendRequestLink);
            }
            else if (this.id == decoded_token.user_id) {
                const friendRequestLink = document.createElement('text');
                friendRequestLink.innerText = ``;
                document.getElementById('friendRequest').appendChild(friendRequestLink);
            } else{
                const friendRequestLink = document.createElement('button');
                friendRequestLink.setAttribute('class', 'btn btn-dark');
                friendRequestLink.setAttribute('id', 'addButton');
                friendRequestLink.href = '#';
                friendRequestLink.innerText = 'Add as friend';
                friendRequestLink.addEventListener('click', (event) => {
                    event.preventDefault();
                    this.addFriend(user);
                });
                document.getElementById('friendRequest').appendChild(friendRequestLink);
            }
        })
        .catch(error => {
            console.error('Error fetching friendlist : ', error);
        });
    }

    async delayedDisplayStatus(user) {
        setTimeout(() => {
            this.displayStatus(user);
        }, 80);
    }

    displayStatus = (user) => {
        const jwtAccess = localStorage.getItem('token');
        fetch(`${this.httpProtocol}://${this.host}:${this.backendPort}/notify/${user.username}/`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${jwtAccess}`,
                'Content-Type': 'application/json',
            },
        })
        .then(response => {
            if (!response.ok) {
                console.error('Error:', response.status);
                return; 
            }
            return response.json();
        })
        .then(data => {
            var statusGroup = document.getElementById('status');
            if (data.hasOwnProperty('error')) {
                var spanHTML = '<span class="position-absolute mt-2 top-15 start-0 p-2 translate-middle rounded-circle bg-danger border border-light" id="status"></span>';
            }
            else {
                var spanHTML = '<span class="position-absolute mt-2 top-15 start-0 p-2 translate-middle rounded-circle bg-success border border-light" id="status"></span>';
            }
            statusGroup.insertAdjacentHTML('afterbegin', spanHTML);
            this.getFriendshipStatus(user);
        })
        .catch(error => console.error('Error fetching status:', error));
    }

    addFriend = (user) => {
        const jwtAccess = localStorage.getItem('token');
        fetch(`${this.httpProtocol}://${this.host}:${this.backendPort}/users/friendship/${user.id}/`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${jwtAccess}`,
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
            document.getElementById('addButton').remove();
            const friendAddedText = document.createElement('text');
            friendAddedText.innerText = `You and ${user.username} are friends :)`;
            document.getElementById('friendRequest').appendChild(friendAddedText);
        })
        .catch(error => {
            console.error('Impossible friendship : ', error);
        });

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

    async displayMatchLogDelayed(user) {
        setTimeout(async () => {
            await this.displayMatchLog(user);
        }, 80);
    }

    async displayMatchLog(user) {
        const jwtAccess = localStorage.getItem('token');
    
        try {
            const response = await fetch(`${this.httpProtocol}://${this.host}:${this.backendPort}/pong/user_matches/${user.id}/`, {
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
            const log_content = document.getElementById('log_content');
            if (data.length == 0)
                log_content.innerHTML = 'No matches played yet.'
            for (const match of data) {
                try {
                    const log_div = document.createElement('div');
                    log_div.setAttribute('class', 'log-content');
                    const loser = await this.getFriendData(match.loser);
                    const winner = await this.getFriendData(match.winner);
                    log_div.innerText = `@${match.created_at}, ${winner.username} won against ${loser.username} (${match.score_user_1} - ${match.score_user_2})`;
                    log_content.appendChild(log_div);
                } catch (error) {
                    console.error('Error fetching user data:', error);
                }
            }
            return data;
        } catch (error) {
            console.error('Error:', error);
        }
    }


    async getMatchData(user) {
        const jwtAccess = localStorage.getItem('token');
    
        try {
            const response = await fetch(`${this.httpProtocol}://${this.host}:${this.backendPort}/pong/user_matches/${user.id}/`, {
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
        }
    }

    async getTournData(user) {
        const jwtAccess = localStorage.getItem('token');
    
        try {
            const response = await fetch(`${this.httpProtocol}://${this.host}:${this.backendPort}/pong/tournaments/wins/${user.id}/`, {
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
        }
    }

    getWinsPercent(matchData, winnerId) {
        const totalMatches = matchData.length;
        let winsCount = 0;
    
        for (const match of matchData) {
            if (match.winner === winnerId) {
                winsCount++;
            }
        }
        const winPercentage = Math.round((winsCount / totalMatches) * 100);
        return winPercentage; 
    }

    getLossPercent(matchData, loserId) {
        const totalMatches = matchData.length;
        let lossCount = 0;
    
        for (const match of matchData) {
            if (match.loser === loserId) {
                lossCount++;
            }
        }
        const lossPercentage = Math.round((lossCount / totalMatches) * 100);
        return lossPercentage;
    }

    isInCurrentWeek(dateString) {
        const date = new Date(dateString);
        const currentDate = new Date();
        const startOfWeek = new Date(
          currentDate.getFullYear(),
          currentDate.getMonth(),
          currentDate.getDate() - currentDate.getDay()
        );
        const endOfWeek = new Date(
          currentDate.getFullYear(),
          currentDate.getMonth(),
          currentDate.getDate() + (6 - currentDate.getDay())
        );
        return date >= startOfWeek && date <= endOfWeek;
      }
      
    getCurrentWeekWins(tournData) {
        let currentWeekWinsCount = 0;
      
        for (const tourn of tournData) {
          if (tourn.created_at && this.isInCurrentWeek(tourn.created_at)) {
            currentWeekWinsCount++;
          }
        }
      
        return currentWeekWinsCount;
    }

    async getHtmlForMain() {
        try{
        const profileData = await this.getUserData();
        const picPath = profileData.profile_pic.replace(`${this.host}:${this.backendPort}`, `${this.host}:${this.frontendPort}`)
        await this.delayedDisplayStatus(profileData);
        await this.displayMatchLogDelayed(profileData);
        const matchData = await this.getMatchData(profileData);
        let wins = this.getWinsPercent(matchData, profileData.id);
        if (!wins)
            wins = 0;
        let losses = this.getLossPercent(matchData, profileData.id);
        if (!losses)
            losses = 0;
        const tournData = await this.getTournData(profileData);
        let twins = this.getCurrentWeekWins(tournData);3
        return `<div class="container text-center">
                    <div class="row align-items-center">
                        <div class="col" id="leftCol">
                            <div class="row justify-content-center" id="username" >
                                <h1>${profileData.username}</h1>
                            </div>
                            <div class="btn-group dropstart">
                                <img src="${picPath}" id="pic" class="avatar img-fluid" alt="Profile Image">
                                <span class="" id="status"></span>
                            </div>

                            <div class="row justify-content-center" id="nb">${profileData.id}</div>
                            <div class="row justify-content-center" id="email">${profileData.email}</div>
                            <div class="row justify-content-center" id="bio">${profileData.bio}</div>
                            <div  id="friendRequest"></div> 
                        </div>

                        <div class="col" id="right-col">
                            <div class="row" id="wins_losses">
                                <div class="col-1 p-3 mb-3 p-title" id="stats_title">Stats</div>
                                <div class="col p-3"  id="stat_content">
                                    <h6> Matches </h6>
                                    <div class="progress bg-dark mb-3" role="progressbar" aria-label="Danger example" aria-valuenow="100" aria-valuemin="0" aria-valuemax="100">
                                        <div class="progress-bar-win" style="width: ${wins}%">
                                            <span class="progress-text">${wins}% winner</span>
                                        </div>
                                        <div class="progress-bar bg-danger" style="width: ${losses}%">
                                            <span class="progress-text">${losses}% loser</span>
                                        </div>
                                    </div>

                                <h6> Tournaments </h6>
                                <div class="row justify-content-center p-2">
                                    <svg width="50" height="50" viewBox="0 0 250 250" class="circular-progress">
                                        <circle cx="125" cy="125" r="100" class="bg"></circle>
                                        <circle cx="125" cy="125" r="100" class="fg"></circle>
                                        <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" id="progress-text" style="font-size: 100px; fill:white;">${twins}</text>
                                    </svg>
                                    <p id="winwin">won this week</p>
                                </div>
                            </div>
                        </div>
                        <div class="row align-items-start" id="match_log" >
                            <div class="col-1 p-3 p-title" id="log_title">Match history</div>
                            <div class="col p-3 log-content justify-content-start" id="log_content"></div>
                        </div>
                    </div>
                </div>`;
        } catch (error) {
            return `<h1>${error}</h1>`;
        };
    }
}