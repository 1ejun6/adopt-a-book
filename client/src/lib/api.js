import axios from 'axios';
let onUnauthorized;
let authRevision = 0;
export function registerUnauthorizedHandler(callback) { onUnauthorized = callback; }
export function invalidateApiSession() { authRevision++; }

export async function api(endpoint, options = {}) {
  const revision = authRevision;
  try {
    const response = await axios({
      baseURL: import.meta.env.VITE_SERVER_URL,
      url: endpoint,
      method: options.method,
      data: options.body, //@1ejun6 > data sent to server
      params: options.query, //@1ejun6 > url filters
      headers: options.headers, //@lee-hlmilk > image uploads send the File with its content type
      signal: options.signal,
      withCredentials: true, //@1ejun6 > send login cookies
    });

    if (response.status === 204) { return null; }

    return response.data;
  } catch (error) {
    if (axios.isCancel(error)) throw error;
    if (error.response) {
      const data = error.response.data;
      error.message = (data && data.error) || 'request failed > please try again';
      error.status = error.response.status;
      //@1ejun6 > a failed login does not mean an existing session has expired

      if (error.status === 401 && endpoint !== '/login' && endpoint !== '/register' && endpoint !== '/session' && revision === authRevision) { onUnauthorized?.(); }
    } else {
      error.message = 'could not connect to the server > please try again';
    }
    throw error;
  }
}
