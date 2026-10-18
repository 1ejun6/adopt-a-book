import { createRouter, createWebHistory } from 'vue-router';
import GuestHome from '../views/GuestCustomerHome.vue';
import Login from '../views/Login.vue';
import Register from '../views/Register.vue';
import BrowseBooks from '../views/BrowseBooks.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'guest-home', component: GuestHome },
    { path: '/login', name: 'login', component: Login },
    { path: '/register', name: 'register', component: Register },
    { path: '/books', name: 'browse-books', component: BrowseBooks },
  ],
});

export { router };
