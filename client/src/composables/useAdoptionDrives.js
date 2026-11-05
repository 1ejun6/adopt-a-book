import { useVisibleRefresh } from '@/composables/useVisibleRefresh';
import { ref, watch, onScopeDispose } from 'vue';
import { currentTime } from '@/lib/clock';
import { api } from '@/lib/api';
import { driveHasEnded } from '../../../shared/drives.mjs';
import { validPickupDate } from '@/lib/adoptions';

export function useAdoptionDrives({ endpoint, cacheKey }) {
  // Only public drive data may be persisted in browser storage.
  if (endpoint !== '/drives') cacheKey = undefined;
  const drives = ref([]);
  watch(currentTime, now => {
    if (drives.value.some(drive => drive.past !== driveHasEnded(drive, now)))
      drives.value = drives.value.map(drive => ({ ...drive, past: driveHasEnded(drive, now) }));
  });
  const loading = ref(true);
  const error = ref('');
  let controller;
  let requestId = 0;
  onScopeDispose(() => {
    requestId++;
    controller?.abort();
  });

  async function fetchdrives(refresh = false) {
    controller?.abort();
    const id = ++requestId;
    const request = new AbortController();
    controller = request;
    loading.value = true;
    error.value = '';

    if (!refresh && cacheKey) {
      try {
        const cached = JSON.parse(localStorage.getItem(cacheKey));
        if (
          Array.isArray(cached) &&
          cached.every(
            (drive) =>
              drive &&
              typeof drive.id === 'string' &&
              typeof drive.title === 'string' &&
              typeof drive.location === 'string' &&
              ['open', 'closed', 'cancelled'].includes(drive.status) &&
              validPickupDate(drive.eventdate) &&
              Number.isInteger(drive.spotsleft) &&
              drive.spotsleft >= 0 &&
              (drive.bookCount == null ||
                (Number.isInteger(drive.bookCount) && drive.bookCount >= 0)),
          )
        ) {
          //@1ejun6 > cached drives can cross midnight > update past dates using Singapore time
          drives.value = cached.map((drive) => ({
            ...drive,
            past: driveHasEnded(drive),
          }));

        }
      } catch {
        //@1ejun6 > browser storage unavailable \ invalid > fetch drives from server instead
      }
    }

    try {
      const response = await api(endpoint, { method: 'GET', signal: request.signal });
      const drivelist = response.drives;
      if (!Array.isArray(drivelist))
        throw new Error('could not load adoption drives > please try again');

      // Get book counts for each station
      const stationIds = [...new Set(drivelist.map((drive) => drive.mrtstationid).filter(Boolean))];
      const bookCounts = new Map(
        await Promise.all(
          stationIds.map(async (id) => {
            try {
              const books = await api('/books', {
                method: 'GET',
                signal: request.signal,
                query: { mrtstationids: id, status: 'available', limit: 1 },
              });
              return [id, Number.isInteger(books.total) && books.total >= 0 ? books.total : null];
            } catch (error) {
              if (request.signal.aborted) throw error;
              return [id, null];
            }
          }),
        ),
      );

      if (id !== requestId) return;
      drives.value = drivelist.map((drive) => ({
        ...drive,
        past: driveHasEnded(drive),
        bookCount: bookCounts.get(drive.mrtstationid) ?? null,
      }));
      try {
        if (cacheKey) localStorage.setItem(cacheKey, JSON.stringify(drives.value));
      } catch {
        //@1ejun6 > local storage may be blocked \ full > keep fetched drives visible
      }
    } catch (failure) {
      if (id !== requestId || request.signal.aborted) return;
      error.value = failure.message;
    } finally {
      if (id === requestId) loading.value = false;
    }
  }

  useVisibleRefresh(() => fetchdrives(true), { interval: true, busy: () => loading.value });
  void fetchdrives();
  return { drives, loading, error, refresh: () => fetchdrives(true) };
}
