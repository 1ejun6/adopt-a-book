import { onScopeDispose } from 'vue';
import { toast } from 'vue-sonner';

//@lee-hlmilk > one pending choice per caller > repeated clicks must not confirm another action
export function useConfirmation() {
  let pending;

  function settle(confirmed = false) {
    if (!pending) { return; }
    const { id, resolve } = pending;
    pending = null;
    toast.dismiss(id);
    //@lee-hlmilk > resolve the caller's awaited choice > closing the toast does not perform the API action itself
    resolve(confirmed);
  }

  function confirm(title, { description = '', actionLabel = 'Confirm', cancelLabel = 'Cancel', destructive = false } = {}) {
    if (pending) { return Promise.resolve(false); }
    return new Promise(resolve => {
      // Use the main toaster's title, description and action layout.
      // Native cancel buttons require dismissible:true; dismissal always cancels.
      const id = toast.info(title, {
        description,
        duration: Infinity,
        dismissible: true,
        closeButton: false,
        style: { pointerEvents: 'auto', whiteSpace: 'pre-line' },
        cancel: { label: cancelLabel, onClick: () => settle(false) },
        action: { label: actionLabel, onClick: () => settle(true) },
        actionButtonStyle: destructive ? { color: 'var(--destructive)' } : undefined,
        onDismiss: () => settle(false),
        onAutoClose: () => settle(false)
      });
      pending = { id, resolve };
    });
  }

  //@lee-hlmilk > leaving the page cancels its pending action > an old toast must not mutate an unmounted view
  onScopeDispose(() => settle());
  return { confirm, cancel: () => settle() };
}
