import { cn } from '@/lib/utils';

export { default as Button } from './Button.vue';

export const buttonVariants = ({ variant, size } = {}) =>
  cn(
    'inline-flex items-center justify-center min-h-11 min-w-11 gap-2 rounded-lg px-4 py-2 text-sm lowercase',
    variant === 'destructive'
      ? 'border border-destructive bg-transparent text-destructive hover:bg-destructive/10'
      : 'hover:bg-primary data-[active]:bg-primary border bg-transparent',
    size === 'sm' && 'px-3',
  );
