<script setup>
import { ref, watch } from 'vue';
import { api } from '@/lib/api';
import BookShelf from '@/components/guest/BookShelf.vue';
import AppLocationFilter from '@/components/shared/AppLocationFilter.vue';
import AppBookIdentity from '@/components/shared/AppBookIdentity.vue';

//@ChitanyaBharathi > 2 separate filters > each keeps its own station ids
const bookStationIds = ref('');
const driveStationIds = ref('');
const books = ref([]);
const drives = ref([]);

//@ChitanyaBharathi > GET /books?mrtstationids=... > sort nearest puts closest first
watch(bookStationIds, async () => {
    books.value = bookStationIds.value
        ? (await api('/books', { query: { mrtstationids: bookStationIds.value, sort: 'nearest' } })).books
        : [];
});

//@ChitanyaBharathi > GET /drives?mrtstationids=... > same filter shape as books
watch(driveStationIds, async () => {
    drives.value = driveStationIds.value
        ? (await api('/drives', { query: { mrtstationids: driveStationIds.value, sort: 'nearest' } })).drives
        : [];
});
</script>

<template>
    <section class="mx-auto w-full max-w-xl content-center">
        <!--@ChitanyaBharathi > space-y-5 > even gap between every child > no margin on each one-->
        <div class="space-y-5 text-center">
            <p>From our shelves to yours</p>
            <h1 class="text-6xl">Different shelves<br>Shared stories</h1>
            <p>Which one feels like your next chapter?</p>
            <BookShelf />

            <div class="space-y-5 text-left">
                <h2>Find books nearby</h2>
                <AppLocationFilter v-model:station-ids="bookStationIds" />
                <p v-if="bookStationIds && !books.length">No books within this distance yet.</p>
                <ul class="space-y-2.5">
                    <li v-for="book in books" :key="book.id">
                        <AppBookIdentity :title="book.title" :author="(book.authors || []).join(', ')" :cover="book.coverurl" />
                        <small>Collect at {{ book.collectionarea }}</small>
                    </li>
                </ul>

                <h2>Find book drives nearby</h2>
                <AppLocationFilter v-model:station-ids="driveStationIds" />
                <p v-if="driveStationIds && !drives.length">No drives within this distance yet.</p>
                <ul class="space-y-2.5">
                    <li v-for="drive in drives" :key="drive.id">
                        <strong>{{ drive.title }}</strong>
                        <small>{{ drive.mrtstation?.name }} · {{ drive.eventdate }}</small>
                    </li>
                </ul>
            </div>
        </div>
    </section>
</template>
