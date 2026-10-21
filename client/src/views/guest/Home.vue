<script setup>
import BookShelf from '@/components/guest/BookShelf.vue';
</script>

<template>
    <section class="mx-auto w-full max-w-xl content-center">
        <!--@ChitanyaBharathi > space-y-5 > even gap between every child > no margin on each one-->
        <div class="space-y-5 text-center">
            <p>From our shelves to yours</p>
            <h1 class="text-6xl">Different shelves<br>Shared stories</h1>
            <p>Which one feels like your next chapter?</p>
            <BookShelf />
        </div>
    </section>
</template>
