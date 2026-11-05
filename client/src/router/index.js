import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { toast } from 'vue-sonner';
import AppLayout from '@/layouts/AppLayout.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: AppLayout,
      children: [
        { path: '/:pathMatch(.*)*', name: 'notFound', component: () => import('../views/NotFound.vue') },
        { path: 'sample', name: 'adoptionSample', component: () => import('../views/AdoptionSample.vue'), meta: { preview: true } },
        { path: '', name: 'guestHome', component: () => import('../views/guest/Home.vue'), label: 'Browse Books', meta: { roles: ['guest'] } },
        { path: 'drives', name: 'guestDrives', component: () => import('../views/guest/AdoptionDrives.vue'), label: 'Adoption Drives', meta: { roles: ['guest'] } },
        { path: 'login', name: 'login', component: () => import('../views/Login.vue'), label: 'Login', meta: { roles: ['guest'] }, end: true },
        { path: 'register', name: 'register', component: () => import('../views/Register.vue'), label: 'Create Account', meta: { roles: ['guest'] } },
      ],
    },
    {
      path: '/customer',
      component: AppLayout,
      children: [
        { path: '', name: 'customerHome', component: () => import('../views/customer/Home.vue'), meta: { roles: ['customer'] } },
        { path: 'books', name: 'customerBooks', component: () => import('../views/customer/BrowseBooks.vue'), label: 'Browse Books', meta: { roles: ['customer'] } },
        { path: 'watchlist', name: 'customerWatchlist', component: () => import('../views/customer/Watchlist.vue'), label: 'Watchlist', meta: { roles: ['customer'] } },
        { path: 'adoptions', name: 'customerAdoptions', component: () => import('../views/customer/MyAdoptions.vue'), label: 'My Adoptions', meta: { roles: ['customer'] } },
        { path: 'drives', name: 'customerDrives', component: () => import('../views/customer/AdoptionDrives.vue'), label: 'Adoption Drives', meta: { roles: ['customer'] } },
        { path: 'account', name: 'customerAccount', component: () => import('../views/customer/Account.vue'), label: 'Account', meta: { roles: ['customer'] }, end: true },
      ],
    },
    {
      path: '/admin',
      component: AppLayout,
      children: [
        { path: '', name: 'adminHome', component: () => import('../views/admin/Home.vue'), label: 'Home', meta: { roles: ['admin'] } },
        { path: 'books', name: 'adminBooks', component: () => import('../views/admin/BookInventory.vue'), label: 'Book Inventory', meta: { roles: ['admin'] } },
        { path: 'applications', name: 'adminApplications', component: () => import('../views/admin/AdoptionApplications.vue'), label: 'Adoption Applications', meta: { roles: ['admin'] } },
        { path: 'appointments', name: 'adminAppointments', component: () => import('../views/admin/Appointments.vue'), label: 'Appointments', meta: { roles: ['admin'] } },
        { path: 'drives', name: 'adminDrives', component: () => import('../views/admin/Drives.vue'), label: 'Drives', meta: { roles: ['admin'] } },
      ],
    },
  ],
});

//@1ejun6 > gets child pages from every route group & combines them into one list
const pages = router.options.routes.flatMap((group) => group.children);

export function loginDestination(target, auth = useAuthStore()) {
  if (typeof target !== 'string' || !target.startsWith('/') || target.startsWith('//') || /[\\\s]/.test(target)) return auth.homeRoute;
  const resolved = router.resolve(target);
  if (resolved.name === 'notFound' || !resolved.matched.length || !resolved.meta.roles?.includes(auth.role)) return auth.homeRoute;
  return resolved.fullPath;
}

router.beforeEach(async (to) => {
  if (to.meta.preview) return true;
  const auth = useAuthStore();
  const login = { name: 'login', query: { redirect: to.fullPath } };
  try {
    await auth.loadSession();
  } catch (error) {
    toast.error(error.message);
    if (to.meta.roles && !to.meta.roles.includes('guest')) return login;
    return true;
  }
  if (to.meta.roles && !to.meta.roles.includes(auth.role)) return auth.isLoggedIn ? auth.homeRoute : login;
});

export { router, pages };
