import { formatDate, todayInSingapore } from './utils.js';

export function getApplicationStatus(record, fallback = 'unknown') {
  return (
    String(record?.status ?? '')
      .trim()
      .toLowerCase()
      .replace(/[_-]+/g, ' ') || fallback
  );
}

// These states already represent a request or completed adoption for this copy.
export function hasExistingAdoption(application) {
  return ['pending', 'pending review', 'approved', 'pickup requested', 'pickup confirmed', 'collected', 'completed'].includes(getApplicationStatus(application));
}

export function getApplicationDate(application) {
  return (
    application?.createdat ||
    application?.createdAt ||
    application?.created_at ||
    application?.applicationdate ||
    application?.submitted_at ||
    application?.date
  );
}

export function getApplicationBook(application) {
  const book = application?.bookid || application?.book;
  return book && typeof book === 'object' ? book : null;
}

export const recordId = (record) => record?.id || record?._id || '';
export const bookId = (record) =>
  typeof record?.bookid === 'object'
    ? recordId(record.bookid)
    : record?.bookid || recordId(record?.book);
export const userId = (record) =>
  typeof record?.userid === 'object' ? recordId(record.userid) : record?.userid;
const timestamp = (value) => Date.parse(value) || 0;
export const activePickup = (appointment) =>
  ['pending confirmation', 'appointment confirmed'].includes(getApplicationStatus(appointment));

export function displayDate(value) {
  if (!value || !Number.isFinite(Date.parse(value))) {
    return 'Date unavailable';
  }
  return formatDate(value, { day: 'numeric', month: 'short', year: 'numeric' });
}

// There is no application id on a pickup. Only accept a unique reader/book/date cycle.
export function pickupAssociations(applications, appointments) {
  const byApplication = new Map(applications.map((item) => [recordId(item), []]));
  const uncertainBooks = new Set();
  const candidates = new Map();
  for (const application of applications) {
    const cycles = applications.filter(
      (item) => bookId(item) === bookId(application) && userId(item) === userId(application),
    );
    const dates = cycles.map((item) => timestamp(getApplicationDate(item)));
    if (
      !recordId(application) ||
      !userId(application) ||
      !bookId(application) ||
      dates.some((date) => !date) ||
      new Set(dates).size !== dates.length
    ) {
      uncertainBooks.add(bookId(application));
    }
  }
  for (const appointment of appointments) {
    const id = bookId(appointment);
    const cycles = applications.filter((item) => bookId(item) === id);
    const sameReader = cycles.filter((item) => userId(item) === userId(appointment));
    const created = timestamp(appointment.createdat);
    const dates = sameReader.map((item) => timestamp(getApplicationDate(item)));
    const uncertain =
      !id ||
      !recordId(appointment) ||
      !userId(appointment) ||
      !created ||
      cycles.some((item) => !userId(item) || !recordId(item)) ||
      !sameReader.length ||
      dates.some((date) => !date) ||
      new Set(dates).size !== dates.length;
    if (uncertain) {
      if (id) uncertainBooks.add(id);
      continue;
    }
    const cycle = sameReader
      .filter((item) => timestamp(getApplicationDate(item)) <= created)
      .sort((a, b) => timestamp(getApplicationDate(b)) - timestamp(getApplicationDate(a)))[0];
    if (
      !cycle ||
      ((activePickup(appointment) || getApplicationStatus(appointment) === 'collected') &&
        getApplicationStatus(cycle) !== 'approved')
    ) {
      uncertainBooks.add(id);
      continue;
    }
    candidates.set(appointment, cycle);
  }
  for (const application of applications) {
    const matches = appointments.filter((item) => candidates.get(item) === application);
    const live = matches.filter(activePickup);
    const collected = matches.filter((item) => getApplicationStatus(item) === 'collected');
    const afterCollection =
      collected.length === 1 &&
      matches.some(
        (item) =>
          item !== collected[0] && timestamp(item.createdat) >= timestamp(collected[0].createdat),
      );
    if (
      live.length > 1 ||
      collected.length > 1 ||
      (live.length && collected.length) ||
      afterCollection
    ) {
      uncertainBooks.add(bookId(application));
      continue;
    }
    byApplication.set(
      recordId(application),
      matches.sort(
        (a, b) =>
          timestamp(b.createdat) - timestamp(a.createdat) ||
          String(recordId(a)).localeCompare(String(recordId(b))),
      ),
    );
  }
  return { byApplication, uncertainBooks };
}

export function appointmentsFor(application, appointments, applications = [application]) {
  return (
    pickupAssociations(
      applications.length ? applications : [application],
      appointments,
    ).byApplication.get(recordId(application)) || []
  );
}

export function adoptionJourneys(applications, appointments, ready = true) {
  const associations = pickupAssociations(applications, appointments);
  return sortJourneys(
    applications.map((application) =>
      adoptionJourney(application, appointments, ready, applications, associations),
    ),
  );
}

export function hasPickupOptions(appointment) {
  return getApplicationStatus(appointment) === 'pending confirmation' && appointment.optionsby === 'customer' && appointment.pickupoptions?.length === 3;
}

export function pickupStatus(appointment) {
  if (hasPickupOptions(appointment)) return {
    label: 'Waiting for pickup confirmation', variant: 'neutral',
    description: 'Your three available times have been sent. The team will pick one and confirm your collection.',
  };

  return (
    {
      'pending confirmation': {
        label: 'Pickup awaiting confirmation',
        variant: 'neutral',
        description: 'Your pickup request has been sent. Wait for confirmation before you travel.',
      },
      'appointment confirmed': {
        label: 'Pickup confirmed',
        variant: 'green',
        description: 'Collect your book at the confirmed time and location below.',
      },
      collected: {
        label: 'Collected',
        variant: 'neutral',
        description: 'The team has marked this book as collected.',
      },
      cancelled: {
        label: 'Pickup cancelled',
        variant: 'neutral',
        description: 'This pickup was cancelled. You can arrange another pickup.',
      },
      rejected: {
        label: 'Pickup declined',
        variant: 'rose',
        description: 'This pickup was declined. You can suggest another time and location.',
      },
    }[getApplicationStatus(appointment)] || {
      label: 'Pickup status unavailable',
      variant: 'neutral',
      description: 'Refresh to check this pickup before making changes.',
    }
  );
}

export function adoptionJourney(
  application,
  appointments = [],
  pickupsReady = true,
  applications = [],
  associations = pickupAssociations(
    applications.length ? applications : [application],
    appointments,
  ),
) {
  const status = getApplicationStatus(application);
  const book = getApplicationBook(application);
  const matches = associations.byApplication.get(recordId(application)) || [];
  const reliable =
    !associations.uncertainBooks.has(bookId(application)) &&
    !!recordId(application) &&
    !!userId(application) &&
    !!bookId(application) &&
    !!timestamp(getApplicationDate(application));
  const appointment =
    matches.find(activePickup) ||
    matches.find((item) => getApplicationStatus(item) === 'collected') ||
    matches[0] ||
    null;
  const base = {
    id: recordId(application),
    application,
    book,
    bookId: bookId(application),
    appointment,
    pickups: matches,
    pickupsVerified: pickupsReady,
    reliable,
    canWithdraw: status === 'pending' && reliable,
    canArrange: false,
    action: '',
    actionLabel: '',
    group: 'waiting',
    history: false,
    priority: 4,
    code: status,
  };
  if (['cancelled', 'withdrawn'].includes(status)) {
    return {
      ...base,
      code: 'withdrawn',
      label: 'Withdrawn',
      variant: 'neutral',
      description: 'You withdrew this request.',
      history: true,
    };
  }
  if (status === 'rejected') {
    return {
      ...base,
      label: 'Not approved',
      variant: 'rose',
      description: 'Your adoption request was not approved.',
      history: true,
    };
  }
  if (['pending', 'pending review'].includes(status)) {
    return {
      ...base,
      label: 'Under review',
      variant: 'neutral',
      warning: reliable ? '' : 'Needs checking',
      description: reliable
        ? 'We’re reviewing your book request.'
        : 'Some request or pickup records need checking. Review the available records before making changes.',
    };
  }
  if (status !== 'approved') {
    return {
      ...base,
      label: 'Status unavailable',
      variant: 'neutral',
      description: 'The request status is unavailable. Refresh to check for an update.',
    };
  }
  if (!pickupsReady && !appointment) {
    return {
      ...base,
      label: 'Approved',
      warning: 'Pickup status unavailable',
      variant: 'green',
      description:
        'Your request is approved, but pickup information could not be checked. Retry before arranging a time.',
    };
  }
  if (!timestamp(getApplicationDate(application))) {
    return {
      ...base,
      label: 'Approved',
      warning: 'Pickup status unavailable',
      variant: 'green',
      description: 'The request date is missing. Check with the team before arranging collection.',
    };
  }
  if (!reliable) {
    return {
      ...base,
      label: 'Approved',
      warning: 'Needs checking',
      variant: 'green',
      description:
        'Pickup records could not be linked to this adoption request. Check the details with the team before arranging pickup.',
    };
  }
  if (appointment) {
    const appointmentStatus = getApplicationStatus(appointment);
    if (appointmentStatus === 'collected') {
      return { ...base, ...pickupStatus(appointment), code: 'collected', history: true };
    }
    if (activePickup(appointment)) {
      const confirmed = appointmentStatus === 'appointment confirmed';
      const overdue =
        appointment.appointmentdate && appointment.appointmentdate < todayInSingapore();
      return {
        ...base,
        ...pickupStatus(appointment),
        code: confirmed ? 'pickup confirmed' : 'pickup requested',
        group: confirmed
          ? 'confirmed'
          : overdue || !pickupComplete(appointment)
            ? 'attention'
            : 'waiting',
        priority: overdue || !pickupComplete(appointment) ? -1 : confirmed ? 1 : 3,
        warning: !pickupsReady
          ? 'Pickup status unavailable'
          : book?.status !== 'reserved'
            ? 'Needs checking'
            : overdue
              ? 'Pickup date has passed'
              : !pickupComplete(appointment)
                ? 'Pickup details incomplete'
                : '',
        action: recordId(appointment) ? 'pickup' : '',
        actionLabel:
          book?.status !== 'reserved' || overdue || !pickupComplete(appointment)
            ? 'Check details'
            : confirmed
              ? 'Manage pickup'
              : 'View pickup request',
        ...(!pickupComplete(appointment)
          ? {
              description: `Missing pickup details: ${pickupMissingDetails(appointment).join(', ')}. Submitting corrected details requires confirmation.`,
            }
          : {}),
        ...(!pickupsReady
          ? {
              description:
                'Previously loaded pickup details could not be checked. Retry pickup information before travelling or making changes.',
            }
          : {}),
        ...(book?.status !== 'reserved'
          ? {
              description:
                'The book’s availability and pickup record need checking. Check with the team before travelling.',
            }
          : {}),
        ...(overdue
          ? {
              description:
                'The pickup date has passed, but this book hasn’t been marked as collected. Check with the team before you travel.',
            }
          : {}),
      };
    }
    if (!['cancelled', 'rejected'].includes(appointmentStatus)) {
      return {
        ...base,
        ...pickupStatus(appointment),
        action: recordId(appointment) ? 'pickup' : '',
        actionLabel: 'View pickup',
      };
    }
  }
  const unmatchedActive = appointments.some(
    (item) =>
      bookId(item) === base.bookId &&
      activePickup(item) &&
      (!userId(application) || !userId(item) || userId(application) === userId(item)),
  );
  if (unmatchedActive) {
    return {
      ...base,
      label: 'Approved',
      warning: 'Pickup status unavailable',
      variant: 'green',
      description:
        'An active pickup exists for this copy, but could not be linked to this request. Review the pickup record before arranging another time.',
    };
  }
  const canArrange = pickupsReady && !!base.id && !!base.bookId && book?.status === 'reserved';
  return {
    ...base,
    code: 'approved',
    label: 'Approved',
    warning: canArrange ? '' : 'Pickup details unavailable',
    variant: 'green',
    group: 'attention',
    priority: 0,
    canArrange,
    action: canArrange ? 'arrange' : '',
    actionLabel: 'Arrange pickup',
    description: canArrange
      ? appointment
        ? `${pickupStatus(appointment).label}. Your adoption is still approved. You can request another pickup.`
        : 'Choose a preferred pickup time.'
      : 'Your adoption is approved, but we couldn’t verify the pickup details. Refresh the page or check with the team before arranging pickup.',
  };
}

export function sortJourneys(records) {
  return [...records].sort(
    (a, b) =>
      Number(a.history) - Number(b.history) ||
      (!a.history ? a.priority - b.priority : 0) ||
      timestamp(getApplicationDate(b.application)) - timestamp(getApplicationDate(a.application)) ||
      String(a.id).localeCompare(String(b.id)),
  );
}

export function canManagePickup(record, appointment) {
  return (
    !!record &&
    record.reliable &&
    record.pickupsVerified &&
    getApplicationStatus(record.application) === 'approved' &&
    record.book?.status === 'reserved' &&
    recordId(record.appointment) === recordId(appointment) &&
    !!recordId(appointment) &&
    activePickup(record.appointment) &&
    activePickup(appointment)
  );
}

export function bookAuthors(book) {
  const authors = book?.authors || book?.author;
  return (
    (Array.isArray(authors)
      ? authors
          .map((author) => (typeof author === 'string' ? author : author?.name))
          .filter(Boolean)
          .join(', ')
      : authors) || 'Author unavailable'
  );
}

export function collectionLocation(book) {
  return book?.mrtstation?.name || book?.collectionarea || '';
}

export const journeyTabs = [
  { value: 'active', label: 'Active' },
  { value: 'history', label: 'History' },
];

export function validPickupDate(value) {
  return (
    typeof value === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value
  );
}

export function pickupMissingDetails(appointment) {
  const missing = [];
  if (!appointment?.location?.trim()) {
    missing.push('location');
  }
  if (!validPickupDate(appointment?.appointmentdate)) {
    missing.push('date');
  }
  if (!appointment?.timeslot?.trim()) {
    missing.push('time');
  }
  return missing;
}

export function pickupComplete(appointment) {
  return pickupMissingDetails(appointment).length === 0;
}

export function pickupGroup(appointment) {
  const status = getApplicationStatus(appointment);
  if (['collected', 'cancelled', 'rejected'].includes(status)) {
    return 'history';
  }
  if (status === 'appointment confirmed') return 'confirmed';
  if (
    !activePickup(appointment) ||
    !pickupComplete(appointment) ||
    appointment.appointmentdate < todayInSingapore()
  ) {
    return 'actions';
  }
  return 'waiting';
}

export function journeyGroup(record) {
  if (record.history) {
    return 'history';
  }
  if (record.appointment && ['pickup requested', 'pickup confirmed'].includes(record.code)) {
    return pickupGroup(record.appointment);
  }
  return ['pending', 'pending review'].includes(record.code) ? 'waiting' : 'actions';
}

export const activeAdoptionStages = [
  { value: 'needs-action', label: 'Needs action' },
  { value: 'waiting', label: 'Waiting' },
  { value: 'pickups', label: 'Pickups' },
  { value: 'all', label: 'All' },
];

// Each active adoption belongs to one task-based subtab; All remains an overview.
export function adoptionStage(record) {
  if (actionPriority(record) <= 1) return 'needs-action';
  return record.code === 'pickup confirmed' ? 'pickups' : 'waiting';
}

// The list stays together through approval and pickup; only ended adoptions move.
export function adoptionSection(record) {
  return record.history ? 'history' : 'active';
}

export function actionPriority(record) {
  if (
    record.warning ||
    (!record.history &&
      !record.canArrange &&
      !['pending', 'pending review', 'pickup requested', 'pickup confirmed'].includes(record.code))
  ) {
    return 0;
  }
  if (record.canArrange) return 1;
  if (record.code === 'pickup confirmed') return 2;
  if (record.code === 'pickup requested') return 3;
  return 4;
}

// Progress describes recorded lifecycle state, never an unsent form draft.
export function adoptionProgress(applicationStatus, appointmentStatus = '') {
  const application = getApplicationStatus({ status: applicationStatus });
  const pickup = getApplicationStatus({ status: appointmentStatus }, '');
  if (['pending', 'pending review'].includes(application) && !pickup) {
    return { current: 2, completed: 1 };
  }
  if (application !== 'approved') return null;
  if (pickup === 'collected') return { current: 0, completed: 4 };
  if (pickup === 'appointment confirmed') return { current: 4, completed: 3 };
  if (['', 'pending confirmation', 'cancelled', 'rejected'].includes(pickup)) {
    return { current: 3, completed: 2 };
  }
  return null;
}

// Free-text time proposals are valid, but only explicit, ordered time ranges can be exported.
export function pickupCalendar(appointment, title) {
  if (
    getApplicationStatus(appointment) !== 'appointment confirmed' ||
    !pickupComplete(appointment) ||
    appointment.appointmentdate < todayInSingapore()
  ) {
    return '';
  }
  const times = appointment.timeslot.match(/^(\d{2}):(\d{2})\s*[–-]\s*(\d{2}):(\d{2})$/);
  if (!times) {
    return '';
  }
  const [, h1, m1, h2, m2] = times.map(Number);
  if (h1 > 23 || h2 > 23 || m1 > 59 || m2 > 59 || h2 * 60 + m2 <= h1 * 60 + m1) {
    return '';
  }
  const stamp = (time) =>
    new Date(`${appointment.appointmentdate}T${time}:00+08:00`)
      .toISOString()
      .replace(/[-:]/g, '')
      .replace('.000', '');
  const escape = (value) =>
    String(value)
      .replace(/\\/g, '\\\\')
      .replace(/\r?\n/g, '\\n')
      .replace(/,/g, '\\,')
      .replace(/;/g, '\\;');
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Adopt a Book//Collections//EN',
    'BEGIN:VEVENT',
    `UID:${escape(recordId(appointment))}@adopt-a-book`,
    `DTSTAMP:${new Date()
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}/, '')}`,
    `DTSTART:${stamp(`${times[1]}:${times[2]}`)}`,
    `DTEND:${stamp(`${times[3]}:${times[4]}`)}`,
    `SUMMARY:${escape(`Collect ${title || 'your adopted book'}`)}`,
    `LOCATION:${escape(appointment.location)}`,
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ].join('\r\n');
}

// Both the pickup card and details dialog export the same confirmed appointment.
export function downloadPickupCalendar(appointment, title) {
  const calendar = pickupCalendar(appointment, title);
  if (!calendar) return;
  const url = URL.createObjectURL(new Blob([calendar], { type: 'text/calendar;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `pickup-${recordId(appointment)}.ics`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
