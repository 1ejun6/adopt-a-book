export function driveHasEnded(drive, now = Date.now()) {
  if (drive?.status === 'cancelled') return true;
  if (!drive?.eventdate) return false;
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Singapore' }).format(now);
  return drive.endtime
    ? Date.parse(`${drive.eventdate}T${drive.endtime.length === 5 ? `${drive.endtime}:00` : drive.endtime}+08:00`) <= now
    : drive.eventdate < today;
}
export function driveTimeLabel(drive) {
  return drive?.starttime && drive?.endtime ? `${drive.starttime.slice(0, 5)}–${drive.endtime.slice(0, 5)} SGT` : 'Time not set';
}
