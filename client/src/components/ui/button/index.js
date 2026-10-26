import { cn } from '@/lib/utils';

export { default as Button } from './Button.vue';

export const buttonVariants = ({ variant, size } = {}) =>
  cn(
    'washi-tape washi-tape-hover inline-flex items-center justify-center rounded-lg text-sm disabled:pointer-events-none',
    variant === 'destructive'
      ? 'bg-badge-rose text-badge-rose-foreground hover:bg-badge-rose'
      : variant === 'outline'
      ? 'border border-border bg-transparent'
      : 'bg-primary',
    size === 'sm' ? 'h-8 px-3' : 'h-9 px-4',
  );
