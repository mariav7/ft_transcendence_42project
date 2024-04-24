import 'bootstrap/dist/css/bootstrap.css';
import 'bootstrap-icons/font/bootstrap-icons.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';

import { router } from './js/Router.js';

window.addEventListener("popstate", () => {
    router();
});

window.addEventListener("onpopstate", () => {
    router();
});
