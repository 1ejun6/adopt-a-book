import { pickupStart } from '../../../shared/pickups.mjs';
import { driveHasEnded } from '../../../shared/drives.mjs';

function event(id, title, location, date, start, end) {
  if (!id || !location || !/^\d{4}-\d{2}-\d{2}$/.test(date || '')) return null;
  if (![start, end].every(time => /^([01]\d|2[0-3]):[0-5]\d(?::00)?$/.test(time || ''))) return null;
  const midnight = new Date(`${date}T00:00:00Z`);
  if (!Number.isFinite(+midnight) || midnight.toISOString().slice(0, 10) !== date) return null;
  const startAt = Date.parse(`${date}T${start.slice(0, 5)}:00+08:00`);
  const endAt = Date.parse(`${date}T${end.slice(0, 5)}:00+08:00`);
  if (!Number.isFinite(startAt) || endAt <= startAt) return null;
  return { id, title, location, start: new Date(startAt), end: new Date(endAt) };
}
export function driveEvent(drive, now = Date.now()) {
  if (!drive?.id || driveHasEnded(drive, now)) return null;
  return event(`drive-${drive.id}`, drive.title, drive.location, drive.eventdate, drive.starttime, drive.endtime);
}
export function pickupEvent(appointment, title, now = Date.now()) {
  if (!(appointment?.id || appointment?._id) || appointment?.status !== 'appointment confirmed' || !Number.isFinite(pickupStart(appointment))) return null;
  const [start, end] = appointment.timeslot.split(/[–-]/).map(time => time.trim());
  const result = event(`pickup-${appointment.id || appointment._id}`, `Collect ${title || appointment.booktitle || 'your adopted book'}`, appointment.location, appointment.appointmentdate, start, end);
  return result && result.end.getTime() > now ? result : null;
}
const stamp = date => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const escape = value => String(value).replace(/\\/g, '\\\\').replace(/\r\n|\r|\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
// Fold by UTF-8 octets, preserving Unicode characters and RFC 5545 continuation spaces.
function fold(line) {
  const encoder = new TextEncoder();
  let output = '', size = 0;
  for (const character of line) {
    const bytes = encoder.encode(character).length;
    if (size + bytes > 75) { output += '\r\n '; size = 1; }
    output += character; size += bytes;
  }
  return output;
}
export function eventCalendar(value) {
  if (!value) return '';
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Adopt a Book//Events//EN', 'BEGIN:VEVENT',
    `UID:${escape(value.id)}@adopt-a-book`, `DTSTAMP:${stamp(new Date())}`, `DTSTART:${stamp(value.start)}`,
    `DTEND:${stamp(value.end)}`, `SUMMARY:${escape(value.title)}`, `LOCATION:${escape(value.location)}`,
    'END:VEVENT', 'END:VCALENDAR', ''].map(fold).join('\r\n');
}
export function googleCalendarUrl(value) {
  if (!value) return '';
  const query = new URLSearchParams({ action: 'TEMPLATE', text: value.title, location: value.location,
    dates: `${stamp(value.start)}/${stamp(value.end)}`, ctz: 'Asia/Singapore' });
  return `https://calendar.google.com/calendar/render?${query}`;
}
export function downloadCalendar(value) {
  if (!value) return;
  const url = URL.createObjectURL(new Blob([eventCalendar(value)], { type: 'text/calendar;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url; link.download = `${value.id}.ics`; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
