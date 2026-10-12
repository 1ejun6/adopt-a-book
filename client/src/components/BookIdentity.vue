<script setup>
import { ref } from 'vue';
import { Book02Icon } from '@hugeicons/core-free-icons';
import { Skeleton } from '@/components/ui/skeleton';

const props = defineProps({
    title: {type: String},
    author: {type: String},
    cover: {type: String},
    compact: {type: Boolean, default: false}, // lee-hlmilk > for compact state
    loading: {type: Boolean} // lee-hlmilk > for loading skeleton if we using
});

const coverFailed = ref(false);

</script>

<template>
    <!-- lee-hlmilk > loading state, min-w-0 allows component to shrink -->
    <div v-if="props.loading" class="flex items-center gap-3 min-w-0" aria-busy="true" role="status">
        <!-- lee-hlmilk > prevent cover from shrinking, keep 2:3 book proportions -->
        <Skeleton class="shrink-0 aspect-[2/3] rounded" :class="compact ? 'w-9' : 'w-12'"></Skeleton>
        <!-- lee-hlmilk > allow text area to shrink -->
        <div class="min-w-0 flex flex-col gap-1.5">
            <!-- lee-hlmilk > imitate a title with smaller author text -->
            <Skeleton class="h-4 w-28"></Skeleton>
            <Skeleton class="h-3 w-16"></Skeleton>
        </div>
    </div>

    <!-- lee-hlmilk > ready state uses same cover/text alignment and spacing as loading state -->
    <div v-else class="flex items-center gap-3 min-w-0" data-slot="book-identity">
        <!-- lee-hlmilk > object-cover fills cover area without stretching image, subtle shadow > error switches failed cover to placeholder -->
        <img v-if="props.cover && !coverFailed" :key="props.cover" :src="props.cover" class="shrink-0 aspect-[2/3] rounded object-cover shadow-xs border" :class="compact ? 'w-9' : 'w-12'" draggable="false" @error="coverFailed = true" />
        <!-- lee-hlmilk > same placeholder for missing or failed cover URL, referenced from wireframe, keep same cover dimensions, centre icon -->
        <div v-else class="shrink-0 aspect-[2/3] rounded bg-muted border flex items-center justify-center text-muted-foreground" :class="compact ? 'w-9' : 'w-12'" role="img">
            <!-- lee-hlmilk > smaller icon for compact cover, larger icon for normal cover -->
            <HugeiconsIcon :icon="Book02Icon" :class="compact ? 'size-4' : 'size-5'" aria-hidden="true"></HugeiconsIcon>
        </div>
        <!-- lee-hlmilk > min-w-0 lets text area shrink so truncation can work when available width is limited -->
        <div class="min-w-0 flex flex-col">
            <!-- lee-hlmilk > heading font with normal weight instead of default bold, truncate long titles to one line with ellipsis, leading-snug controls line height -->
            <strong class="font-heading font-normal text-foreground truncate leading-snug" :class="compact ? 'text-base' : 'text-lg'">{{ props.title }}</strong>
            <!-- lee-hlmilk > truncate long author names to one line with ellipsis -->
            <small class="text-xs text-muted-foreground truncate">{{ props.author }}</small>
        </div>
    </div>
</template>
