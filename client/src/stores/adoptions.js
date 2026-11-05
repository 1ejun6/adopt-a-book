import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { api } from '@/lib/api';
import {
  adoptionJourneys,
  bookId,
  recordId,
  hasExistingAdoption,
  canManagePickup,
} from '@/lib/adoptions';

export const useAdoptionsStore = defineStore('adoptions', () => {
  const applications = ref([]),
    appointments = ref([]);
  const applicationsLoading = ref(false),
    appointmentsLoading = ref(false);
  const applicationsLoaded = ref(false),
    appointmentsLoaded = ref(false);
  const applicationsError = ref(''),
    appointmentsError = ref('');
  const pendingWrites = ref(new Set());
  let generation = 0;
  const controllers = new Set(),
    pending = new Map();
  const pickupsReady = computed(
    () => appointmentsLoaded.value && !appointmentsLoading.value && !appointmentsError.value,
  );
  const ready = computed(
    () =>
      applicationsLoaded.value &&
      !applicationsLoading.value &&
      !applicationsError.value &&
      pickupsReady.value,
  );
  const journeys = computed(() =>
    adoptionJourneys(applications.value, appointments.value, pickupsReady.value),
  );
  const applicationsForBook = computed(
    () => (id) => applications.value.filter((item) => bookId(item) === id),
  );
  const resources = {
    applications: {
      data: applications,
      loading: applicationsLoading,
      loaded: applicationsLoaded,
      error: applicationsError,
      key: 'adoptionapplications',
    },
    appointments: {
      data: appointments,
      loading: appointmentsLoading,
      loaded: appointmentsLoaded,
      error: appointmentsError,
      key: 'appointments',
    },
  };
  function reset() {
    generation++;
    controllers.forEach((controller) => controller.abort());
    controllers.clear();
    pending.clear();
    pendingWrites.value = new Set();
    for (const resource of Object.values(resources)) {
      resource.data.value = [];
      resource.loading.value = resource.loaded.value = false;
      resource.error.value = '';
    }
  }
  function fetchResource(name, { force = false } = {}) {
    if (pending.has(name)) return pending.get(name);
    const resource = resources[name];
    if (!force && resource.loaded.value && !resource.error.value)
      return Promise.resolve(resource.data.value);
    const current = generation,
      controller = new AbortController();
    controllers.add(controller);
    resource.loading.value = true;
    resource.error.value = '';
    const request = (async () => {
      try {
        const response = await api(`/${name}`, { signal: controller.signal });
        if (current !== generation) throw new Error('Session changed; please try again');
        if (!Array.isArray(response?.[resource.key]))
          throw new Error(`Could not read your ${name}.`);
        resource.data.value = response[resource.key];
        resource.loaded.value = true;
        return resource.data.value;
      } catch (failure) {
        if (current === generation) resource.error.value = failure.message;
        throw failure;
      } finally {
        controllers.delete(controller);
        if (current === generation) {
          resource.loading.value = false;
          pending.delete(name);
        }
      }
    })();
    pending.set(name, request);
    return request;
  }
  const fetchApplications = (options) => fetchResource('applications', options);
  const fetchAppointments = (options) => fetchResource('appointments', options);
  async function refresh() {
    const current = generation;
    const results = await Promise.allSettled([
      fetchApplications({ force: true }),
      fetchAppointments({ force: true }),
    ]);
    return (
      current === generation &&
      results.every((result) => result.status === 'fulfilled') &&
      ready.value
    );
  }
  async function mutate(keys, endpoint, options, validate, commit) {
    if (keys.some((key) => pendingWrites.value.has(key)))
      throw new Error('This adoption is already being updated');
    keys.forEach((key) => pendingWrites.value.add(key));
    const current = generation,
      controller = new AbortController();
    controllers.add(controller);
    try {
      await validate();
      if (current !== generation) throw new Error('Session changed; please try again');
      const response = await api(endpoint, { ...options, signal: controller.signal });
      if (current !== generation) throw new Error('Session changed; please try again');
      // Drain reads begun during the write before committing its receipt. The next
      // refresh must start after acknowledgement, never reuse a pre-write snapshot.
      await Promise.allSettled(pending.values());
      if (current !== generation) throw new Error('Session changed; please try again');
      commit?.(response);
      const refreshed = await refresh();
      if (current !== generation) throw new Error('Session changed; please try again');
      return { response, refreshed };
    } finally {
      controllers.delete(controller);
      if (current === generation) keys.forEach((key) => pendingWrites.value.delete(key));
    }
  }
  async function requireReady() {
    if (!(await refresh()))
      throw new Error('Check the latest adoption and pickup details before making changes');
  }
  function submitApplication(id) {
    return mutate(
      [`book:${id}`],
      '/applications',
      { method: 'POST', body: { bookid: id } },
      async () => {
        await fetchApplications({ force: true });
        if (applicationsForBook.value(id).some(hasExistingAdoption)) {
          throw new Error(
            'You already have a request for this book. View your request in My Adoptions.',
          );
        }
      },
    );
  }
  function withdrawApplication(id) {
    const item = applications.value.find((item) => recordId(item) === id);
    return mutate(
      [`application:${id}`, `book:${bookId(item)}`],
      `/applications/${id}`,
      { method: 'DELETE' },
      async () => {
        await fetchApplications({ force: true });
        if (!journeys.value.find((item) => item.id === id)?.canWithdraw)
          throw new Error('This adoption can no longer be withdrawn');
      },
      () => {
        applications.value = applications.value.map((item) =>
          recordId(item) === id ? { ...item, status: 'cancelled' } : item,
        );
      },
    );
  }
  function saveAppointment({ id, bookId: copyId, location, appointmentdate, pickupoptions }) {
    const body = { location, appointmentdate, pickupoptions };
    return mutate(
      [`book:${copyId}`, ...(id ? [`appointment:${id}`] : [])],
      id ? `/appointments/${id}` : '/appointments',
      {
        method: id ? 'PATCH' : 'POST',
        body: id ? body : { ...body, bookid: copyId },
      },
      async () => {
        await requireReady();
        const journey = journeys.value.find(
          (item) =>
            item.bookId === copyId && (id ? recordId(item.appointment) === id : item.canArrange),
        );
        if (id ? !canManagePickup(journey, journey?.appointment) : !journey?.canArrange)
          throw new Error('Pickup eligibility has changed');
      },
      (response) => {
        if (recordId(response?.appointment))
          appointments.value = [
            ...appointments.value.filter(
              (item) => recordId(item) !== recordId(response.appointment),
            ),
            response.appointment,
          ];
      },
    );
  }
  function cancelAppointment(id) {
    const item = appointments.value.find((item) => recordId(item) === id);
    return mutate(
      [`appointment:${id}`, `book:${bookId(item)}`],
      `/appointments/${id}`,
      { method: 'DELETE' },
      async () => {
        await requireReady();
        const journey = journeys.value.find((item) => recordId(item.appointment) === id);
        if (!canManagePickup(journey, journey?.appointment))
          throw new Error('This pickup can no longer be cancelled');
      },
      () => {
        appointments.value = appointments.value.map((item) =>
          recordId(item) === id ? { ...item, status: 'cancelled' } : item,
        );
      },
    );
  }
  return {
    applications,
    appointments,
    applicationsLoading,
    appointmentsLoading,
    applicationsLoaded,
    appointmentsLoaded,
    applicationsError,
    appointmentsError,
    pickupsReady,
    ready,
    journeys,
    applicationsForBook,
    pendingWrites,
    fetchApplications,
    fetchAppointments,
    refresh,
    submitApplication,
    withdrawApplication,
    saveAppointment,
    cancelAppointment,
    reset,
  };
});
