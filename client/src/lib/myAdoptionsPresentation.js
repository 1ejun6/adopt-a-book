// Presentation for My Adoptions only; request and pickup state stays in adoptions.js.
export const activeAdoptionStatusLegend = [
  { value: 'waiting', tone: 'amber', label: 'waiting' },
  { value: 'action', tone: 'purple', label: 'action needed' },
  { value: 'approved', tone: 'green', label: 'approved / confirmed' },
];

export const historyAdoptionStatusLegend = [
  { value: 'collected', tone: 'green', label: 'collected' },
  { value: 'withdrawn', tone: 'neutral', label: 'withdrawn' },
  { value: 'rejected', tone: 'red', label: 'rejected' },
];

export const underReviewMessage = 'the team is reviewing your request. you can arrange pickup once it’s approved.';

export function adoptionStatusTone(record = {}) {
  const status = String(record.code || record.label || '').toLowerCase();
  if (['rejected', 'not approved', 'pickup declined'].includes(status)) return 'red';
  if (['collected', 'completed'].includes(status)) return 'green';
  if (['withdrawn', 'cancelled', 'pickup cancelled'].includes(status)) return 'neutral';
  if (record.warning || record.canArrange || record.group === 'attention') return 'purple';
  if (['pending', 'pending review', 'under review', 'pickup requested', 'pending confirmation', 'pickup awaiting confirmation', 'waiting for pickup confirmation'].includes(status)) return 'amber';
  if (['approved', 'pickup confirmed', 'appointment confirmed'].includes(status)) return 'green';
  return 'neutral';
}

export const historyAdoptionTabs = [
  { value: 'all', label: 'All' },
  { value: 'collected', label: 'Collected' },
  { value: 'withdrawn', label: 'Withdrawn' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'cancelled-pickups', label: 'Cancelled pickups' },
  { value: 'declined-pickups', label: 'Declined pickups' },
];

export function historyOutcome(entry) {
  if (entry.kind === 'request') return entry.record.code;
  const status = String(entry.appointment.status).toLowerCase();
  return { cancelled: 'cancelled-pickups', rejected: 'declined-pickups' }[status] || status;
}
