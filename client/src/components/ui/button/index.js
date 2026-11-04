import { cn } from '@/lib/utils';

export { default as Button } from './Button.vue';

export const buttonVariants = ({ variant, size } = {}) =>
  cn(
    'inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm',
    variant === 'destructive'
      ? 'bg-badge-rose text-badge-rose-foreground'
      : variant === 'outline'
      ? 'washi-tape-hover border'
      : 'washi-tape-hover bg-primary',
    size === 'sm' ? 'px-3' : 'min-h-11',
  );
