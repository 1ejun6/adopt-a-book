<script setup>
import { ref, watch } from 'vue';
import { Book02Icon } from '@hugeicons/core-free-icons';
import { Skeleton } from '@/components/ui/skeleton';

const props = defineProps({
    title: { type: String },
    author: { type: String },
    cover: { type: String },
    coverClass: { type: String, default: 'w-1/4 max-w-12' },
    loading: { type: Boolean } //@lee-hlmilk > for loading skeleton if we using
});

const coverFailed = ref(false);
watch(() => props.cover, () => { coverFailed.value = false; });
</script>

<template>
    <!--@lee-hlmilk > loading state-->
    <div v-if="props.loading" class="flex w-full min-w-0 items-center gap-2.5" aria-busy="true" role="status">
        <!--@1ejun6 > loading-->
        <!--@lee-hlmilk > prevent cover from shrinking > keep 2-3 book proportions-->
        <Skeleton :class="props.coverClass" class="shrink-0 aspect-[2/3]"></Skeleton>
        <!--@lee-hlmilk > loading title & author-->
        <div class="min-w-0 flex-1"> <!--@1ejun6 > fills remaining width & can shrink-->
            <Skeleton class="h-5 w-2/3"></Skeleton>
            <Skeleton class="h-4 w-1/3"></Skeleton>
        </div>
    </div>

    <!--@lee-hlmilk > book cover  title & author-->
    <div v-else class="flex w-full min-w-0 items-center gap-2.5">
        <div :class="props.coverClass" class="grid place-items-center shrink-0 aspect-[2/3] rounded-lg">
            <img v-if="props.cover && !coverFailed" :key="props.cover" :src="props.cover" alt="" width="48" height="72"
                loading="lazy" decoding="async" class="w-full object-contain" draggable="false"
                @error="coverFailed = true" /> <!--@1ejun6 > download covers when you scroll near them > let other content render while preparing image-->
            <HugeiconsIcon v-else :icon="Book02Icon" class="size-5" aria-hidden="true" />
        </div>
        <div class="min-w-0 flex-1">
            <strong class="block truncate font-heading font-normal text-lg">{{ props.title }}</strong>
            <small class="block truncate text-sm text-muted-foreground">{{ props.author }}</small>
        </div>
    </div>
</template>
