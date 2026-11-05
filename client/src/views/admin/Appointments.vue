<script setup>
import AppIcon from '@/components/shared/AppIcon.vue';
import AppCalendarButton from '@/components/shared/AppCalendarButton.vue';
import { pickupEvent } from '@/lib/calendar';
import { useAdminRecord } from '@/composables/useAdminRecord';
import { computed, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { toast } from 'vue-sonner';
import { api } from '@/lib/api';
import { currentTime } from '@/lib/clock';
import { availablePickupSlot } from '@/lib/pickupTimes';
import { pickupMatchesView, pendingPickupState } from '../../../../shared/pickups.mjs';
import { useVisibleRefresh } from '@/composables/useVisibleRefresh';
import { formatDate } from '@/lib/date';
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
    { label: 'Time', value: selectedAppointment.value?.status === 'pending confirmation' && selectedAppointment.value?.optionsby === 'customer' ? 'Choose from the proposed times below' : selectedAppointment.value?.timeslot },
    { label: 'Location', value: selectedAppointment.value?.location }
]);
const detailsHint = computed(() => selectedAppointment.value ? actionHint([selectedAppointment.value], selectedAppointment.value.status === 'pending confirmation' ? 'appointment confirmed' : 'collected') : '');
const detailsOpen = ref(false);
const { detailError, detailLoading, refreshDetail } = useAdminRecord(selectedAppointment, detailsOpen, '/admin/appointments', 'appointment', { busy: () => saving.value });
const saving = ref(false);
const savingAction = ref('');
const { confirm } = useConfirmation();

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
    { key: 'customer', label: 'Customer', class: 'w-1/5', mobileClass: 'col-span-2 flex items-baseline gap-2' },
    { key: 'book', label: 'Requested copy', mobileClass: 'col-start-1 row-start-1', hideMobileLabel: true },
    { key: 'collection', label: 'Collection', class: 'w-1/4' },
    { key: 'status', label: 'Status', class: 'w-48', mobileClass: 'col-start-2 row-start-1', hideMobileLabel: true }
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
    if (appointment.status === 'appointment confirmed') toast.success('Pickup confirmed. The customer can view the selected time in My Adoptions.');
    await fetchAppointments();
        await refreshDetail();
}
function matchesView(appointment, view) {
    return pickupMatchesView(appointment, view, currentTime.value);
}
//@lee-hlmilk > appointment rows include customer &&& book relations > no full application lookup
const { rows: appointments, page, pageSize, total, counts, pageCount, loading, loadError, refresh: fetchAppointments } = useServerPagination({
    busy: () => saving.value, endpoint: '/admin/appointments', filters, selectedIds, read: response => response.appointments
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
    if (status === 'appointment confirmed' && rows.some(appointment => pendingPickupState(appointment, currentTime.value) !== 'awaiting')) return 'No future pickup time is available, or details are incomplete. Ask the customer to reschedule.';
    if (status === 'appointment confirmed' && rows.some(appointment => appointment.pickupoptions?.length)) return 'Open the appointment and select one of the customer’s available times.';
    const requiredStatus = status === 'collected' ? 'appointment confirmed' : 'pending confirmation';
    if (rows.some(appointment => appointment.status !== requiredStatus)) {
        if (status === 'rejected') { return 'Only pending appointments can be rejected.'; }
        return status === 'collected' ? 'Only confirmed appointments can be marked collected.' : 'Only appointments awaiting confirmation can be confirmed.';
    }
    if (status === 'appointment confirmed' && rows.some(appointment => !availablePickupSlot(appointment))) { return 'The pickup time has passed or is incomplete. The customer needs to reschedule.'; }
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
    if (detailLoading.value || detailError.value || loading.value || saving.value || !rows.length || actionHint(rows, status)) { return; }
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
    savingAction.value = status;
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
        await refreshDetail();
    } finally { saving.value = false; savingAction.value = ''; }
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
useVisibleRefresh(async () => { await fetchAppointments(); await refreshDetail(); }, { interval: true, busy: () => loading.value || saving.value });
fetchAppointments().then(loadAppointmentLink);

</script>

<template>
    <!--@lee-hlmilk > list models update local filters &&& page > History disables selection while keeping record details available-->
    <AdminList @retry="fetchAppointments" title="Appointments" description="Manage appointments and book collections."
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
            <Button :disabled="detailLoading || !!detailError || loading || saving || !!confirmHint" @click="updateAppointments('appointment confirmed')" :loading="saving && savingAction === 'appointment confirmed'"><AppIcon name="success" />Confirm</Button>
            <Button variant="outline" :disabled="detailLoading || !!detailError || loading || saving || !!collectHint" @click="updateAppointments('collected')" :loading="saving && savingAction === 'collected'"><AppIcon name="success" />Mark collected</Button>
        </template>
        <template #cellCustomer="{ row }">
            <p class="break-words lg:truncate">{{ row.customer }}</p>
            <small class="hidden truncate text-sm text-muted-foreground lg:block">{{ row.email || 'Email not provided' }}</small>
        </template>
        <template #cellBook="{ row }">
            <BookIdentity :title="row.booktitle" :author="row.book?.authors?.join(', ') || 'Unknown Author'" :cover="row.book?.coverurl" />
        </template>
        <template #cellCollection="{ row }">
            <p>{{ formatDate(row.appointmentdate) }} · {{ row.status === 'pending confirmation' && row.optionsby === 'customer' ? 'Times proposed' : row.timeslot }}</p>
            <p class="text-muted-foreground">{{ row.location }}</p>
        </template>
        <template #cellStatus="{ value, row }"><StatusBadge :status="value" /><p v-if="value === 'pending confirmation' && pendingPickupState(row, currentTime) !== 'awaiting'" class="hidden text-sm text-destructive lg:block">Needs attention: no future pickup time or incomplete details</p><p v-else-if="value === 'pending confirmation' && row.pickupoptions?.length" class="hidden text-sm text-muted-foreground lg:block">Select a proposed time</p></template>
        <template #empty>
            <h2>{{ hasFilters ? 'No matching appointments' : emptyTitles[filters.view] }}</h2>
            <p class="text-sm text-muted-foreground">{{ hasFilters ? emptyFilterHint : 'Pickup bookings will appear in their corresponding view.' }}</p>
        </template>
    </AdminList>

    <AdminDetailsDialog :loading="detailLoading" :error="detailError" :busy="saving || detailLoading" @retry="refreshDetail" v-if="selectedAppointment" :open="detailsOpen" title="Appointment details"
        :book="{ ...selectedAppointment.book, title: selectedAppointment.booktitle }" :status="selectedAppointment.status"
        :fields="appointmentFields" @update:open="!saving && (detailsOpen = $event)">
        <!--@lee-hlmilk > completed ||| inactive appointments are read-only > active pickups show the next step-->
        <p v-if="['pending confirmation', 'appointment confirmed'].includes(selectedAppointment.status)" class="text-muted-foreground">
            {{ detailsHint || (selectedAppointment.status === 'pending confirmation' ? 'Confirm after checking the requested date, time, and location.' : 'Mark collected only after the customer has physically received the book.') }}
        </p>
        <AppCalendarButton :event="pickupEvent(selectedAppointment, selectedAppointment.booktitle, currentTime)" :disabled="detailLoading || !!detailError" />
        <AdminPickupOptions v-if="selectedAppointment.status === 'pending confirmation' && selectedAppointment.optionsby === 'customer' && [2, 3].includes(selectedAppointment.pickupoptions?.length) && selectedAppointment.book?.status === 'reserved'"
            :disabled="detailLoading || !!detailError" :key="selectedAppointment.id" :appointment="selectedAppointment" v-model:saving="saving" @updated="pickupOptionsUpdated" />
        <template v-if="['pending confirmation', 'appointment confirmed'].includes(selectedAppointment.status)" #actions>
            <template v-if="selectedAppointment.status === 'pending confirmation'">
                <Button type="button" variant="destructive" class="flex-1 " :disabled="detailLoading || !!detailError || loading || saving || !!rejectHint" @click="updateAppointments('rejected', [selectedAppointment])" :loading="saving && savingAction === 'rejected'"><AppIcon name="cancel" />Reject</Button>
                <Button v-if="!selectedAppointment.pickupoptions?.length" type="button" class="flex-1 " :disabled="detailLoading || !!detailError || loading || saving || !!detailsHint" @click="updateAppointments('appointment confirmed', [selectedAppointment])" :loading="saving && savingAction === 'appointment confirmed'"><AppIcon name="success" />Confirm</Button>
            </template>
            <Button v-else type="button" class="w-full " :disabled="detailLoading || !!detailError || loading || saving || !!detailsHint" @click="updateAppointments('collected', [selectedAppointment])" :loading="saving && savingAction === 'collected'"><AppIcon name="success" />Mark collected</Button>
        </template>
    </AdminDetailsDialog>
</template>
