<script setup>
import AppIcon from '@/components/shared/AppIcon.vue';
import { pickupEvent, eventCalendar } from '@/lib/calendar';
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
import AppFilterSelect from '@/components/shared/AppFilterSelect.vue';
import AdminDetailsDialog from '@/components/admin/AdminDetailsDialog.vue';
import BookIdentity from '@/components/shared/AppBookIdentity.vue';
import AppDatePicker from '@/components/shared/AppDatePicker.vue';
import StatusBadge from '@/components/shared/AppStatusBadge.vue';
import StatusLegend from '@/components/shared/AppStatusLegend.vue';
import { Button } from '@/components/ui/button';

const router = useRouter();
const navigation = router.options.history.state;
const selectedIds = ref([]);
const selectedAppointment = ref(null);
const calendarEvent = computed(() => pickupEvent(selectedAppointment.value, selectedAppointment.value?.booktitle, currentTime.value));
const calendarDownloadUrl = computed(() => calendarEvent.value ? `data:text/calendar;charset=utf-8,${encodeURIComponent(eventCalendar(calendarEvent.value))}` : '');
const choosingPickupTime = computed(() => selectedAppointment.value?.status === 'pending confirmation' && selectedAppointment.value.optionsby === 'customer' && [2, 3].includes(selectedAppointment.value.pickupoptions?.length) && selectedAppointment.value.book?.status === 'reserved');
//@lee-hlmilk > collection fields &&& action availability stay in the view > shared dialog handles presentation
const appointmentFields = computed(() => [
    { label: 'Customer', value: selectedAppointment.value?.customer },
    { label: 'Email', value: selectedAppointment.value?.email },
    { label: 'Collection date', value: selectedAppointment.value?.appointmentdate ? formatDate(selectedAppointment.value.appointmentdate) : null },
    { label: 'Time', value: selectedAppointment.value?.status === 'pending confirmation' && selectedAppointment.value?.optionsby === 'customer' ? 'Choose from the proposed times below' : selectedAppointment.value?.timeslot },
    { key: 'location', label: 'Location', value: selectedAppointment.value?.location }
].filter(field => field.label !== 'Time' || !choosingPickupTime.value));
const detailsHint = computed(() => selectedAppointment.value ? actionHint([selectedAppointment.value], selectedAppointment.value.status === 'pending confirmation' ? 'appointment confirmed' : 'collected') : '');
const detailsOpen = ref(false);
const { detailError, detailLoading, refreshDetail } = useAdminRecord(selectedAppointment, detailsOpen, '/admin/appointments', 'appointment', { busy: () => saving.value });
const saving = ref(false);
const savingAction = ref('');
const { confirm } = useConfirmation();

const viewTabs = [
    { value: 'awaiting', label: 'Action Needed', status: 'pending confirmation' },
    { value: 'today', label: "Today's Pickup", status: 'appointment confirmed' },
    { value: 'upcoming', label: 'Upcoming', status: 'appointment confirmed' },
    { value: 'overdue', label: 'Overdue', status: 'overdue', tone: 'red' },
    { value: 'history', label: 'History', status: 'history', tone: 'neutral' }
];
const appointmentStatuses = [
    { value: 'pending confirmation', label: 'Pending' },
    { value: 'appointment confirmed', label: 'Confirmed' },
    { value: 'collected', label: 'Collected' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'rejected', label: 'Rejected' }
];
//@lee-hlmilk > dashboard links choose the initial queue through navigation state > keep the URL clean
const filters = reactive({ search: '', date: '', view: viewTabs.some(tab => tab.value === navigation.view) ? navigation.view : 'awaiting', status: 'all' });
const columns = [
    { key: 'customer', label: 'Customer', class: 'w-1/5', mobileClass: 'col-span-2 flex items-baseline gap-2' },
    { key: 'book', label: 'Requested copy', mobileClass: 'col-start-1 row-start-1' },
    { key: 'collection', label: 'Collection', class: 'w-1/4' },
    { key: 'status', label: 'Status', class: 'w-48 text-center', mobileClass: 'col-start-2 row-start-1' }
];
const emptyTitles = {
    awaiting: 'No appointments need action',
    today: 'No pickups today',
    upcoming: 'No upcoming appointments',
    overdue: 'No overdue appointments',
    history: 'No appointment history'
};

//@lee-hlmilk > today's pickups must be confirmed > pending requests due today ||| earlier belong in overdue
async function pickupOptionsUpdated(appointment) {
    selectedAppointment.value = { ...selectedAppointment.value, ...appointment };
    if (appointment.status === 'appointment confirmed') toast.success('Pickup confirmed');
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
    const subject = single ? 'appointment' : `${targets.length} appointments`;
    const title = status === 'collected'
        ? single ? 'Has the customer collected the book?' : `Have these ${targets.length} books been collected?`
        : `${action} ${subject}?`;
    if (!await confirm(title, {
        actionLabel: status === 'collected' ? 'Yes, collected' : action,
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
        :tabDescription="filters.view === 'awaiting' ? 'open each pending appointment and confirm one of the customer’s proposed pickup times.' : ''"
        v-model:search="filters.search" v-model:tab="filters.view" v-model:selectedIds="selectedIds" v-model:page="page"
        :rows="appointments" :columns="columns" :tabs="viewTabs" :counts="counts" :loading="loading" :disabled="saving"
        :selectable="filters.view !== 'history'"
        :error="loadError" searchPlaceholder="Search by customer, email, book or location..."
        :emptyKey="JSON.stringify(filters)" :emptyTitle="hasFilters ? 'No matching appointments' : emptyTitles[filters.view]"
        :emptyDescription="hasFilters ? emptyFilterHint : 'Pickup bookings will appear in their corresponding view.'"
        :pagination="{ itemLabel: 'appointments', total, pageSize, pageCount }" @openRow="openAppointment">
        <template #legend><StatusLegend :statuses="appointmentStatuses" /></template>
        <template #filters>
            <AppDatePicker filter v-model="filters.date" label="Collection date" :disabled="filters.view === 'today'" />
            <AppFilterSelect v-model="filters.status" :disabled="['awaiting', 'today'].includes(filters.view)" aria-label="Appointment status">
                <option value="all">All</option>
                <template v-if="filters.view === 'history'">
                    <option value="collected">Collected</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="rejected">Rejected</option>
                </template>
                <template v-else>
                    <option value="pending confirmation">Pending</option>
                    <option value="appointment confirmed">Confirmed</option>
                </template>
            </AppFilterSelect>
        </template>
        <template #selectionActions>
            <p v-if="confirmHint && collectHint" class="text-sm text-muted-foreground" role="status">
                {{ selectionHint }}
            </p>
            <Button title="Confirm" :disabled="detailLoading || !!detailError || loading || saving || !!confirmHint" @click="updateAppointments('appointment confirmed')" :loading="saving && savingAction === 'appointment confirmed'"><AppIcon name="success" class="text-success-foreground" /><span class="sr-only">Confirm</span></Button>
            <Button title="Mark collected" variant="outline" :disabled="detailLoading || !!detailError || loading || saving || !!collectHint" @click="updateAppointments('collected')" :loading="saving && savingAction === 'collected'"><span>Mark collected</span></Button>
        </template>
        <template #cellCustomer="{ row }">
            <p class="break-words lg:truncate">{{ row.customer }}</p>
            <small class="hidden truncate text-sm text-muted-foreground lg:block">{{ row.email || 'Email not provided' }}</small>
        </template>
        <template #cellBook="{ row }">
            <BookIdentity :title="row.booktitle" :author="row.book?.authors?.join(', ') || 'Unknown Author'" :cover="row.book?.coverurl" />
        </template>
        <template #cellCollection="{ row }">
            <p>{{ formatDate(row.appointmentdate) }}<template v-if="!(row.status === 'pending confirmation' && row.optionsby === 'customer') && row.timeslot"> · {{ row.timeslot }}</template></p>
            <p class="text-muted-foreground">{{ row.location }}</p>
        </template>
        <template #cellStatus="{ value, row }"><div class="flex items-center justify-center"><StatusBadge :status="value" dot :title="value" /></div><p v-if="value === 'pending confirmation' && pendingPickupState(row, currentTime) !== 'awaiting'" class="hidden text-sm text-destructive lg:block">Needs attention: no future pickup time or incomplete details</p></template>
    </AdminList>

    <AdminDetailsDialog :loading="detailLoading" :error="detailError" :busy="saving || detailLoading" @retry="refreshDetail" v-if="selectedAppointment" :open="detailsOpen" title="Appointment details"
        :book="{ ...selectedAppointment.book, title: selectedAppointment.booktitle }" :status="selectedAppointment.status"
        :fields="appointmentFields" @update:open="!saving && (detailsOpen = $event)">
        <template #field-location="{ field }">
            <a v-if="field.value" :href="`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(field.value)}`" target="_blank" rel="noopener noreferrer" class="underline underline-offset-4 hover:text-primary" :aria-label="`${field.value} (opens in Google Maps)`">{{ field.value }} ↗</a>
            <span v-else>Not provided</span>
        </template>
        <!--@lee-hlmilk > completed ||| inactive appointments are read-only > active pickups show the next step-->
        <p v-if="!choosingPickupTime && (detailsHint || selectedAppointment.status === 'pending confirmation') && ['pending confirmation', 'appointment confirmed'].includes(selectedAppointment.status)" class="text-muted-foreground">
            {{ detailsHint || 'Confirm after checking the requested date, time, and location.' }}
        </p>
        <a v-if="calendarEvent && !detailLoading && !detailError" :href="calendarDownloadUrl" :download="`${calendarEvent.id}.ics`" class="inline-block underline underline-offset-4 hover:text-primary">Add to calendar</a>
        <AdminPickupOptions v-if="choosingPickupTime"
            :disabled="detailLoading || !!detailError" :key="selectedAppointment.id" :appointment="selectedAppointment" v-model:saving="saving" @updated="pickupOptionsUpdated">
            <template #actions="{ disabled }">
                <Button type="button" title="Reject" variant="destructive" class="flex-1" :disabled="disabled || detailLoading || !!detailError || loading || saving || !!rejectHint" @click="updateAppointments('rejected', [selectedAppointment])" :loading="saving && savingAction === 'rejected'"><AppIcon name="cancel" /><span class="sr-only">Reject</span></Button>
            </template>
        </AdminPickupOptions>
        <template v-if="!choosingPickupTime && ['pending confirmation', 'appointment confirmed'].includes(selectedAppointment.status)" #actions>
            <template v-if="selectedAppointment.status === 'pending confirmation'">
                <Button type="button" title="Reject" variant="destructive" class="flex-1" :disabled="detailLoading || !!detailError || loading || saving || !!rejectHint" @click="updateAppointments('rejected', [selectedAppointment])" :loading="saving && savingAction === 'rejected'"><AppIcon name="cancel" /><span class="sr-only">Reject</span></Button>
                <Button v-if="!selectedAppointment.pickupoptions?.length" type="button" title="Confirm" class="flex-1 border-success-foreground text-success-foreground hover:bg-badge-green" :disabled="detailLoading || !!detailError || loading || saving || !!detailsHint" @click="updateAppointments('appointment confirmed', [selectedAppointment])" :loading="saving && savingAction === 'appointment confirmed'"><AppIcon name="success" class="text-success-foreground" /><span class="sr-only">Confirm</span></Button>
            </template>
            <Button v-else type="button" title="Mark collected" class="w-full border-success-foreground text-success-foreground hover:bg-badge-green" :disabled="detailLoading || !!detailError || loading || saving || !!detailsHint" @click="updateAppointments('collected', [selectedAppointment])" :loading="saving && savingAction === 'collected'"><span>Mark collected</span></Button>
        </template>
    </AdminDetailsDialog>
</template>
