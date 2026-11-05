<script setup>
import CustomerBookCard from '@/components/customer/CustomerBookCard.vue';

defineProps({
  book: { type: Object, required: true },
  busy: { type: Boolean, default: false },
  saving: { type: Boolean, default: false },
  requestId: { type: String, default: '' },
});
defineEmits(['preview', 'remove']);
</script>

<template>
  <CustomerBookCard :book="book" variant="watchlist" :busy="busy" :saving="saving" :requestId="requestId"
    @preview="$emit('preview', $event)" @remove="$emit('remove', book)" />
</template>
