import { createRouter, createWebHistory } from 'vue-router';
import GuestHome from '../views/guest/Home.vue';
import CustomerAdoptionDrives from '../views/customer/AdoptionDrives.vue';
import CustomerAccount from '../views/customer/Account.vue';
import CustomerHome from '../views/customer/Home.vue';
import AdminHome from '../views/admin/Home.vue';
import Login from '../views/Login.vue';
import Register from '../views/Register.vue';
import AdminBookInventory from '../views/admin/BookInventory.vue';
import AdminAdoptionApplications from '../views/admin/AdoptionApplications.vue';
import AdminAppointments from '../views/admin/Appointments.vue';
import AdminDrives from '../views/admin/Drives.vue';
import GuestAdoptionDrives from '../views/guest/AdoptionDrives.vue';
import { auth, role, homeRoute } from '@/lib/auth';
import { loadSession } from '@/lib/session';
import { toast } from 'vue-sonner';
import AppLayout from '@/layouts/AppLayout.vue';
import CustomerWatchlist from '../views/customer/Watchlist.vue';
import CustomerBrowseBooks from '../views/customer/BrowseBooks.vue';
import MyAdoptions from '../views/customer/MyAdoptions.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: AppLayout,
      children: [
        { path: 'sample', name: 'adoptionSample', component: () => import('../views/AdoptionSample.vue'), meta: { preview: true } },
        { path: '', name: 'guestHome', component: GuestHome, label: 'Browse Books', roles: ['guest'] },
        { path: 'drives', name: 'guestDrives', component: GuestAdoptionDrives, label: 'Adoption Drives', roles: ['guest'] },
        { path: 'login', name: 'login', component: Login, label: 'Login', roles: ['guest'], end: true },
        { path: 'register', name: 'register', component: Register, label: 'Create Account', roles: ['guest'] },
      ],
    },
    {
      path: '/customer',
      component: AppLayout,
      children: [
        { path: '', name: 'customerHome', component: CustomerHome, roles: ['customer'] },
        { path: 'books', name: 'customerBooks', component: CustomerBrowseBooks, label: 'Browse Books', roles: ['customer']},
        { path: 'watchlist', name: 'customerWatchlist', component: CustomerWatchlist, label: 'Watchlist', roles: ['customer']},
        { path: 'adoption', name: 'customerAdoptions',component: MyAdoptions, label: 'My Adoptions',roles: ['customer']},
        { path: 'adoptions', redirect: to => ({ name: 'customerAdoptions', query: to.query, hash: to.hash }) },
        {path: 'drives', name: 'customerDrives', component: CustomerAdoptionDrives, label: 'Adoption Drives', roles: ['customer']},
        {path: 'account',name: 'customerAccount', component: CustomerAccount, label: 'Account', roles: ['customer'], end: true}
      ]
    },
    {
      path: '/admin',
      component: AppLayout,
      children: [
        { path: '', name: 'adminHome', component: AdminHome, label: 'Home', roles: ['admin'] },
        { path: 'books', name: 'adminBooks', component: AdminBookInventory, label: 'Book Inventory', roles: ['admin'] },
        { path: 'applications', name: 'adminApplications', component: AdminAdoptionApplications, label: 'Adoption Applications', roles: ['admin'] },
        { path: 'appointments', name: 'adminAppointments', component: AdminAppointments, label: 'Appointments', roles: ['admin'] },
        { path: 'drives', name: 'adminDrives', component: AdminDrives, label: 'Drives', roles: ['admin'] },
      ],
    }
  ]
});

//@1ejun6 > gets child pages from every route group & combines them into one list
const pages = router.options.routes.flatMap(group => group.children);

//@1ejun6 > ~to~ is destination route
router.beforeEach(async to => {
  if (to.meta.preview) return true;
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
