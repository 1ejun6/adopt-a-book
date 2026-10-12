<script setup>
import { Book02Icon } from '@hugeicons/core-free-icons';
import { Skeleton } from '@/components/ui/skeleton';

const props = defineProps({
    title: {type: String},
    author: {type: String},
    cover: {type: String},
    compact: {type: Boolean, default: false}, // lee-hlmilk > for compact state
    loading: {type: Boolean} // lee-hlmilk > for loading skeleton if we using
});

</script>

<template>
    <!-- loading -->
    <div v-if="props.loading" class="flex items-center gap-3 min-w-0" aria-busy="true" role="status">
        <Skeleton class="shrink-0 aspect-[2/3] rounded" :class="compact ? 'w-9' : 'w-12'"></Skeleton>
        <div class="min-w-0 flex flex-col justify-center gap-1.5">
            <Skeleton class="h-4 w-28"></Skeleton>
            <Skeleton class="h-3 w-16"></Skeleton>
        </div>
    </div>

    <!-- ready -->
    <div v-else class="flex items-center gap-3 min-w-0" data-slot="book-identity">
        <!-- 2:3 cover aspect ratio for book cover url -->
        <img v-if="props.cover" :src="props.cover" class="shrink-0 aspect-[2/3] rounded object-cover shadow-xs border border-border" :class="compact ? 'w-9' : 'w-12'" draggable="false" />
        <!-- fallback to placeholder, referenced from wireframe -->
        <div v-else class="shrink-0 aspect-[2/3] rounded bg-muted border border-border flex items-center justify-center text-muted-foreground" :class="compact ? 'w-9' : 'w-12'" role="img">
            <HugeiconsIcon :icon="Book02Icon" :class="compact ? 'size-4' : 'size-5'" aria-hidden="true"></HugeiconsIcon>
        </div>
        <div class="min-w-0 flex flex-col justify-center">
            <strong class="font-heading font-normal text-foreground truncate leading-snug" :class="compact ? 'text-base' : 'text-lg'">{{ props.title }}</strong>
            <small class="text-xs text-muted-foreground truncate">{{ props.author }}</small>
        </div>
    </div>
</template>