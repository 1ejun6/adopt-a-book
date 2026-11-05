<script setup>
import { computed, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { toast } from 'vue-sonner';
import { api } from '@/lib/api';
import { formatDate, todayInSingapore } from '@/lib/date';
import { useServerPagination } from '@/composables/useServerPagination';
import { useConfirmation } from '@/lib/confirmation';
import AdminPickupOptions from '@/components/admin/AdminPickupOptions.vue';
import AdminList from '@/components/admin/AdminList.vue';
import AdminDetailsDialog from '@/components/admin/AdminDetailsDialog.vue';
import BookIdentity from '@/components/shared/AppBookIdentity.vue';
import AppDatePicker from '@/components/shared/AppDatePicker.vue';
import StatusBadge from '@/components/shared/AppStatusBadge.vue';
import { Button } from '@/components/ui/button';

const router = useRouter();
const navigation = router.options.history.state;
const selectedIds = ref([]);
const selectedAppointment = ref(null);
//@lee-hlmilk > collection fields &&& action availability stay in the view > shared dialog handles presentation
const appointmentFields = computed(() => [
    { label: 'Customer', value: selectedAppointment.value?.customer },
    { label: 'Email', value: selectedAppointment.value?.email },
    { label: 'Collection date', value: selectedAppointment.value?.appointmentdate ? formatDate(selectedAppointment.value.appointmentdate) : null },
    { label: 'Time', value: selectedAppointment.value?.timeslot },
    { label: 'Location', value: selectedAppointment.value?.location }
]);
const detailsHint = computed(() => selectedAppointment.value ? actionHint([selectedAppointment.value], selectedAppointment.value.status === 'pending confirmation' ? 'appointment confirmed' : 'collected') : '');
const detailsOpen = ref(false);
const saving = ref(false);
const { confirm } = useConfirmation();
const today = ref(todayInSingapore());

const viewTabs = [
    { value: 'awaiting', label: 'Awaiting confirmation' },
    { value: 'today', label: "Today's pickup" },
    { value: 'upcoming', label: 'Upcoming' },
    { value: 'overdue', label: 'Overdue' },
    { value: 'history', label: 'History' }
];
//@lee-hlmilk > dashboard links choose the initial queue through navigation state > keep the URL clean
const filters = reactive({ search: '', date: '', view: viewTabs.some(tab => tab.value === navigation.view) ? navigation.view : 'awaiting', status: 'all' });
const columns = [
    { key: 'customer', label: 'Customer', class: 'w-1/5' },
    { key: 'book', label: 'Requested copy' },
    { key: 'collection', label: 'Collection', class: 'w-1/4' },
    { key: 'status', label: 'Status', class: 'w-48' }
];
const emptyTitles = {
    awaiting: 'No appointments awaiting confirmation',
    today: 'No pickups today',
    upcoming: 'No upcoming appointments',
    overdue: 'No overdue appointments',
    history: 'No appointment history'
};

//@lee-hlmilk > today's pickups must be confirmed > pending requests due today ||| earlier belong in overdue
async function pickupOptionsUpdated(appointment) {
    selectedAppointment.value = { ...selectedAppointment.value, ...appointment };
    await fetchAppointments();
}
function matchesView(appointment, view) {
    const active = ['pending confirmation', 'appointment confirmed'].includes(appointment.status);
    if (view === 'awaiting') { return appointment.status === 'pending confirmation' && appointment.appointmentdate > today.value; }
    if (view === 'history') { return !active; }
    if (!active) { return false; }
    if (view === 'today') { return appointment.status === 'appointment confirmed' && appointment.appointmentdate === today.value; }
    return view === 'upcoming' ? appointment.appointmentdate > today.value :
        appointment.appointmentdate < today.value || (appointment.status === 'pending confirmation' && appointment.appointmentdate === today.value);
}
//@lee-hlmilk > appointment rows include customer &&& book relations > no full application lookup
const { rows: appointments, page, pageSize, total, counts, pageCount, loading, loadError, refresh: fetchAppointments } = useServerPagination({
    endpoint: '/admin/appointments', filters, selectedIds, read: response => response.appointments,
    onResponse: response => { today.value = response.today; }
});
const hasFilters = computed(() => filters.search.trim() || filters.date || filters.status !== 'all');
const emptyFilterHint = computed(() => filters.view === 'today'
    ? 'Try another search term or view.'
    : filters.view === 'awaiting'
        ? 'Try another search term, date, or view.'
        : 'Try another search term, date, status, or view.');
const selectedAppointments = computed(() => appointments.value.filter(appointment => selectedIds.value.includes(appointment.id)));

//@lee-hlmilk > mirror action availability for feedback > SQL remains responsible for validating each transition
function actionHint(rows, status) {
    if (status !== 'rejected' && rows.some(appointment => appointment.pickupoptions?.length)) return 'Waiting for the customer to choose a pickup time.';
    const requiredStatus = status === 'collected' ? 'appointment confirmed' : 'pending confirmation';
    if (rows.some(appointment => appointment.status !== requiredStatus)) {
        if (status === 'rejected') { return 'Only pending appointments can be rejected.'; }
        return status === 'collected' ? 'Only confirmed appointments can be marked collected.' : 'Only appointments awaiting confirmation can be confirmed.';
    }
    if (status === 'appointment confirmed' && rows.some(appointment => appointment.appointmentdate < today.value)) { return 'Past appointments cannot be confirmed. The customer needs to reschedule.'; }
    if (rows.some(appointment => appointment.book?.status !== 'reserved')) { return 'The copy must still be reserved for collection.'; }
    return '';
}
const rejectHint = computed(() => selectedAppointment.value ? actionHint([selectedAppointment.value], 'rejected') : '');
const confirmHint = computed(() => actionHint(selectedAppointments.value, 'appointment confirmed'));
const collectHint = computed(() => actionHint(selectedAppointments.value, 'collected'));
const selectionHint = computed(() => {
    if (['upcoming', 'overdue'].includes(filters.view) && new Set(selectedAppointments.value.map(appointment => appointment.status)).size > 1) {
        return 'Filter by Pending to confirm appointments, or Confirmed to mark them collected.';
    }
    return selectedAppointments.value.every(appointment => appointment.status === 'pending confirmation') ? confirmHint.value : collectHint.value;
});

function openAppointment(appointment) {
    if (loading.value || saving.value) { return; }
    selectedAppointment.value = appointment;
    detailsOpen.value = true;
}

//@lee-hlmilk > API updates one appointment per request > report partial failures &&& reload authoritative statuses
async function updateAppointments(status, rows = selectedAppointments.value) {
    if (loading.value || saving.value || !rows.length || actionHint(rows, status)) { return; }
    const targets = [...rows];
    const single = targets.length === 1;
    const action = {
        'appointment confirmed': 'Confirm',
        rejected: 'Reject',
        collected: 'Mark collected'
    }[status];
    const subject = single ? 'appointment' : 'appointments';
    const title = status === 'collected' ? `Mark ${subject} collected?` : `${action} ${subject}?`;
    const descriptions = {
        'appointment confirmed': 'Confirm the requested collection details.',
        rejected: 'The book stays reserved and the customer can propose another pickup time.',
        collected: 'Confirm the customer received the book. The copy will become adopted.'
    };
    if (!await confirm(title, {
        description: descriptions[status] + '\n' + targets.map(appointment => `${appointment.customer} — ${appointment.booktitle}\n${formatDate(appointment.appointmentdate)} · ${appointment.timeslot} · ${appointment.location}`).join('\n'),
        actionLabel: action,
        destructive: status === 'rejected'
    })) { return; }
    if (loading.value || saving.value) { return; }
    //@lee-hlmilk > a dashboard link can load details outside this page > retain that record for confirmation checks
    const current = targets.map(target => appointments.value.find(appointment => appointment.id === target.id) || (selectedAppointment.value?.id === target.id ? selectedAppointment.value : null));
    if (current.some(appointment => !appointment) || actionHint(current, status)) { toast.error('These appointments have changed. Select them again.'); return; }
    detailsOpen.value = false;
    saving.value = true;
    let completed = 0;
    const failures = [];
    try {
        for (const appointment of targets) {
            try {
                await api(`/admin/appointments/${appointment.id}`, { method: 'PATCH', body: { status } });
                completed++;
            } catch (error) { failures.push(`${appointment.customer} — ${appointment.booktitle}: ${error.message}`); }
        }
        if (completed) { toast.success(`${completed} ${completed === 1 ? 'appointment' : 'appointments'} ${status === 'collected' ? 'marked collected' : status === 'rejected' ? 'rejected' : 'confirmed'}`); }
        if (failures.length) { toast.error(`${failures.length} ${failures.length === 1 ? 'update' : 'updates'} failed`, { description: failures.join('\n'), style: { whiteSpace: 'pre-line' } }); }
        await fetchAppointments();
    } finally { saving.value = false; }
}

watch(() => filters.view, () => {
    filters.status = 'all';
    if (filters.view === 'today') { filters.date = ''; }
});
//@lee-hlmilk > fetch a linked appointment directly > it may be outside the current server page
async function loadAppointmentLink() {
    const id = navigation.appointment;
    if (typeof id !== 'string') { return; }
    try {
        const { appointment } = await api(`/admin/appointments/${id}`);
        filters.view = viewTabs.find(tab => matchesView(appointment, tab.value))?.value || 'history';
        selectedAppointment.value = appointment;
        detailsOpen.value = true;
    } catch (error) { toast.error(error.message); }
    finally { router.replace({ state: { appointment: null } }); }
}
fetchAppointments().then(loadAppointmentLink);

</script>

<template>
    <!--@lee-hlmilk > list models update local filters &&& page > History disables selection while keeping record details available-->
    <AdminList title="Appointments" description="Manage appointments and book collections."
        v-model:search="filters.search" v-model:tab="filters.view" v-model:selectedIds="selectedIds" v-model:page="page"
        :rows="appointments" :columns="columns" :tabs="viewTabs" :counts="counts" :loading="loading" :disabled="saving"
        :selectable="filters.view !== 'history'"
        :error="loadError" searchPlaceholder="Search by Customer, Email, Book, Location..."
        :pagination="{ itemLabel: 'appointments', total, pageSize, pageCount }" @openRow="openAppointment">
        <template #filters>
            <AppDatePicker v-if="filters.view !== 'today'" v-model="filters.date" label="Collection date" />
            <select v-if="!['awaiting', 'today'].includes(filters.view)" v-model="filters.status" aria-label="Appointment status" class="w-full min-w-0 rounded-lg border px-3 sm:w-auto text-base min-h-11">
                <option value="all">All statuses</option>
                <template v-if="filters.view === 'history'">
                    <option value="collected">Collected</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="rejected">Rejected</option>
                </template>
                <template v-else>
                    <option value="pending confirmation">Pending</option>
                    <option value="appointment confirmed">Confirmed</option>
                </template>
            </select>
        </template>
        <template #selectionActions>
            <p v-if="confirmHint && collectHint" class="text-sm text-muted-foreground" role="status">
                {{ selectionHint }}
            </p>
            <Button class="min-h-11" :disabled="loading || saving || !!confirmHint" @click="updateAppointments('appointment confirmed')">Confirm appointments</Button>
            <Button class="min-h-11" variant="outline" :disabled="loading || saving || !!collectHint" @click="updateAppointments('collected')">Mark collected</Button>
        </template>
        <template #cellCustomer="{ row }">
            <p class="break-words lg:truncate">{{ row.customer }}</p>
            <small class="block break-words lg:truncate text-sm text-muted-foreground">{{ row.email || 'Email not provided' }}</small>
        </template>
        <template #cellBook="{ row }">
            <BookIdentity :title="row.booktitle" :author="row.book?.authors?.join(', ') || 'Unknown Author'" :cover="row.book?.coverurl" />
        </template>
        <template #cellCollection="{ row }">
            <p>{{ formatDate(row.appointmentdate) }} · {{ row.timeslot }}</p>
            <p class="text-muted-foreground">{{ row.location }}</p>
        </template>
        <template #cellStatus="{ value, row }"><StatusBadge :status="value" /><p v-if="value === 'pending confirmation' && row.pickupoptions?.length" class="text-sm text-muted-foreground">Waiting for customer choice</p></template>
        <template #empty>
            <h2>{{ hasFilters ? 'No matching appointments' : emptyTitles[filters.view] }}</h2>
            <p class="text-sm text-muted-foreground">{{ hasFilters ? emptyFilterHint : 'Pickup bookings will appear in their corresponding view.' }}</p>
        </template>
    </AdminList>

    <AdminDetailsDialog v-if="selectedAppointment" :open="detailsOpen" title="Appointment details"
        :book="{ ...selectedAppointment.book, title: selectedAppointment.booktitle }" :status="selectedAppointment.status"
        :fields="appointmentFields" @update:open="!saving && (detailsOpen = $event)">
        <!--@lee-hlmilk > completed ||| inactive appointments are read-only > active pickups show the next step-->
        <p v-if="['pending confirmation', 'appointment confirmed'].includes(selectedAppointment.status)" class="text-muted-foreground">
            {{ detailsHint || (selectedAppointment.status === 'pending confirmation' ? 'Confirm after checking the requested date, time, and location.' : 'Mark collected only after the customer has physically received the book.') }}
        </p>
        <AdminPickupOptions v-if="['pending confirmation', 'appointment confirmed'].includes(selectedAppointment.status) && selectedAppointment.book?.status === 'reserved'"
            :key="selectedAppointment.id" :appointment="selectedAppointment" v-model:saving="saving" @updated="pickupOptionsUpdated" />
        <template v-if="['pending confirmation', 'appointment confirmed'].includes(selectedAppointment.status)" #actions>
            <template v-if="selectedAppointment.status === 'pending confirmation'">
                <Button type="button" variant="destructive" class="flex-1 min-h-11" :disabled="loading || saving || !!rejectHint" @click="updateAppointments('rejected', [selectedAppointment])">Reject appointment</Button>
                <Button type="button" class="flex-1 min-h-11" :disabled="loading || saving || !!detailsHint" @click="updateAppointments('appointment confirmed', [selectedAppointment])">Confirm appointment</Button>
            </template>
            <Button v-else type="button" class="w-full min-h-11" :disabled="loading || saving || !!detailsHint" @click="updateAppointments('collected', [selectedAppointment])">Mark collected</Button>
        </template>
    </AdminDetailsDialog>
</template>
