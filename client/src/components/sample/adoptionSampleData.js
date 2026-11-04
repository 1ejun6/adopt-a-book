import { todayInSingapore } from '@/lib/utils';

export function sampleDate(offset) {
  const date = new Date(`${todayInSingapore()}T12:00:00+08:00`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

// Deliberately local fixtures: these previews never read or write customer records.
export function createSampleAdoptions(scenario) {
  if (scenario === 'empty') return { applications: [], appointments: [] };
  const books = [
    ['The Sea of Monsters', ['Rick Riordan'], '#286e83', 'Gardens by the Bay MRT'],
    ['Thank You for Leaving', ['Rithvik Singh'], '#9c7351', 'Tampines MRT'],
    ['The Myth of Sisyphus and Other Essays', ['Albert Camus'], '#55594f', 'Bukit Brown MRT'],
    ['Where the Red Fern Grows', ['Wilson Rawls'], '#466d5a', 'Sengkang MRT'],
    ['The Little Prince', ['Antoine de Saint-Exupéry'], '#817048', 'Bugis MRT'],
    ['È Natale, Stilton! (#12)', ['Elisabetta Dami', 'Manuel Manzano', 'David Gerstein'], '#a94839', 'Serangoon MRT'],
    ['Five on a Treasure Island', ['Enid Blyton'], '#5f7561', 'Bishan MRT'],
    ['Harry by the Sea', ['Gene Zion', 'Margaret Bloy Graham'], '#457c80', 'Paya Lebar MRT'],
    ['Faking with Benefits', ['Lily Gold'], '#b47763', 'Bedok MRT'],
    ['Devil and the Deep Sea', ['Sara Craven'], '#8b615d', 'Woodlands MRT'],
    ['The Secret Garden', ['Frances Hodgson Burnett'], '#65734a', 'Orchard MRT'],
    ['A Wrinkle in Time', ['Madeleine L’Engle'], '#635f89', 'Jurong East MRT'],
    ['The Wind in the Willows', ['Kenneth Grahame'], '#95744c', 'Toa Payoh MRT'],
    ['Matilda', ['Roald Dahl'], '#6b7892', 'Bugis MRT'],
    ['The Hobbit', ['J. R. R. Tolkien'], '#6d7653', 'Bishan MRT'],
    ['Charlotte’s Web', ['E. B. White'], '#916d77', 'Bedok MRT'],
  ];
  if (scenario === 'upcoming') {
    books.push(
      ['Anne of Green Gables', ['L. M. Montgomery'], '#767b4b', 'Bugis MRT'],
      ['The Ocean at the End of the Lane', ['Neil Gaiman'], '#3e667d', 'Bishan MRT'],
    );
  }
  const applications = books.map(([title, authors, color, collectionarea], index) => {
    const cover = `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="120" viewBox="0 0 80 120"><rect width="80" height="120" rx="2" fill="${color}"/><path d="M7 0v120" stroke="#ffffff" opacity=".2"/><rect x="16" y="15" width="53" height="88" fill="none" stroke="#fff6dd" opacity=".7"/><text x="42" y="43" text-anchor="middle" fill="#fff6dd" font-family="Georgia" font-size="23">${index + 1}</text><path d="M25 64h34M29 70h26M25 88h34" stroke="#fff6dd" opacity=".8"/></svg>`;
    return {
      id: `sample-request-${index + 1}`,
      userid: 'sample-reader',
      status: index < 5 || index === 13 || index > 15 ? 'approved' : index === 14 ? 'cancelled' : index === 15 ? 'rejected' : 'pending',
      createdat: `${sampleDate(-35 + index)}T08:00:00.000Z`,
      bookid: { id: `sample-book-${index + 1}`, title, authors, collectionarea, status: 'reserved', condition: 'Good', thumbnailurl: `data:image/svg+xml,${encodeURIComponent(cover)}` },
    };
  });
  const pickup = (index, status, offset) => ({
    id: `sample-pickup-${index + 1}`, userid: 'sample-reader', bookid: applications[index].bookid.id,
    status, createdat: `${sampleDate(-10)}T09:00:00.000Z`,
    appointmentdate: sampleDate(offset), timeslot: index % 2 ? '10:00 - 11:00' : '11:00 - 12:00',
    location: applications[index].bookid.collectionarea,
  });
  const appointments = [
    pickup(0, 'appointment confirmed', -2), pickup(1, 'pending confirmation', -4),
    pickup(2, 'appointment confirmed', -7), pickup(3, 'pending confirmation', -7),
    pickup(13, 'collected', -8),
  ];
  if (scenario === 'upcoming') {
    appointments.push(pickup(16, 'appointment confirmed', 2), pickup(17, 'appointment confirmed', 5));
    applications[5].status = 'approved';
    appointments.push(pickup(5, 'pending confirmation', 7));
  }
  return { applications, appointments };
}
