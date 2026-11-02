// Status names are normalised here; each workflow still decides which statuses it accepts.
//@sree-sanjana06 > standardise backend statuses before filtering
//@sree-sanjana06 > normalise statuses without assuming missing values are pending
//@sree-sanjana06 > standardise application status values
export function getApplicationStatus(application, fallback = 'unknown') {
  return String(application.status ?? '').trim().toLowerCase().replace(/[_-]+/g, ' ') || fallback;
}

//@sree-sanjana06 > retrieve the request submission date
//@sree-sanjana06 > retrieve the application submission date
export function getApplicationDate(application) {
  return application.createdat || application.createdAt || application.created_at ||
    application.applicationdate || application.submitted_at || application.date;
}

//@sree-sanjana06 > retrieve the populated book linked to an application
//@sree-sanjana06 > retrieve populated book information from the application
export function getApplicationBook(application) {
  const book = application.bookid || application.book;
  return book && typeof book === 'object' ? book : null;
}
