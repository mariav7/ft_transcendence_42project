import { BaseClass } from './BaseClass'
import jwt_decode from 'jwt-decode';
import { router, navigateTo } from './Router';

export class Tournament extends BaseClass {

    constructor(dashboardInstance) {
        super();
        this.dashboard = dashboardInstance;
    }
    async notifyGame(senderId, targetId, name){
        const jwtAccess = localStorage.getItem('token');
        //console.log("senderID", senderId, targetId);
        const requestBody = {
            message: `@${senderId} IS WAITING FOR YOU IN THE ${name} TOURNAMENT `,
            sender: senderId,
            recipient: targetId
        };
    
        try {
            const response = await fetch(`${this.httpProtocol}://${this.host}:${this.backendPort}/notify/invite/`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${jwtAccess}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
            });
        } catch (error) {
            console.error('Error notifying match:', error);
        }
    }

    async getMatchData(id) {
        const jwtAccess = localStorage.getItem('token');
    
        try {
            const response = await fetch(`${this.httpProtocol}://${this.host}:${this.backendPort}/pong/matches/${id}/`, {
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

    async getUserData(id) {
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
                throw response.status
            }
            const data = await response.json();
            return data;
        } catch (error) {
            if (error === 401)
                throw `Unauthorized access. Please log in.`;
            else if (error === 404)
                throw `Not found`;
            // console.error('Error:', error);
            throw error;
        }
    }

    async notifyUsers(data){
        //console.log("GOING TO SEND THAT NOTIFICATION", data.participants, data);
        for (const matchId of data.matches) {
            const matchData = await this.getMatchData(matchId);
            //console.log("NOTIFYUSER", matchData);
            const user1 = await this.getUserData(matchData.user_1);
            //console.log("NUSER1", user1);
            const user2 = await this.getUserData(matchData.user_2);
            //console.log("NUSER1", user2);
            await this.notifyGame(user1.username, user2.id, data.name);
            await this.notifyGame(user2.username, user1.id, data.name);
            //console.log("Match ID:", matchId);
        }
    }

    async createTournament(tournamentName) {
        const url = `${this.httpProtocol}://${this.host}:${this.backendPort}/pong/create_tournament/`;

        const jwtAccess = localStorage.getItem('token');

        const options = {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${jwtAccess}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                tournamentName: tournamentName,
            }),
        };

        try {
            const response = await fetch(url, options);
            if (!response.ok) {
                throw new Error('The request was not successful');
            }
            const data = await response.json();
            //console.log('Backend response:', data);
            return {
                success: true,
                message: `Tournament ${data.name} succesfully created!`,
            };
        } catch (error) {
            console.error('Error making request:', error);
            return {
                success: false,
                message: `Error while creating ${tournamentName}`,
            };
        }
    }

    async fetchOpenTournaments() {
        const jwtAccess = localStorage.getItem('token');
    
        const options = {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${jwtAccess}`,
                'Content-Type': 'application/json',
            },
        };
        const response = await fetch(`${this.httpProtocol}://${this.host}:${this.backendPort}/pong/tournaments/`, options);
        const data = await response.json();
        //console.log("tournament list", data);
        return data;
    }

    async fetchTournamentLeaderboard(tournamentId) {
        const jwtAccess = localStorage.getItem('token');
    
        const options = {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${jwtAccess}`,
                'Content-Type': 'application/json',
            },
        };
    
        try {
            const response = await fetch(`${this.httpProtocol}://${this.host}:${this.backendPort}/pong/tournaments/${tournamentId}/leaderboard/`, options);
    
            if (!response.ok) {
                const errorData = await response.json();
                console.error('Error fetching tournament leaderboard:', errorData.error);
            } else {
                const tournamentData = await response.json();
                //console.log('Successfully fetched tournament leaderboard:', tournamentData);
                return tournamentData;
            }
        } catch (error) {
            console.error('Error fetching tournament leaderboard:', error);
        }
    }

    async fetchTournamentData(tournamentId) {
        const jwtAccess = localStorage.getItem('token');
    
        const options = {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${jwtAccess}`,
                'Content-Type': 'application/json',
            },
        };
    
        try {
            const response = await fetch(`${this.httpProtocol}://${this.host}:${this.backendPort}/pong/tournaments/${tournamentId}/`, options);
    
            if (!response.ok) {
                const errorData = await response.json();
                console.error('Error fetching tournament data:', errorData.error);
            } else {
                const tournamentData = await response.json();
                //console.log('Successfully fetched tournament data:', tournamentData);
                return tournamentData;
            }
        } catch (error) {
            console.error('Error fetching tournament data:', error);
        }
    }

    async leaderboardTournament(tournamentId) {
        const tournamentLeaderboard = await this.fetchTournamentLeaderboard(tournamentId);
        const leaderboardData = tournamentLeaderboard.leaderboard;
    
        let leaderboardHTML = `<div class="row mb-2 align-items-center justify-content-center">
                                    <div class="col-2">
                                        <button type="button" id="goBackBtn" class="px-2 py-1 btn btn-dark">
                                            <i id="goBack" class="bi bi-arrow-left-circle"></i>
                                        </button>
                                    </div>
                                    <div class="col-10">
                                        <h2 class="text-start">Tournament: ${tournamentLeaderboard.tournament_name}</h2>
                                    </div>
                                </div>
                                <div class="row justify-content-center">
                                    <h3 class="text-center mb-1 title-winner">Winner: ${tournamentLeaderboard.winner}</h3>
                                    <div class="col-lg-8 col-md-10 col-sm-12">
                                        <table id="leaderboard" class="table table-dark table-hover my-3">
                                            <thead>
                                                <tr>
                                                    <th>Rank</th>
                                                    <th>User</th>
                                                    <th>Points</th>
                                                    <th>Points against</th>
                                                </tr>
                                            </thead>
                                            <tbody class="table-group-divider">`;
    
        leaderboardData.forEach(entry => {
            leaderboardHTML += `<tr>
                                    <td>${entry.rank}</td>
                                    <td><a class="opponent-link" href="/profile/${entry.user_id}">${entry.username}</a></td>
                                    <td>${entry.points}</td>
                                    <td>${entry.total_points_against}</td>
                                </tr>`;
        });
    
        leaderboardHTML += `</tbody>
                        </table>
                    </div>
                </div>`;
    
        document.getElementById('app').innerHTML = leaderboardHTML;
        const opponentLinks = document.querySelectorAll('#leaderboard .opponent-link');
        opponentLinks.forEach(link => {
            link.addEventListener('click', event => {
                event.preventDefault();
                navigateTo(link.href);
            });
        });
    }

    async joinTournament(tournamentId) {
        const joinButton = document.getElementById(`join-button-${tournamentId}`);
        const spinner = document.getElementById(`spinner-${tournamentId}`);

        //console.log(`joinButton: ${joinButton.id}`);
        
        try {
            spinner.style.display = 'inline-block';
            joinButton.disabled = true;
    
            await this.fetchJoinTournament(tournamentId);
            await this.displayOpenTournaments();

        } catch (error) {
            console.error('Error joining tournament:', error);
            spinner.style.display = 'none';
            joinButton.textContent = 'Join';
            joinButton.disabled = false;
        } finally {
            joinButton.textContent = 'Joined';
            joinButton.disabled =true;
        }
    }

    async fetchJoinTournament(tournamentId) {
        const jwtAccess = localStorage.getItem('token');

        const options = {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${jwtAccess}`,
            'Content-Type': 'application/json',
          },
        };

        try {
            const response = await fetch(`${this.httpProtocol}://${this.host}:${this.backendPort}/pong/join_tournament/${tournamentId}/`, options);
            
            if (!response.ok) {
                const errorData = await response.json();
                console.error('Error joining tournament:', errorData.error);
            } else {
                const tournamentData = await response.json();
                //console.log('Successfully joined tournament:', tournamentData);
                if (tournamentData.status == 'full')
                    this.notifyUsers(tournamentData);
            }
        } catch (error) {
            console.error('Error joining tournament:', error);
        }
    }

    async getParticipants(userId) {
        const jwtAccess = localStorage.getItem('token');
        try {
            const response = await fetch(`${this.httpProtocol}://${this.host}:${this.backendPort}/users/${userId}/profile/`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${jwtAccess}`,
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                const userData = await response.json();
                return userData;
            } else {
                console.error('Error fetching username:', response.status, response.statusText);
                return 'Unknown User';
            }
        } catch (error) {
            console.error('Error fetching username:', error);
            return 'Unknown User';
        }
    }

    async playTournament(tournament) {
        const tournamentData = await this.fetchTournamentData(tournament);
        const currentUser = jwt_decode(localStorage.getItem('token'));
        const players = await Promise.all(tournamentData.participants.map(participant => this.getParticipants(participant.user_id)));
    
        const userIdToUsernameMap = {};
        players.forEach(player => {
            userIdToUsernameMap[player.id] = player.username;
        });

        const matches = tournamentData.matches.filter(match => {
            return match.user_1 === currentUser.user_id || match.user_2 === currentUser.user_id;
        }).map(match => {
            const opponentId = match.user_1 === currentUser.user_id ? match.user_2 : match.user_1;
            const currentUserName = userIdToUsernameMap[currentUser.user_id] || 'Unknown user';
            const opponentName = userIdToUsernameMap[opponentId] || 'Unknown user';
            const score = (match.user_1 === currentUser.user_id) ? `${match.score_user_1} vs ${match.score_user_2}` : `${match.score_user_2} vs ${match.score_user_1}`;
            const buttonText = match.status === "completed" ? "Finished" : "Play";
            const buttonDisabled = match.status === "completed" ? "disabled" : "";

            return `<div class="card mb-2">
                        <div class="card-body">
                            <h5 class="card-title mb-2">${currentUserName} vs <a class="opponent-link" href="/profile/${opponentId}">${opponentName}</a></h5>
                            <div class="row align-items-center mb-2">
                                <div class="col-6">
                                    <button class="btn btn-primary py-1 px-3" data-match-id="${match.id}" data-match-status="${match.status}" ${buttonDisabled}>${buttonText}</button>
                                </div>
                                <div class="col-6 text-center">
                                    <h4>Score:</h4>
                                    <h5>${(match.status != "completed") ? "N/A" : score}</h5>
                                </div>
                            </div>
                        </div>
                    </div>`;
        }).join('');

        document.getElementById('app').innerHTML = `<div class="tournamentMatches container">
                                                        <div class="row justify-content-center mb-2">
                                                            <div class="col-xl-4 col-lg-6 col-md-8">
                                                                <div class="d-flex align-items-center my-3">
                                                                    <button type="button" id="goBackBtn" class="p-1 btn btn-dark me-3">
                                                                        <i id="goBack" class="bi bi-arrow-left-circle m-2"></i>
                                                                    </button>
                                                                    <h3 class="text-center">Tournament: ${tournamentData.name}</h3>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div class="row justify-content-center">
                                                            <div class="col-lg-4 col-md-6 col-sm-12 mb-3">
                                                                ${matches}
                                                            </div>
                                                        </div>
                                                    </div>`;

        const buttons = document.querySelectorAll('.tournamentMatches .btn-primary');
        buttons.forEach(button => {
            button.addEventListener('click', () => this.startMatch(button.getAttribute('data-match-id'), button.getAttribute('data-match-status')));
        });
        const opponentLinks = document.querySelectorAll('.tournamentMatches .opponent-link');
        opponentLinks.forEach(link => {
            link.addEventListener('click', event => {
                event.preventDefault();
                navigateTo(link.href);
            });
        });
    }

    async startMatch(matchId, matchStatus) {
        // //console.log(`match id: ${matchId}, match.status ${matchStatus}`);
        if (matchStatus && matchStatus !== "completed") {
            // //console.log(`Starting matchId: ${matchId}`);
            history.pushState('', '', `/match/${matchId}`);
            router();
        } else {
            //console.log(`Match ${matchId} is already completed.`);
        }
    }

    async createTournamentCard(tournament, currentUserId) {
        const card = document.createElement('div');
        card.setAttribute('class', 'card mb-2 p-1');
    
        const cardBody = document.createElement('div');
        cardBody.setAttribute('class', 'card-body');
    
        const cardTitle = document.createElement('h6');
        cardTitle.setAttribute('class', 'card-title');
        cardTitle.textContent = tournament.name;
    
        const cardText = document.createElement('p');
        cardText.setAttribute('class', 'card-text my-3');
        const players = await Promise.all(tournament.participants.map(participant => this.getParticipants(participant.user_id)));

        players.forEach((player, index) => {
            // //console.log(`currentUserId.user_id: ${currentUserId.user_id} player.id: ${player.id}`);
            let playerLink;
            playerLink = document.createElement('a');
            playerLink.setAttribute('href', `/profile/${player.id}`);
            playerLink.addEventListener('click', (event) => {
                event.preventDefault();
                //console.log(`clicking to id: ${player.id}`);
                navigateTo(event.target.href);
            });
            playerLink.textContent = player.username;
            cardText.appendChild(playerLink);
            if (index < players.length - 1) {
                playerLink.textContent += ", ";
            }
        });
    
        const joinButton = document.createElement('button');
        joinButton.id = `join-button-${tournament.id}`;
        joinButton.setAttribute('class', 'px-3 py-1 btn btn-outline-info');
        joinButton.textContent = 'Join';
    
        const spinner = document.createElement('span');
        spinner.id = `spinner-${tournament.id}`;
        spinner.className = 'spinner-border spinner-border-sm text-light';
        spinner.style.display = 'none';
    
        const userAlreadyJoined = tournament.participants.some(participant => participant.user_id === currentUserId.user_id);
        const isTournamentFull = tournament.status == "full";
    
        if (userAlreadyJoined && tournament.status != "finished") {
            if (isTournamentFull) {
                joinButton.setAttribute('class', 'px-3 py-1 btn btn-outline-success');
                joinButton.textContent = 'Play';
                joinButton.addEventListener('click', () => this.playTournament(tournament.id));
            } else {
                joinButton.setAttribute('class', 'px-3 py-1 btn btn-outline-secondary');
                joinButton.disabled = true;
                joinButton.textContent = 'Joined';
            }
        } else if (isTournamentFull) {
            joinButton.setAttribute('class', 'px-3 py-1 btn btn-outline-primary');
            joinButton.disabled = true;
            joinButton.textContent = 'In progress';
        } else if (tournament.status == "finished") {
            joinButton.setAttribute('class', 'px-3 py-1 btn btn-outline-warning');
            joinButton.textContent = 'Finished';
            joinButton.addEventListener('click', () => this.leaderboardTournament(tournament.id));
        } else {
            joinButton.addEventListener('click', () => this.joinTournament(tournament.id));
            joinButton.appendChild(spinner);
        }
    
        cardBody.appendChild(cardTitle);
        cardBody.appendChild(cardText);
        cardBody.appendChild(joinButton);
        card.appendChild(cardBody);
    
        return card;
    }

    async displayOpenTournaments(pageNumber = 1, pageSize = 3) {
        const openTournaments = await this.fetchOpenTournaments();
        const gameStatsDiv = document.getElementById('game-stats');

        gameStatsDiv.innerHTML = `<div class="row mb-2 align-items-center justify-content-center">
                                        <div class="col-2">
                                            <button type="button" id="goBackBtn" class="px-2 py-1 btn btn-dark">
                                                <i id="goBack" class="bi bi-arrow-left-circle"></i>
                                            </button>
                                        </div>
                                        <div class="col-10 text-start">
                                            <h3>Tournaments:</h3>
                                        </div>
                                    </div>`;
    
        if (openTournaments.length === 0) {
            gameStatsDiv.innerHTML += `<div class="row align-items-center justify-content-center">
                                            <div class="col-10">
                                                <h4 class="my-5">No tournaments available 🧐</h4>
                                            </div>
                                        </div>`;
            return;
        }
    
        const currentUserId = jwt_decode(localStorage.getItem('token'));
    
        const paginatedTournaments = openTournaments.slice((pageNumber - 1) * pageSize, pageNumber * pageSize);
    
        const tournamentContainer = document.createElement('div');
        tournamentContainer.setAttribute('class', 'row justify-content-center');
    
        await Promise.all(paginatedTournaments.map(async tournament => {
            const col = document.createElement('div');
            col.setAttribute('class', 'col-8');
    
            const card = await this.createTournamentCard(tournament, currentUserId);
            col.appendChild(card);
            tournamentContainer.appendChild(col);
        }));
    
        gameStatsDiv.appendChild(tournamentContainer);

        const totalPages = Math.ceil(openTournaments.length / pageSize);
        const pagination = document.createElement('ul');
        pagination.setAttribute('class', 'pagination justify-content-center mt-3');

        this.createPaginationItem('<<', (pageNumber > 1), () => this.displayOpenTournaments(pageNumber - 1, pageSize), pagination, false);

        const maxVisiblePages = 3;
        const startPage = Math.max(1, pageNumber - Math.floor(maxVisiblePages / 2));
        const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

        for (let i = startPage; i <= endPage; i++) {
            this.createPaginationItem(i, i === pageNumber, () => this.displayOpenTournaments(i, pageSize), pagination, true);
        }

        this.createPaginationItem('>>', (pageNumber < totalPages), () => this.displayOpenTournaments(pageNumber + 1, pageSize), pagination, false);

        gameStatsDiv.appendChild(pagination);
    }

    createPaginationItem(content, enabled, onClick, parentElement, pageItem) {
        const item = document.createElement('li');
        item.setAttribute('class', (enabled || pageItem) ? 'page-item' : 'page-item disabled');
        if (enabled && pageItem)
            item.classList.add('active'), item.classList.add('disabled');

        const link = document.createElement('a');
        link.setAttribute('class', 'page-link');
        link.style.cursor = 'pointer';
        link.textContent = content;
        if (enabled || pageItem)
            link.addEventListener('click', onClick);
        item.appendChild(link);
        parentElement.appendChild(item);
    }

}