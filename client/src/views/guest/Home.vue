<script setup>
import { onMounted, ref } from 'vue';
import { toast } from 'vue-sonner';
import { api } from '@/lib/api';
import BookShelf from '@/components/guest/BookShelf.vue';

const cachekey = 'guest-bookshelf';
const books = ref([]);
const loading = ref(true);
const loaderror = ref(false);

async function loadbooks(refresh = false) {
    loading.value = true;
    loaderror.value = false;

    if (!refresh) {
        try {
            const cached = JSON.parse(localStorage.getItem(cachekey));
            if (Array.isArray(cached) && cached.every(book => book && typeof book.id === 'string' && typeof book.title === 'string')) {
                books.value = cached;
                loading.value = false;
                return;
            }
        } catch {
            //@1ejun6 > storage can be unavailable or contain invalid data > fetch books instead
        }
    }

    const toastid = toast.loading('loading books');
    try {
        const response = await api('/books', { query: { limit: 5, status: 'available' } });
        if (!Array.isArray(response.books)) throw new Error('could not load books > please try again');
        books.value = response.books;
        try {
            localStorage.setItem(cachekey, JSON.stringify(books.value));
        } catch {
            //@1ejun6 > books still display when browser storage is unavailable
        }
        if (!books.value.length) toast.info('no books available yet');
        else if (refresh) toast.success('books refreshed');
    } catch (error) {
        loaderror.value = true;
        toast.error(error.message || 'could not load books > please try again', {
            duration: Infinity,
            action: { label: 'retry', onClick: () => loadbooks(true) },
        });
    } finally {
        toast.dismiss(toastid);
        loading.value = false;
    }
}

onMounted(loadbooks);
</script>

<template>
    <section class="mx-auto w-full max-w-xl content-center">
        <!--@1ejun6 > text gaps stay compact > give bookshelf a clearer separation -->
        <div class="space-y-5 text-center">
            <div class="grid gap-2.5">
                <p class="text-sm">from our shelves to yours</p>
                <h1 class="text-6xl">Different shelves<br>Shared stories</h1>
                <p class="text-sm">which one feels like your next chapter?</p>
            </div>
            <div v-if="!loaderror || books.length">
                <BookShelf :books="books" :isLoading="loading" />
            </div>
        </div>
    </section>
</template>
