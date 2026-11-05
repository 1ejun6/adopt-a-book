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

export function appointmentTimes(appointment) {
  if (appointment?.optionsby === 'customer' && appointment.pickupoptions?.length === 3)
    return appointment.pickupoptions.map((option) => option.timeslot);
  return [pickupTimes.includes(appointment?.timeslot) ? appointment.timeslot : '', '', ''];
}
export function copyPickupDraft(draft) {
  return { ...draft, timeslots: [...draft.timeslots] };
}

export function pickupTimeText(appointment) {
  if (
    appointment?.status === 'pending confirmation' &&
    appointment.optionsby === 'customer' &&
    appointment.pickupoptions?.length === 3
  )
    return appointment.pickupoptions.map((option) => option.timeslot).join(' · ');
  return appointment?.timeslot || 'Time unavailable';
}
