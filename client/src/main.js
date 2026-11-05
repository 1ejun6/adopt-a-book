import './assets/main.css';

import { watch } from 'vue';
import { useAuthStore } from './stores/auth';
import { useAdoptionsStore } from './stores/adoptions';
import { useWatchlistStore } from './stores/watchlist';
import { registerUnauthorizedHandler, invalidateApiSession } from './lib/api';
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import HugeiconsPlugin from '@hugeicons/vue';

import App from './App.vue';
import { router } from './router';

const app = createApp(App);
const pinia = createPinia();
app.use(pinia);
const auth = useAuthStore(pinia);
const adoptions = useAdoptionsStore(pinia);
const watchlist = useWatchlistStore(pinia);
registerUnauthorizedHandler(() => auth.clearSession());
watch(() => auth.user?.id, () => { invalidateApiSession(); watchlist.reset(); adoptions.reset(); }, { flush: 'sync' });
app.use(HugeiconsPlugin);
app.use(router);
app.mount('#app');
