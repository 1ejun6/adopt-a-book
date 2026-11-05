<script setup>
import BookShelf from '@/components/books/BookShelf.vue';
defineProps({ books: { type: Array, default: () => [] }, isLoading: Boolean });
defineEmits(['select']);
</script>
<template><BookShelf :books="books" :loading="isLoading" @select="$emit('select', $event)" /></template>
