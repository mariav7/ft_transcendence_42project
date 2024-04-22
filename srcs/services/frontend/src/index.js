import 'bootstrap/dist/css/bootstrap.css';
// import 'bootstrap/js/dist/collapse';
import 'bootstrap-icons/font/bootstrap-icons.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';

/*Import classes*/
import { router } from './js/Router.js';

window.addEventListener("popstate", () => {
    //console.log("POPSTATE (index.js)");
    router();
});

window.addEventListener("onpopstate", () => {
    //console.log("ON POPSTATE (index.js)");
    router();
});
