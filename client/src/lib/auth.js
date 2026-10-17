import { computed, reactive } from 'vue';

export const auth = reactive({ user: null, ready: false });
//@1ejun6 > updates when user changes > ?. safely reads role if user exists > || uses guest when no role exists
export const role = computed(() => auth.user?.role || 'guest');
//@1ejun6 > role.value > reads computed role in javascript > admin goes to admin home > everyone else goes to guest home
//@1ejun6 > name > matches route name in ~router/index.js~ > export lets other files import these shared values
export const homeRoute = computed(() => ({ name: role.value === 'admin' ? 'adminBooks' : 'guestHome' }));
