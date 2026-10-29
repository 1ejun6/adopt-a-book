import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/*@brod > Singapore time, so YYYY-MM-DD does not shift a day. */
export function formatDate(value, options) {
  return new Date(value).toLocaleDateString('en-SG', { timeZone: 'Asia/Singapore', ...options });
}

/*@brod > Today in Singapore, same shape as eventdate so strings compare. */
export function todayInSingapore() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Singapore' });
}
