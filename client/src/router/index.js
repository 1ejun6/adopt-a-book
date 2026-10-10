import { createRouter, createWebHistory } from 'vue-router';
import GuestHome from '../views/GuestCustomerHome.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [{ path: '/', name: 'guest-home', component: GuestHome }]
});

export { router };
