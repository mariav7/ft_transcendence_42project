import { BaseClass } from './BaseClass';

export class LandingPage extends BaseClass
{
    constructor() {
        super();
    }

    run() {
        throw new Error("Method 'run()' must be implemented.");
    }

    getHtmlForMain() {
        return `
        <div class="container" id="welcome">
            <p class="welcometitle p-0 text-center">pong</p> 
        <div class="row">

            <div class="col-5 p-3">
            
            </div>

            <div class="col-7">
            Welcome to our 42_transcendence.<br> This project was made with blood, sweat and tears. Sign-up or login to start playing a crazy, groundbreaking and above-all, revolutionary game of pong.
            </div>




            </div>
        </div>`
    }
}