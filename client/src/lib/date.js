const timeZone = 'Asia/Singapore';

export function todayInSingapore(value = new Date()) {
    return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(value);
}

//@lee-hlmilk > date-only values represent a Singapore calendar day > timestamps keep their actual instant
export function formatDate(value) {
    return value ? new Date(value.length === 10 ? `${value}T00:00:00+08:00` : value).toLocaleDateString('en-SG', { dateStyle: 'medium', timeZone }) : 'Not provided';
}

export function formatDateTime(value) {
    return value ? new Date(value).toLocaleString('en-SG', { dateStyle: 'medium', timeStyle: 'short', timeZone }) : 'Not provided';
}
