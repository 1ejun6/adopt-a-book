<script setup>
import BookShelf from '@/components/books/BookShelf.vue';
defineProps({ books: { type: Array, default: () => [] }, loading: Boolean, savedIds: { type: Set, default: () => new Set() } });
defineEmits(['select']);
</script>
<template><BookShelf :books="books" :loading="loading" :savedIds="savedIds" @select="$emit('select', $event)" /></template>
