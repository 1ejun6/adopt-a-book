import { createRouter, createWebHistory } from 'vue-router';
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
        { path: 'sample', name: 'adoptionSample', component: () => import('../views/AdoptionSample.vue'), meta: { preview: true } },
        { path: '', name: 'guestHome', component: () => import('../views/guest/Home.vue'), label: 'Browse Books', roles: ['guest'] },
        { path: 'drives', name: 'guestDrives', component: () => import('../views/guest/AdoptionDrives.vue'), label: 'Adoption Drives', roles: ['guest'] },
        { path: 'login', name: 'login', component: () => import('../views/Login.vue'), label: 'Login', roles: ['guest'], end: true },
        { path: 'register', name: 'register', component: () => import('../views/Register.vue'), label: 'Create Account', roles: ['guest'] },
      ],
    },
    {
      path: '/customer',
      component: AppLayout,
      children: [
        { path: '', name: 'customerHome', component: () => import('../views/customer/Home.vue'), roles: ['customer'] },
        { path: 'books', name: 'customerBooks', component: () => import('../views/customer/BrowseBooks.vue'), label: 'Browse Books', roles: ['customer']},
        { path: 'watchlist', name: 'customerWatchlist', component: () => import('../views/customer/Watchlist.vue'), label: 'Watchlist', roles: ['customer']},
        { path: 'adoption', name: 'customerAdoptions',component: () => import('../views/customer/MyAdoptions.vue'), label: 'My Adoptions',roles: ['customer']},
        { path: 'adoptions', redirect: to => ({ name: 'customerAdoptions', query: to.query, hash: to.hash }) },
        {path: 'drives', name: 'customerDrives', component: () => import('../views/customer/AdoptionDrives.vue'), label: 'Adoption Drives', roles: ['customer']},
        {path: 'account',name: 'customerAccount', component: () => import('../views/customer/Account.vue'), label: 'Account', roles: ['customer'], end: true}
      ]
    },
    {
      path: '/admin',
      component: AppLayout,
      children: [
        { path: '', name: 'adminHome', component: () => import('../views/admin/Home.vue'), label: 'Home', roles: ['admin'] },
        { path: 'books', name: 'adminBooks', component: () => import('../views/admin/BookInventory.vue'), label: 'Book Inventory', roles: ['admin'] },
        { path: 'applications', name: 'adminApplications', component: () => import('../views/admin/AdoptionApplications.vue'), label: 'Adoption Applications', roles: ['admin'] },
        { path: 'appointments', name: 'adminAppointments', component: () => import('../views/admin/Appointments.vue'), label: 'Appointments', roles: ['admin'] },
        { path: 'drives', name: 'adminDrives', component: () => import('../views/admin/Drives.vue'), label: 'Drives', roles: ['admin'] },
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
