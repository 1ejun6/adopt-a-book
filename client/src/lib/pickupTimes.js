import { pickupStart } from '../../../shared/pickups.mjs';
import { currentTime } from '@/lib/clock';

export const pickupTimes = Array.from({ length: 9 }, (_, index) => {
  const hour = index + 9;
  return `${String(hour).padStart(2, '0')}:00–${String(hour + 1).padStart(2, '0')}:00`;
});

export function availablePickupSlot(slot) {
  return pickupStart(slot) > currentTime.value;
}

export function availablePickupTimes(appointmentdate) {
  return pickupTimes.filter(timeslot => availablePickupSlot({ appointmentdate, timeslot }));
}

export function appointmentTimes(appointment) {
  if (appointment?.optionsby === 'customer' && [2, 3].includes(appointment.pickupoptions?.length))
    return appointment.pickupoptions.slice(0, 2).map((option) => option.timeslot);
  return [pickupTimes.includes(appointment?.timeslot) ? appointment.timeslot : '', ''];
}
export function copyPickupDraft(draft) {
  return { ...draft, timeslots: [...draft.timeslots] };
}

export function pickupTimeText(appointment) {
  if (
    appointment?.status === 'pending confirmation' &&
    appointment.optionsby === 'customer' &&
    [2, 3].includes(appointment.pickupoptions?.length)
  )
    return appointment.pickupoptions.map((option) => option.timeslot).join(' · ');
  return appointment?.timeslot || 'Time unavailable';
}
