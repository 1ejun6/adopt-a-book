<script>
import { Comment, Fragment, defineComponent, h } from 'vue';
import { Primitive } from 'reka-ui';
import AppIcon from '@/components/shared/AppIcon.vue';
import { cn } from '@/lib/utils';
import { buttonVariants } from '.';

export default defineComponent({
  inheritAttrs: false,
  props: {
    variant: { type: null, required: false },
    size: { type: null, required: false },
    class: { type: null, required: false },
    asChild: { type: Boolean, default: false },
    as: { type: null, default: 'button' },
    loading: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false },
  },
  setup(props, { attrs, slots }) {
    function blockActivation(event) {
      if (!props.loading && !props.disabled) return;
      if (event.type === 'keydown' && !['Enter', ' '].includes(event.key)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    }

    function content() {
      const children = slots.default?.() || [];
      if (!props.loading) return children;
      const spinner = () => h(AppIcon, { name: 'loading', 'data-loading-icon': '' });
      if (!props.asChild) return [spinner(), ...children];

      // Keep the slotted link as the root so Primitive forwards its attributes correctly.
      function withSpinner(nodes) {
        let inserted = false;
        return nodes.map(node => {
          if (inserted || node.type === Comment) return node;
          inserted = true;
          if (node.type === Fragment) return h(Fragment, null, withSpinner(node.children));
          const original = node.children;
          const children = Array.isArray(original)
            ? [spinner(), ...original]
            : typeof original === 'object' && original
              ? { ...original, default: (...args) => [spinner(), ...(original.default?.(...args) || [])] }
              : [spinner(), original];
          const child = h(node.type, node.props, children);
          child.ref = node.ref;
          return child;
        });
      }
      return withSpinner(children);
    }

    return () => h(Primitive, {
      ...attrs,
      'data-slot': 'button',
      'data-variant': props.variant,
      'data-size': props.size,
      'data-loading': props.loading || undefined,
      as: props.as,
      asChild: props.asChild,
      disabled: props.disabled || props.loading,
      'aria-busy': props.loading || undefined,
      'aria-disabled': props.disabled || props.loading || undefined,
      onClickCapture: blockActivation,
      onKeydownCapture: blockActivation,
      class: cn(buttonVariants({ variant: props.variant, size: props.size }), props.class),
    }, { default: content });
  },
});
</script>

<style>
[data-slot="button"][data-loading="true"] > svg:not([data-loading-icon]) {
  display: none;
}
</style>
