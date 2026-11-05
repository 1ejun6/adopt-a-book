import { cn } from '@/lib/utils';

export { default as Badge } from './Badge.vue';

const colors = {
  green: 'bg-badge-green',
  amber: 'bg-badge-amber',
  rose: 'bg-badge-rose',
  neutral: 'bg-badge-neutral',
};

export const badgeVariants = ({ variant } = {}) =>
  cn('inline-block rounded px-1.5 py-1 text-sm', colors[variant] || colors.neutral);
