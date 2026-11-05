import { todayInSingapore } from '@/lib/utils';

export const pickupTimes = Array.from({ length: 9 }, (_, index) => {
  const hour = index + 9;
  return `${String(hour).padStart(2, '0')}:00–${String(hour + 1).padStart(2, '0')}:00`;
});

export function availablePickupSlot(slot) {
  if (!slot?.appointmentdate || !pickupTimes.includes(slot.timeslot)) return false;
  const time = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Singapore',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date());
  return `${slot.appointmentdate} ${slot.timeslot.slice(0, 5)}` > `${todayInSingapore()} ${time}`;
}
