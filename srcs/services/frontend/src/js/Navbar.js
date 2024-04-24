export default class Navbar {
    constructor() {
        //console.log("Navbar created!");
        this.isAuthenticated = false;
        this.updateNavbar();
    }

    setIsAuthenticated(flag) {
        this.isAuthenticated = flag;
    }

    updateNavbar() {
        const navbar = document.getElementById('nav-bar');
        const alert = document.getElementById('bellButton');
        //console.log("NAVBAR RENDERED:", document.getElementById('nav-bar'));

        if (this.isAuthenticated) {
            alert.style.display = 'block';
            navbar.innerHTML = `<a class="navbar-link" href="/profile">Profile</a>
                                <a class="navbar-link" href="/settings">Settings</a>
                                <a class="navbar-link" href="/dashboard">Dashboard</a>
                                <a class="navbar-link" href="/chat">Chat</a>
                                <a class="navbar-link" href="/logout">Log out</a>`;
        } else {
            
            alert.style.display = 'none';
            navbar.innerHTML = `<a class="navbar-link" href="/register">Sign up</a>
                                <a class="navbar-link" href="/login">Log in</a>`;
        }
    }

    getHtml() {
        this.updateNavbar();
        const navbar = document.getElementById('nav-bar');
        return navbar.innerHTML;
    }
}
