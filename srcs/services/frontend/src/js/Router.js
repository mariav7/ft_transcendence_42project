import { LandingPage } from './LandingPage.js'
import { Login } from './Login.js'
import { Register } from './Register.js'
import { Profile } from './Profile.js'
import { Settings } from './Settings.js'
import { Dashboard } from './Dashboard.js';
import { MatchLobby } from './MatchLobby.js'
import { Match } from './Match.js'
import { LocalMatch } from './LocalMatch.js'
import { ErrorClass } from './ErrorClass.js'
import { Chat } from './Chat.js';
import { LoadProfile } from './LoadProfile.js'
import { Logout } from './Logout.js';
import Navbar from './Navbar.js';
import jwt_decode from 'jwt-decode';

export const routes = {
    '/' : {
        path : '/',
        view : LandingPage,
        auth : false
    },
    '/dashboard' : {
        path : '/dashboard',
        view : Dashboard,
        css : './css/dashboard.css',
        auth : true
    },
    '/login' : {
        path : '/login',
        view : Login,
        auth : false,
        css : './css/login.css'
    },
    '/register' : {
        path : '/register',
        view : Register,
        auth : false
    },
    '/profile' : {
        path : '/profile',
        view : Profile,
        auth : true,
        css : './css/profile.css'
    },
    '/settings' : {
        path : '/settings',
        view : Settings,
        auth : true,
        css : './css/settings.css'
    },
    '/chat' : {
        path : '/chat',
        view : Chat,
        auth : true,
        css : './css/chat.css'
    },
    '/match_lobby' : {
        path : '/match_lobby',
        view : MatchLobby,
        css : '../css/game.css',
        auth : true
    },
    '/match/:id' : {
        view : Match,
        dinamic : true,
        css : '../css/game.css',
        auth : true
    },
    '/profile/:id' : {
        view : LoadProfile,
        dinamic : true,
        auth : true,
        css : '../css/profile.css'
    },
    '/logout' : {
        path : '/logout',
        view : Logout,
        auth : true
    },
    '/localmatch/:id' : {
        view : LocalMatch,
        dinamic : true,
        css : '../css/game.css',
        auth : true
    }
}

export let onlineSocket = null;

export const connectUser = async () => {
    //console.log('CONNECT USERRRRRRRRRR');
    const token = localStorage.getItem('token');

    if (onlineSocket) {
        //console.log('WebSocket connection already open.');
        return;
    }

    if (token){
        const wsProtocol = process.env.PROTOCOL === 'https' ? 'wss:' : 'ws:';
        onlineSocket = new WebSocket(`${wsProtocol}//${process.env.HOST_IN_USE}:${process.env.BACKEND_PORT}/ws/notify/?token=${token}`);

            onlineSocket.onopen = function (e) {
                // //console.log('WebSocket connection established.');
                if (onlineSocket.readyState == WebSocket.OPEN){
                    onlineSocket.send(JSON.stringify({ type: 'send_notification', token: token }));
                }
                
            };
            onlineSocket.onmessage = function (e) {
                const data = JSON.parse(e.data);
                //console.log("RECEIVING NOTIFICATION", data);
                const message = data.message;
                const alertElement = document.getElementById('alert');
                const bellButton = document.getElementById('bellButton');
                alertElement.innerHTML += `<li">${message}</li><li><hr class="dropdown-divider"></li>`;
                const count = document.getElementById('bellCount');
                count.innerText = 'NEW!';
                document.getElementById('bellCount').style.backgroundColor = 'red';
            };
            onlineSocket.onclose = function (e) {
                //console.log('Socket closed unexpectedly');
                onlineSocket = null;
                // setTimeout(connectUser(), 1000)
            }; 
        // }

    }
}

// '/tournament/:id/match/:id' : {
//     path : '/tournament',
//     view :Tournament,
//     auth : true
// }

// Use the history API to prevent full page reload
export const navigateTo = (url) => {
    //console.log(`navigateTo called ${url}`);
    // event.preventDefault();
    history.pushState(null, null, url);
    router();
};

/* Explanation of the modified regular expression:
( ^ ) -> Match the start of the string.
( ${key.replace(/:[^\s/]+/g, '\\d+').replace(/\//g, '\\/')} ) -> This part constructs the regular expression.
    ( key.replace(/:[^\s/]+/g, '\\d+') ) -> This replaces any dynamic parameters (:id) with \\d+, which means "one or more digits". This ensures that only numerical values are accepted after the slash (/).
    ( replace(/\//g, '\\/') ) ->  This escapes any forward slashes (/) in the key to ensure they are treated as literal characters in the regular expression.
( \\/?$ ) -> Match an optional trailing slash at the end of the string.
( $ ) -> Match the end of the string.
*/

function findMatchingRoute(url) {
    for (const key in routes) {
        const regex = new RegExp(`^${key.replace(/:[^\s/]+/g, '\\d+').replace(/\//g, '\\/')}\\/?$`);
        if (regex.test(url)) {
            return key;
        }
    }
    return null;
}

let previousView = null;
let styleCss = null;
export const router = async () => {
    const appDiv = document.getElementById('app');
    appDiv.style = 'display: none;';

    const path = window.location.pathname;
    //console.log(`ROUTER path[${path}]`);
    const matchedRoute = findMatchingRoute(path);
    // //console.log(`matchedRoute: ${matchedRoute}`);
    const viewObject = routes[matchedRoute];

    let id = null;

    if (previousView && typeof previousView.cleanup === 'function') {
        // //console.log("CLEANING UP SHITTY EVENT LISTENERS");
        previousView.cleanup();
    }

    if (styleCss) {
        styleCss.remove();
        styleCss = null;
    }

    const token = localStorage.getItem('token');
    const auth = await checkAuthentication();
    if (auth)
        await connectUser();

    if (!viewObject) {
        //console.log("viewObject not found")
        const errorView = new ErrorClass();
        navbar.setIsAuthenticated(auth);
        document.getElementById('nav-bar').innerHTML = navbar.getHtml();
        appDiv.innerHTML = await errorView.getHtmlForMainNotFound();
        appDiv.style = 'display: block;';
        return;
    }

    if (viewObject.auth === true && (!token || auth === false)) {
        navigateTo("/");
        return;
    } else if (viewObject.auth === false && (token && auth === true)) {
        navigateTo("/dashboard");
        return;
    }

    if (viewObject.dinamic == true)
    {
        id = path.split('/')[2];
    }
    
    const view = new viewObject.view(id);
    previousView = view;

    if (viewObject.css) {
        await loadCss(viewObject.css);
    }

    appDiv.innerHTML = await view.getHtmlForMain();
    (viewObject.path === '/logout') ? navbar.setIsAuthenticated(false) : navbar.setIsAuthenticated(auth);
    document.getElementById('nav-bar').innerHTML = navbar.getHtml();
    appDiv.style = 'display: block;';
}

function loadCss(url) {
    return new Promise((resolve, reject) => {
        styleCss = document.createElement('link');
        styleCss.type = 'text/css';
        styleCss.rel = 'stylesheet';
        styleCss.href = url;
        styleCss.onload = resolve;
        styleCss.onerror = reject;
        //console.log(`url: ${url}, styleCss.href:${styleCss.href}`);
        document.head.appendChild(styleCss);
    });
}

async function checkAuthentication() {
    //console.log("checking authentication (Router.js)");
    const httpProtocol = process.env.PROTOCOL;

    try {
        const token = localStorage.getItem('token');

        if (!token) {
            throw false;
        }

        let decodedToken;
        try {
            decodedToken = jwt_decode(token);
        } catch (decodeError) {
            console.error('Error decoding token:', decodeError.message);
            throw false;
        }

        const response = await fetch(`${httpProtocol}://${process.env.HOST_IN_USE}:${process.env.BACKEND_PORT}/users/check-authentication/`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            // console.error('Error checking authentication:', response.statusText);
            throw false;
        }

        const data = await response.json();

        if ('authenticated' in data) {
            return data.authenticated;
        } else {
            // console.error('Invalid response format:', data);
            throw false;
        }
    } catch (error) {
        // console.error('Unexpected error checking authentication:', error);
        return false;
    }
}

// Removes token when browser closes without doing logout
// window.addEventListener('beforeunload', function(event) {
//     //console.log("beforeunload happening => removing token from localStorage");
//     localStorage.removeItem('token');
// });


let navbar = new Navbar();

document.addEventListener('DOMContentLoaded', () => {
    //console.log("DOM content loaded (Router.js)");
    router();
    // document.getElementById('nav-bar').innerHTML = navbar.getHtml();
    document.getElementById("bellButton").addEventListener("click", function() {
        var bellCountSpan = document.getElementById("bellCount");
        bellCountSpan.textContent = "";
    });
    document.getElementById('nav-bar').addEventListener('click', (event) => {
        if (event.target.tagName === 'A' && event.target.classList.contains('navbar-link')) {
            //console.log('LISTENER (Router.js) navbar button clicked: ', event.target);
            event.preventDefault();
            navigateTo(event.target);
        }
    }); 
});

// document.getElementById("bellButton").addEventListener("click", function() {
// var bellCountSpan = document.getElementById("bellCount");
// bellCountSpan.textContent = "";
// });
