export class BaseClass {
    constructor() {
        if (this.constructor === BaseClass) {
            throw new Error("Cannot instantiate abstract class.");
        }
        // this.httpProtocol = window.location.protocol;
        this.httpProtocol = process.env.PROTOCOL;
        this.host = process.env.HOST_IN_USE;
        this.backendPort = process.env.BACKEND_PORT;
        this.frontendPort = process.env.FRONTEND_PORT;
    }

    getHtmlForMain() {
        throw new Error("Method 'getHtmlForMain()' must be implemented.");
    }

    addDocumentClickListener() {
        // //console.log("BaseClass adding eventListener");
        this.handleDocumentClickBound = this.handleDocumentClick.bind(this);
        document.getElementById('app').addEventListener('click', this.handleDocumentClickBound);
    }

    removeDocumentClickListener() {
        // //console.log("BaseClass removing eventListener");
        document.getElementById('app').removeEventListener('click', this.handleDocumentClickBound);
    }

    async handleDocumentClick(event) {
        // //console.log("BaseClass handleDocumentClick");
        return;
    }

    cleanup() {
        // //console.log("BaseClass cleanup");
        this.removeDocumentClickListener();
    }
}