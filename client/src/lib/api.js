import axios from 'axios';
import { auth } from '@/lib/auth';

export async function api(endpoint, options = {}) {
  try {
    const response = await axios({
      baseURL: import.meta.env.VITE_SERVER_URL,
      url: endpoint,
      method: options.method,
      data: options.body, //data sent to server
      params: options.query, //url filters
      withCredentials: true, //send login cookies
    });

    if (response.status === 204) {
      return null;
    }

    return response.data;
  } catch (error) {
    if (error.response) {
      const data = error.response.data;
      error.message = (data && data.error) || 'request failed > please try again';
      error.status = error.response.status;
      // A failed login does not mean an existing session has expired.
      if (error.status === 401 && endpoint !== '/login' && endpoint !== '/register') {
        auth.user = null;
        auth.ready = true;
      }
    } else {
      error.message = 'could not connect to the server > please try again';
    }
    throw error;
  }
}
