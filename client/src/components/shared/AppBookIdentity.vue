<script setup>
import { ref, watch } from 'vue';
import { Book02Icon } from '@hugeicons/core-free-icons';
import { Skeleton } from '@/components/ui/skeleton';

const props = defineProps({
    title: { type: String },
    author: { type: String },
    authorTitle: { type: String },
    cover: { type: String },
    coverClass: { type: String, default: 'w-1/4 max-w-12' },
    wrap: { type: Boolean, default: false },
    vertical: { type: Boolean, default: false },
    loading: { type: Boolean } //@lee-hlmilk > for loading skeleton if we using
});

const coverFailed = ref(false);
watch(() => props.cover, () => { coverFailed.value = false; });
</script>

<template>
    <!--@lee-hlmilk > loading state-->
    <div v-if="props.loading" class="flex w-full min-w-0 gap-2.5" :class="vertical ? 'flex-col' : 'items-center'" aria-busy="true" role="status">
        <!--@1ejun6 > loading-->
        <!--@lee-hlmilk > prevent cover from shrinking > keep 2-3 book proportions-->
        <Skeleton :class="props.coverClass" class="shrink-0 aspect-[2/3]"></Skeleton>
        <!--@lee-hlmilk > loading title &&& author-->
        <div class="min-w-0 flex-1"> <!--@1ejun6 > fills remaining width &&& can shrink-->
            <Skeleton class="h-5 w-2/3"></Skeleton>
            <Skeleton class="h-4 w-1/3"></Skeleton>
        </div>
    </div>

    <!--@lee-hlmilk > book cover  title &&& author-->
    <div v-else class="flex w-full min-w-0 gap-2.5" :class="vertical ? 'flex-col' : wrap ? 'items-start' : 'items-center'">
        <div :class="[props.coverClass, wrap ? 'flex items-center justify-center' : 'grid place-items-center']" class="shrink-0 aspect-[2/3]">
            <img v-if="props.cover && !coverFailed" :key="props.cover" :src="props.cover" alt="" width="48" height="72"
                loading="lazy" decoding="async" class="w-full object-contain" :class="{ 'h-full': wrap }" draggable="false"
                @error="coverFailed = true" /> <!--@1ejun6 > download covers when you scroll near them > let other content render while preparing image-->
            <HugeiconsIcon v-else :icon="Book02Icon" class="size-5" aria-hidden="true" />
        </div>
        <div class="min-w-0 flex-1">
            <strong class="font-heading font-normal text-lg" :class="wrap ? 'line-clamp-2 break-words' : 'block truncate'" :title="props.title">{{ props.title }}</strong>
            <small class="text-sm text-muted-foreground" :class="wrap ? 'line-clamp-2' : 'block truncate'" :title="props.authorTitle || props.author">{{ props.author }}</small>
        </div>
    </div>
</template>
