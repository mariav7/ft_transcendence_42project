import { BaseClass } from './BaseClass';
import { navigateTo } from './Router';

class User{
    constructor(username, pic, id, email, bio) {
        //console.log("PICPATH IN PROFILE", pic);
        this.username = username;
        this.pic = pic;
        this.id = id;
        this.email = email;
        this.bio = bio;
        this.friendMap = new Map();
        this.httpProtocol = process.env.PROTOCOL;
        this.host = process.env.HOST_IN_USE;
        this.backendPort = process.env.BACKEND_PORT;
        this.frontendPort = process.env.FRONTEND_PORT;
    }
    getProfilePicPath() {
        return `${this.httpProtocol}://${this.host}:${this.frontendPort}` + this.pic;
    }
    getFriendReq() {
        return `${this.httpProtocol}://${this.host}:${this.backendPort}/users/friendship/` + this.username + "/";
    }
    getStatus() {
        return `${this.httpProtocol}://${this.host}:${this.backendPort}/notify/` + this.username + "/";
    }
}

export class Profile extends BaseClass {
    constructor() {
        super();
    }

    displayStatus = (user) =>  {
        const jwtAccess = localStorage.getItem('token');
    
        fetch(user.getStatus(), {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${jwtAccess}`,
                'Content-Type': 'application/json',
            },
        })
        .then(response => {
            if (!response.ok) {
                console.error('Error:', response.status);
                document.getElementById('status').innerText = 'Offline';
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
        })
        .catch(error => console.error('Error fetching status:', error));
    }


    async generateFriendElements(friends) {
        const friendListContainer = document.getElementById('friendList');
    
        for (const friend of friends) {
            const friendId = friend[Object.keys(friend)[1]];
            try {
                const friendData = await this.getFriendData(friendId);
                const friendUsername = friendData.username;
                const friendProfilePic = friendData.profile_pic.replace(`${this.host}:${this.backendPort}`, `${this.host}:${this.frontendPort}`);
                const contentContainer = document.createElement('div');
                contentContainer.classList.add('d-flex', 'align-items-center');
                const image = document.createElement('img');
                image.setAttribute('src', friendProfilePic);
                image.setAttribute('class', 'friendvatar');
                const link = document.createElement('a');
                link.addEventListener('click', (event) => {
                    if (event.target.tagName === 'A') {
                        event.preventDefault();
                        navigateTo(event.target.href);
                    }
                });
                link.href = `/profile/${friendId}`;
                link.innerText = ` ${friendUsername}`;
        
                contentContainer.appendChild(image);
                contentContainer.appendChild(link);
                friendListContainer.appendChild(contentContainer);
            }
            catch (error) {
                console.error('Error fetching user data:', error);}
        }
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

    async getFriendList(user) {
        const jwtAccess = localStorage.getItem('token');
        fetch(user.getFriendReq(), {
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
        .then(async data => {
            if (data.length == 0)
                document.getElementById('friendList').innerText = "You dont have any friends yet.";
            else
                this.generateFriendElements(data);
        })
        .catch(error => {
            console.error('Error fetching friendlist : ', error);
        });
    }

    async displayProfile() {
        const jwtAccess = localStorage.getItem('token');
    
        return fetch(`${this.httpProtocol}://${this.host}:${this.backendPort}/users/profile/`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${jwtAccess}`,
                'Content-Type': 'application/json',
            },
        })
        .then(response => {
            if (!response.ok) {
                if (response.status === 401) {
                    console.error('Unauthorized access. Please log in.');
                } else {
                    console.error('Error:', response.status);
                }
                throw new Error('Unauthorized');
            }
            return response.json();
        })
        .then(data => {
            const currentUser = new User(data.username, data.profile_pic, data.id, data.email, data.bio);
            return currentUser;
        })
        .catch(error => {
            console.error('Error:', error);
            return null;
        });
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

    async displayMatchLogDelayed(user) {
        setTimeout(async () => {
            await this.displayMatchLog(user);
        }, 80);
    }

    async delayedDisplayStatus(user) {
        setTimeout(() => {
            this.displayStatus(user);
        }, 80);
    }

    async delayedgetFriendList(user) {
        setTimeout(() => {
            this.getFriendList(user);
        }, 80);
    }
    async getHtmlForMain() {
        const currentUser = await this.displayProfile();
        await this.delayedDisplayStatus(currentUser);
        const matchData = await this.getMatchData(currentUser);
        await this.displayMatchLogDelayed(currentUser);
        let wins = this.getWinsPercent(matchData, currentUser.id);
        if (!wins)
            wins = 0;
        let losses = this.getLossPercent(matchData, currentUser.id);
        if (!losses)
            losses = 0;
        const tournData = await this.getTournData(currentUser);
        let twins = this.getCurrentWeekWins(tournData);
        await this.delayedgetFriendList(currentUser);
        return `<div class="container text-center">
                    <div class="row align-items-center">
                        <div class="col-4" id="leftCol">
                            <div class="row justify-content-center" id="username"><h1>${currentUser.username}</h1></div>
                            <div class="btn-group dropstart">
                                    
                                    <img src="${currentUser.getProfilePicPath()}" id="pic" class="avatar img-fluid" alt="Profile Image">
                                    <span class="" id="status">
                                    </span>
                            </div>
                            
                        
                            <div class="row justify-content-center" id="nb">${currentUser.id}</div>
                            <div class="row justify-content-center" id="email">${currentUser.email}</div>
                            <div class="row justify-content-center" id="bio">${currentUser.bio}</div>
                        
                        
                            
                        </div>

                        <div class="col" id="right-col">
                            
                            <div class="row" id="wins_losses">
                                <div class="col-1 p-3 mb-3 p-title" id="stats_title">
                                    Stats
                                </div>
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
                                                <!-- Background Circle -->
                                                <circle cx="125" cy="125" r="100" class="bg"></circle>
                                                
                                                <!-- Foreground Circle -->
                                                <circle cx="125" cy="125" r="100" class="fg"></circle>
                                                
                                                <!-- Text Element -->
                                                <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" id="progress-text" style="font-size: 100px; fill:white;">${twins}</text>
                                            </svg>

                                            <p id="winwin">won this week</p>

                                    </div>

                                        
                                </div>
                                
                            </div>


                            <div class="row align-items-start" id="match_log" >
                                <div class="col-1 p-3 p-title" id="log_title">
                                    Match history
                                </div>
                                <div class="col p-3 log-content justify-content-start" id="log_content">
                                </div>
                            </div>

                        </div>

                        <div class="col-3 p-4">
                        <div class="row">
                                <div class="d-grid gap-2 d-md-flex justify-content-md-center">
                                    <button class="btn btn-dark btn-sm" type="button" data-bs-toggle="collapse" data-bs-target="#collapseExample" aria-expanded="false" aria-controls="collapseExample">
                                        Friends
                                    </button>
                                </div>
                                <div class="collapse" id="collapseExample">
                                    <div class="card friend-body" id="friendList"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>`;
    }
    
}
