import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

export const BASE = 'http://api.test';

//@ChitanyaBharathi > builds full fake server url > url('/books') > http://api.test/books
export const url = (path) => `${BASE}${path}`;

export const users = {
  customer: { id: 'u-customer', name: 'casey', email: 'casey@test.com', role: 'customer' },
  admin: { id: 'u-admin', name: 'alex', email: 'alex@test.com', role: 'admin' },
};

//@ChitanyaBharathi > default answers for every test > a test overrides one with server.use(...)
export const handlers = [
  http.get(url('/session'), () => HttpResponse.json({ error: 'not logged in' }, { status: 401 })),
  http.get(url('/books'), () => HttpResponse.json({ books: [], total: 0 })),
  http.get(url('/drives'), () => HttpResponse.json({ drives: [] })),
  http.post(url('/logout'), () => new HttpResponse(null, { status: 204 })),
];

export const server = setupServer(...handlers);

//@ChitanyaBharathi > records every request msw sees > lets tests count calls &&& read query params
export function trackRequests() {
  const requests = [];
  const listener = ({ request }) => { requests.push(request.clone()); };
  server.events.on('request:start', listener);
  return {
    requests,
    to: (method, path) => requests.filter(request => request.method === method && new URL(request.url).pathname === path),
    stop: () => server.events.removeListener('request:start', listener),
  };
}
