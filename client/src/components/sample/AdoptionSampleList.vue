<script setup>
import CustomerAdoptionCard from '@/components/customer/CustomerAdoptionCard.vue';
defineProps({ groups: { type: Array, required: true }, grouped: Boolean, connected: Boolean, collapsible: Boolean });
const emit = defineEmits(['open']);
</script>

<template>
  <div class="sample-list" :class="{ 'sample-list--connected': connected }">
    <template v-for="group in groups" :key="group.key">
      <component :is="collapsible ? 'details' : 'section'" :open="collapsible ? true : undefined" class="sample-group">
        <component :is="collapsible ? 'summary' : 'div'" v-if="grouped" class="sample-group-heading">
          <span class="sample-group-heading__copy"><span class="sample-group-title">{{ group.title }} <span class="sample-group-count">{{ group.rows.length }}</span></span><span v-if="group.hint" class="sample-group-hint">{{ group.hint }}</span></span>
          <span v-if="collapsible" class="sample-group-toggle" aria-hidden="true">⌄</span>
        </component>
        <div class="adoption-columns adoption-column-headings sample-columns" aria-hidden="true"><span>Book</span><span>Status</span><span>Pickup · SGT</span><span /></div>
        <div class="sample-rows">
          <CustomerAdoptionCard v-for="record in group.rows" :key="record.id" :record="record" groupedOverdueWarning @details="emit('open', record)" @pickup="emit('open', record)" />
        </div>
      </component>
    </template>
  </div>
</template>

<style scoped>
.sample-list { display: grid; gap: 28px; }
.sample-columns { margin-bottom: 8px; }
.sample-rows { display: grid; gap: 8px; }
.sample-list--connected .sample-rows { gap: 0; border: 1px solid var(--border); border-radius: 12px; }
.sample-list--connected :deep(.adoption-row) { border: 0; border-bottom: 1px solid var(--border); border-radius: 0; min-height: 82px; }
.sample-list--connected :deep(.adoption-row:first-child) { border-radius: 12px 12px 0 0; }
.sample-list--connected :deep(.adoption-row:last-child) { border-bottom: 0; border-radius: 0 0 12px 12px; }
.sample-group-heading { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding: 0 2px 14px; }
summary.sample-group-heading { cursor: pointer; list-style: none; min-height: 44px; }
summary.sample-group-heading::-webkit-details-marker { display: none; }
.sample-group-heading__copy { display: grid; gap: 4px; }
.sample-group-title { font-family: var(--font-heading); font-size: 22px; line-height: 1.3; }
.sample-group-count { color: var(--muted-foreground); font-family: var(--font-body); font-size: 12px; margin-left: 6px; }
.sample-group-hint { font-size: 13px; line-height: 1.6; color: var(--muted-foreground); }
.sample-group-toggle { font: 22px system-ui; }
details:not([open]) .sample-group-toggle { transform: rotate(-90deg); }
details:not([open]) { border-bottom: 1px solid var(--border); }
@media (max-width: 639px) { .sample-group-title { font-size: 20px; } }
</style>
