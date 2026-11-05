import { cn } from '@/lib/utils';

export { default as Button } from './Button.vue';

export const buttonVariants = ({ variant, size } = {}) =>
  cn(
    'inline-flex items-center justify-center min-h-11 min-w-11 gap-2 rounded-lg px-4 py-2 text-sm',
    variant === 'destructive'
      ? 'bg-badge-purple text-badge-purple-foreground'
      : variant === 'outline'
      ? 'hover:bg-primary data-[active]:bg-primary border bg-card'
      : 'hover:bg-primary data-[active]:bg-primary bg-primary',
    size === 'sm' && 'px-3',
  );
