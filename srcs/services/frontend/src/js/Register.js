import { BaseClass } from './BaseClass';
import { router } from './Router';

export class Register extends BaseClass
{
    constructor() {
        super();
        this.addDocumentClickListener();
    }

    getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
    }

    hideMessage(id) {
        const alertElement = document.getElementById("redWarning");
        if (!alertElement)
            return;
        alertElement.textContent = '';
        alertElement.style.display = 'none';
    }

    displayMessage(message, flag) {
        const id = (flag) ? ".alert-success" : ".alert-danger";
        const alertElement = document.getElementById("redWarning");
        alertElement.textContent = message;
        alertElement.style.display = 'block';
        setTimeout(() => {
            this.hideMessage(id);
        }, 1500);
    }

    async handleDocumentClick(event) {
        if (event.target.id === 'register') {
            event.preventDefault();
            await this.handleButtonClick(event);
        }
    }

    async handleButtonClick(event) {
        //console.log("We are at submitRegister!");
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const email = document.getElementById('email').value;
        
        try {
            const response = await fetch(`${this.httpProtocol}://${this.host}:${this.backendPort}/users/register/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': this.getCookie('csrftoken'), // Include CSRF token
                },
                body: JSON.stringify({ username, email, password }),
            });
    
            if (!response.ok) {
                let responseData = await response.text(); // Get response text
                const errorData = JSON.parse(responseData);
                let formattedErrorMsg = '';
                for (const [key, value] of Object.entries(errorData)) {
                    if (Array.isArray(value)) {
                        formattedErrorMsg += `${key}: ${value.join(', ')}\n`;
                    } else {
                        formattedErrorMsg += `${key}: ${value}\n`;
                    }
                }
                this.displayMessage(formattedErrorMsg, false);
                throw new Error('Invalid credentials');
            }
            const data = await response.json();
            history.pushState({}, '', '/login');
            router();
        } catch (error) {
            console.error('ERROR : ', error);
        }
    }

    async getHtmlForMain() {
        return `<h1 class="mb-3">Sign-up</h1>
                <div class="form-group">
                    <form id="loginForm" class="text-start">
                        <div class="row my-3 justify-content-center">
                            <div class="col-xl-4 col-lg-6 col-md-8">
                                <label for="username">Username:</label>
                                <input class="form-control form-control-sm" type="text" id="username" name="username" required placeholder="Enter username" autocomplete="username">
                            </div>
                        </div>
                        <div class="row my-3 justify-content-center">
                            <div class="col-xl-4 col-lg-6 col-md-8">
                                <label for="email">E-mail:</label>
                                <input class="form-control form-control-sm" type="email" id="email" name="email" required placeholder="Enter e-mail">
                            </div>
                        </div>
                        <div class="row my-3 justify-content-center">
                            <div class="col-xl-4 col-lg-6 col-md-8">
                                <label for="password">Password:</label>
                                <input class="form-control form-control-sm" type="password" id="password" name="password" required placeholder="Password" autocomplete="current-password">
                            </div>
                        </div>
                        <div class="row m-2 text-center justify-content-center">
                            <div class="col-lg-6 col-md-8">
                                <button type="submit" id="register" class="p-1 btn btn-dark">Sign-up</button>
                                <div id="redWarning" class="my-2 alert alert-danger" role="alert" style="display :none;"></div>
                            </div>
                        </div>
                    </form>
                </div>`;
    }
}