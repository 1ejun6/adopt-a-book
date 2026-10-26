import { h, onScopeDispose } from 'vue';
import { toast } from 'vue-sonner';
import { FocusScope } from 'reka-ui';
import { Button } from '@/components/ui/button';

//@lee-hlmilk > one pending choice per caller > repeated clicks must not confirm another action
export function useConfirmation() {
  let pending;

  function settle(confirmed = false) {
    if (!pending) { return; }
    const { id, resolve } = pending;
    pending = null;
    toast.dismiss(id);
    resolve(confirmed);
  }

  function confirm(title, { description = '', actionLabel = 'Confirm', cancelLabel = 'Cancel', destructive = false } = {}) {
    if (pending) { return Promise.resolve(false); }
    return new Promise(resolve => {
      //@lee-hlmilk > custom buttons keep Cancel usable with dismissible:false > only an explicit choice resolves the toast
      //@lee-hlmilk > focus scope &&& pointer events keep both buttons accessible above an open modal form
      const content = () => h(FocusScope, { loop: true, trapped: true, asChild: true }, () => h('div', { class: 'pointer-events-auto space-y-2.5' }, [
        h('p', title),
        description && h('p', { class: 'max-h-48 overflow-y-auto whitespace-pre-line text-muted-foreground font-normal' }, description),
        h('div', { class: 'flex gap-2.5' }, [
          h(Button, { type: 'button', size: 'sm', variant: 'outline', class: 'flex-1', onClick: () => settle(false) }, () => cancelLabel),
          h(Button, { type: 'button', size: 'sm', variant: destructive ? 'destructive' : 'default', class: 'flex-1', onClick: () => settle(true) }, () => actionLabel)
        ])
      ]));
      const id = toast.message(content, { duration: Infinity, dismissible: false, closeButton: false });
      pending = { id, resolve };
    });
  }

  //@lee-hlmilk > leaving the page cancels its pending action > an old toast must not mutate an unmounted view
  onScopeDispose(() => settle());
  return { confirm, cancel: () => settle() };
}
