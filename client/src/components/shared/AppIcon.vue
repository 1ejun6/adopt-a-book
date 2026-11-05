<script setup>
import { HugeiconsIcon } from '@hugeicons/vue';
import {
  Home01Icon, Book02Icon, Bookmark02Icon, Calendar03Icon, UserGroupIcon,
  Login01Icon, UserAdd01Icon, File01Icon,
  Search01Icon, Cancel01Icon, PencilEdit02Icon, Delete02Icon, ArrowReloadHorizontalIcon,
  Loading03Icon, CheckmarkCircle02Icon, CancelCircleIcon, InformationCircleIcon,
  Add01Icon, ArrowLeft01Icon, ArrowRight01Icon, FilterIcon,
  FloppyDiskIcon, Location08Icon, SentIcon, ViewIcon, ImageUploadIcon,
} from '@hugeicons/core-free-icons';

defineProps({ name: { type: String, required: true }, size: { type: Number, default: 16 } });
const icons = {
  home: Home01Icon, book: Book02Icon, bookmark: Bookmark02Icon, calendar: Calendar03Icon,
  community: UserGroupIcon, login: Login01Icon,
  register: UserAdd01Icon, request: File01Icon,
  search: Search01Icon, close: Cancel01Icon, edit: PencilEdit02Icon, delete: Delete02Icon,
  refresh: ArrowReloadHorizontalIcon, loading: Loading03Icon, success: CheckmarkCircle02Icon,
  cancel: CancelCircleIcon, info: InformationCircleIcon,
  add: Add01Icon, back: ArrowLeft01Icon, next: ArrowRight01Icon, filter: FilterIcon,
  save: FloppyDiskIcon, location: Location08Icon, send: SentIcon, view: ViewIcon, upload: ImageUploadIcon,
};
</script>

<template>
  <HugeiconsIcon :icon="icons[name] || icons.info" :size="size" class="app-icon" :class="{ 'app-icon-loading': name === 'loading' }" aria-hidden="true" />
</template>
