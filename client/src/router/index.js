import { createRouter, createWebHistory } from 'vue-router';
import GuestHome from '../views/guest/Home.vue';
import CustomerHome from '../views/customer/Home.vue';
import AdminHome from '../views/admin/Home.vue';
import Login from '../views/Login.vue';
import Register from '../views/Register.vue';
import AdminBookInventory from '../views/admin/BookInventory.vue';
import { auth, role, homeRoute } from '@/lib/auth';
import { loadSession } from '@/lib/session';
import { toast } from 'vue-sonner';
import AppLayout from '@/layouts/AppLayout.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: AppLayout,
      children: [
        { path: '', name: 'guestHome', component: GuestHome, label: 'Browse Books', roles: ['guest'] },
        { path: 'login', name: 'login', component: Login, label: 'Login', roles: ['guest'], end: true },
        { path: 'register', name: 'register', component: Register, label: 'Create Account', roles: ['guest'] },
      ],
    },
    {
      path: '/customer',
      component: AppLayout,
      children: [
        { path: '', name: 'customerHome', component: CustomerHome, roles: ['customer'] },
      ],
    },
    
{
  path: '/customer',
  component: AppLayout,
  children: [
    // @sanjana I need to make the components still, so i havent included the components in this.
    { path: '', name: 'customerHome', component: CustomerHome, roles: ['customer']},
    { path: 'books', name: 'customerBooks', label: 'Browse Books', roles: ['customer']},
    { path: 'watchlist', name: 'customerWatchlist', label: 'Watchlist', roles: ['customer']},
    { path: 'adoptions', name: 'customerAdoptions',label: 'My Adoptions',roles: ['customer']},
    {path: 'pickups',name: 'customerPickups',label: 'Pickups', roles: ['customer']},
    {path: 'drives', name: 'customerDrives', label: 'Adoption Drives', roles: ['customer']},
    {path: 'account',name: 'customerAccount', label: 'My Account', roles: ['customer'], end: true}
  ]
},

  ],
});

//@1ejun6 > gets child pages from every route group &&& combines them into one list
const pages = router.options.routes.flatMap(group => group.children);

//@1ejun6 > ~to~ is destination route
router.beforeEach(async to => {
  const page = pages.find(page => page.name === to.name);
  try {
    await loadSession();
  } catch (error) {
    toast.error(error.message);
    if (page?.roles && !page.roles.includes('guest')) {
      return { name: 'login' };
    }
  }
  const allowed = !page?.roles || page.roles.includes(role.value);
  if (!allowed) { return auth.user ? homeRoute.value : { name: 'login' }; }
});

export { router, pages };
