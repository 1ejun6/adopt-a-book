import { createRouter, createWebHistory } from 'vue-router';
import GuestHome from '../views/GuestCustomerHome.vue';
import Login from '../views/Login.vue';
import Register from '../views/Register.vue';
import AdminBook from '../views/AdminBooks.vue';
import ErrorPage from '../components/ErrorPage.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'guest-home', component: GuestHome },
    { path: '/login', name: 'login', component: Login },
    { path: '/register', name: 'register', component: Register },
    {
      path: '/error',
      name: 'error-preview',
      component: ErrorPage,
      props: { message: 'We couldn’t load this page. Please try again.' },
    },
    { path: '/admin/book', name: 'adminbooks', component: AdminBook}
  ],
});

export { router };
