import { createRouter, createWebHistory } from 'vue-router';
import GuestHome from '../views/GuestCustomerHome.vue';
import Login from '../views/Login.vue';
import Register from '../views/Register.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'guest-home', component: GuestHome },
    { path: '/login', name: 'login', component: Login },
    { path: '/register', name: 'register', component: Register },
  ],
});

export { router };
