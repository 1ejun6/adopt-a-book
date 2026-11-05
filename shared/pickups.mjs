// Slot starts are Singapore wall times, independent of the browser's timezone.
export function pickupStart(slot) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(slot?.appointmentdate || '')) return NaN;
  const time = /^(\d{2}):(\d{2})\s*[–-]\s*(\d{2}):(\d{2})$/.exec(slot?.timeslot || '');
  if (!time || +time[1] > 23 || +time[2] > 59 || +time[3] > 23 || +time[4] > 59 ||
    +time[3] * 60 + +time[4] <= +time[1] * 60 + +time[2]) return NaN;
  const midnight = new Date(`${slot.appointmentdate}T00:00:00Z`);
  if (!Number.isFinite(+midnight) || midnight.toISOString().slice(0, 10) !== slot.appointmentdate) return NaN;
  return Date.parse(`${slot.appointmentdate}T${time[1]}:${time[2]}:00+08:00`);
}
export function pendingPickupState(appointment, now = Date.now()) {
  const slots = appointment?.pickupoptions?.length ? appointment.pickupoptions : [appointment];
  const starts = slots.map(pickupStart);
  if (starts.some(start => start > now)) return 'awaiting';
  return starts.every(Number.isFinite) ? 'overdue' : 'attention';
}
export function pickupMatchesView(appointment, view, now = Date.now()) {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Singapore' }).format(now);
  const pending = appointment.status === 'pending confirmation';
  const confirmed = appointment.status === 'appointment confirmed';
  if (view === 'history') return !pending && !confirmed;
  if (view === 'awaiting') return pending && pendingPickupState(appointment, now) === 'awaiting';
  if (view === 'today') return confirmed && appointment.appointmentdate === today;
  if (view === 'upcoming') return (confirmed || (pending && pendingPickupState(appointment, now) === 'awaiting')) && appointment.appointmentdate > today;
  if (view === 'overdue') return pending ? pendingPickupState(appointment, now) !== 'awaiting' : confirmed && (!appointment.appointmentdate || appointment.appointmentdate < today);
  return false;
}
