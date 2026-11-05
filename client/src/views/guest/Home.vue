<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { Button } from '@/components/ui/button';
import { toast } from 'vue-sonner';
import { api } from '@/lib/api';
import BookShelf from '@/components/books/BookShelf.vue';

import AppBookPreviewDialog from '@/components/shared/AppBookPreviewDialog.vue';
const selectedbook = ref(null), dialogopen = ref(false);
const router = useRouter();
//@lee-hlmilk > return to the exact physical copy after authentication > opening it never sends a request
const bookDestination = computed(() => router.resolve({ name: 'customerBooks', query: { book: selectedbook.value?.id } }).fullPath);
const cachekey = 'guest-bookshelf';
const books = ref([]);
const loading = ref(true);
const loaderror = ref(false);

async function loadbooks(refresh = false) {
    if (loading.value && books.value.length && refresh) return;
    loading.value = true;
    loaderror.value = false;

    if (!refresh) {
        try {
            const cached = JSON.parse(localStorage.getItem(cachekey));
            if (Array.isArray(cached) && cached.every(book => book && typeof book.id === 'string' && typeof book.title === 'string')) {
                books.value = cached;

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
                <h1 class="text-4xl sm:text-5xl">Different shelves<br>Shared stories</h1>
                <p class="text-sm">which one feels like your next chapter?</p>
            </div>
            <div v-if="!loaderror || books.length">
                <BookShelf :books="books" :loading="loading && !books.length" @select="selectedbook = $event; dialogopen = true" />
            </div>
            <p v-if="loaderror" role="alert">Could not refresh books. <button class="underline min-h-11" :disabled="loading" @click="loadbooks(true)">Retry</button></p>
        </div>
        <AppBookPreviewDialog v-model:open="dialogopen" :book="selectedbook">
            <template #actions>
                <Button asChild><RouterLink :to="{ name: 'login', query: { redirect: bookDestination } }">Log in to request</RouterLink></Button>
                <Button asChild variant="outline"><RouterLink :to="{ name: 'register', query: { redirect: bookDestination } }">Create an account</RouterLink></Button>
            </template>
        </AppBookPreviewDialog>
    </section>
</template>
