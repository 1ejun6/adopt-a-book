<script setup>
import { computed, reactive, ref, watch } from 'vue';
import { toast } from 'vue-sonner';
import { api } from '@/lib/api';
import { useConfirmation } from '@/lib/confirmation';
import AdminList from '@/components/admin/AdminList.vue';
import AdminDetailsDialog from '@/components/admin/AdminDetailsDialog.vue';
import BookIdentity from '@/components/shared/AppBookIdentity.vue';
import StatusBadge from '@/components/shared/AppStatusBadge.vue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Cancel01Icon } from '@hugeicons/core-free-icons';

const appointments = ref([]);
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
const loading = ref(false);
const saving = ref(false);
const { confirm } = useConfirmation();
const loadError = ref('');
const filters = reactive({ search: '', date: '', view: 'awaiting', status: 'all' });
const page = ref(1);
const pageSize = 15;
const today = ref('');
let requestId = 0;

const viewTabs = [
    { value: 'awaiting', label: 'Awaiting confirmation' },
    { value: 'today', label: "Today's pickup" },
    { value: 'upcoming', label: 'Upcoming' },
    { value: 'overdue', label: 'Overdue' },
    { value: 'history', label: 'History' }
];
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
function matchesView(appointment, view) {
    const active = ['pending confirmation', 'appointment confirmed'].includes(appointment.status);
    if (view === 'awaiting') { return appointment.status === 'pending confirmation' && appointment.appointmentdate > today.value; }
    if (view === 'history') { return !active; }
    if (!active) { return false; }
    if (view === 'today') { return appointment.status === 'appointment confirmed' && appointment.appointmentdate === today.value; }
    return view === 'upcoming' ? appointment.appointmentdate > today.value :
        appointment.appointmentdate < today.value || (appointment.status === 'pending confirmation' && appointment.appointmentdate === today.value);
}
const counts = computed(() => Object.fromEntries(viewTabs.map(tab => [tab.value,
    appointments.value.filter(appointment => matchesView(appointment, tab.value)).length
])));

//@lee-hlmilk > combine search &&& date &&& status within each tab > keep earliest pickups first
const filteredAppointments = computed(() => {
    const search = filters.search.trim().toLowerCase();
    return appointments.value.filter(appointment => matchesView(appointment, filters.view) &&
        (!filters.date || appointment.appointmentdate === filters.date) &&
        (filters.status === 'all' || appointment.status === filters.status) &&
        [appointment.customer, appointment.email, appointment.booktitle, appointment.book?.authors?.join(', '), appointment.location]
            .filter(Boolean).join(' ').toLowerCase().includes(search)
    ).sort((a, b) => a.appointmentdate.localeCompare(b.appointmentdate) || a.timeslot.localeCompare(b.timeslot));
});
const hasFilters = computed(() => filters.search.trim() || filters.date || filters.status !== 'all');
const pageCount = computed(() => Math.max(1, Math.ceil(filteredAppointments.value.length / pageSize)));
const visibleAppointments = computed(() => filteredAppointments.value.slice((page.value - 1) * pageSize, page.value * pageSize));
const selectedAppointments = computed(() => visibleAppointments.value.filter(appointment => selectedIds.value.includes(appointment.id)));

//@lee-hlmilk > mirror action availability for feedback > SQL remains responsible for validating each transition
function actionHint(rows, status) {
    const requiredStatus = status === 'collected' ? 'appointment confirmed' : 'pending confirmation';
    if (rows.some(appointment => appointment.status !== requiredStatus)) {
        return status === 'collected' ? 'Only confirmed appointments can be marked collected.' : 'Only appointments awaiting confirmation can be confirmed.';
    }
    if (status === 'appointment confirmed' && rows.some(appointment => appointment.appointmentdate < today.value)) { return 'Past appointments cannot be confirmed. The customer needs to reschedule.'; }
    if (rows.some(appointment => appointment.book?.status !== 'reserved')) { return 'The copy must still be reserved for collection.'; }
    return '';
}
const confirmHint = computed(() => actionHint(selectedAppointments.value, 'appointment confirmed'));
const collectHint = computed(() => actionHint(selectedAppointments.value, 'collected'));
const selectionHint = computed(() => {
    if (['upcoming', 'overdue'].includes(filters.view) && new Set(selectedAppointments.value.map(appointment => appointment.status)).size > 1) {
        return 'Filter by Pending to confirm appointments, or Confirmed to mark them collected.';
    }
    return selectedAppointments.value.every(appointment => appointment.status === 'pending confirmation') ? confirmHint.value : collectHint.value;
});

function formatDate(value) {
    return new Date(`${value}T00:00:00+08:00`).toLocaleDateString('en-SG', { dateStyle: 'medium', timeZone: 'Asia/Singapore' });
}

function openAppointment(appointment) {
    if (loading.value || saving.value) { return; }
    selectedAppointment.value = appointment;
    detailsOpen.value = true;
}

async function fetchAppointments() {
    const id = ++requestId;
    loading.value = true;
    loadError.value = '';
    selectedIds.value = [];
    today.value = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Singapore', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    try {
        //@lee-hlmilk > appointments contain IDs > reuse application relations for customer name/email &&& book details
        const [response, applications] = await Promise.all([api('/admin/appointments'), api('/admin/applications')]);
        if (id !== requestId) { return; }
        const customers = new Map(applications.adoptionapplications.map(application => [application.userid?.id, application.userid]));
        const books = new Map(applications.adoptionapplications.map(application => [application.bookid?.id, application.bookid]));
        appointments.value = response.appointments.map(appointment => ({
            ...appointment, customer: customers.get(appointment.userid)?.name || 'Unknown customer',
            email: customers.get(appointment.userid)?.email, book: books.get(appointment.bookid)
        }));
        page.value = Math.min(page.value, pageCount.value);
    } catch (error) {
        if (id !== requestId) { return; }
        loadError.value = error.message;
        toast.error(error.message, { action: { label: 'retry', onClick: fetchAppointments } });
    } finally {
        if (id === requestId) { loading.value = false; }
    }
}

//@lee-hlmilk > API updates one appointment per request > report partial failures &&& reload authoritative statuses
async function updateAppointments(status, rows = selectedAppointments.value) {
    if (loading.value || saving.value || !rows.length || actionHint(rows, status)) { return; }
    const targets = [...rows];
    const single = targets.length === 1;
    if (!await confirm(`${status === 'collected' ? 'Mark' : 'Confirm'} ${single ? 'appointment' : 'appointments'}${status === 'collected' ? ' collected' : ''}?`, {
        description: (status === 'collected'
            ? single ? 'Confirm that this customer has physically received their book. The copy will become adopted.' : 'Confirm that these customers have physically received their books. Their copies will become adopted.'
            : single ? 'Confirm the requested date, time, and collection location.' : 'Confirm the requested dates, times, and collection locations.') +
            '\n' + targets.map(appointment => `${appointment.customer} — ${appointment.booktitle}\n${formatDate(appointment.appointmentdate)} · ${appointment.timeslot} · ${appointment.location}`).join('\n'),
        actionLabel: status === 'collected' ? 'Mark collected' : 'Confirm'
    })) { return; }
    if (loading.value || saving.value) { return; }
    const current = targets.map(target => appointments.value.find(appointment => appointment.id === target.id));
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
        if (completed) { toast.success(`${completed} ${completed === 1 ? 'appointment' : 'appointments'} ${status === 'collected' ? 'marked collected' : 'confirmed'}`); }
        if (failures.length) { toast.error(`${failures.length} ${failures.length === 1 ? 'update' : 'updates'} failed`, { description: failures.join('\n'), style: { whiteSpace: 'pre-line' } }); }
        await fetchAppointments();
    } finally { saving.value = false; }
}

watch(filters, () => { page.value = 1; selectedIds.value = []; });
watch(() => filters.view, () => { filters.status = 'all'; });
watch(page, () => { selectedIds.value = []; });
fetchAppointments();
</script>

<template>
    <!--@lee-hlmilk > list models update local filters &&& page > History disables selection while keeping record details available-->
    <AdminList title="Appointments" description="Manage appointments and book collections."
        v-model:search="filters.search" v-model:tab="filters.view" v-model:selectedIds="selectedIds" v-model:page="page"
        :rows="visibleAppointments" :columns="columns" :tabs="viewTabs" :counts="counts" :loading="loading" :disabled="saving"
        :selectable="filters.view !== 'history'"
        :error="loadError" searchPlaceholder="Search by Customer, Email, Book, Location..."
        :pagination="{ itemLabel: 'appointments', total: filteredAppointments.length, pageSize, pageCount }" @openRow="openAppointment">
        <template #filters>
            <!--@lee-hlmilk > relative wrapper anchors Clear > datetime-edit padding reserves text space beside Clear &&& the native picker-->
            <div class="relative flex w-full sm:w-44">
                <Input v-model="filters.date" type="date" aria-label="Collection date" class="h-auto flex-1 p-2.5 text-sm leading-4 [&::-webkit-datetime-edit]:pr-7" />
                <button v-if="filters.date" type="button" class="absolute inset-y-0 right-8 flex w-7 items-center justify-center" aria-label="Clear collection date" @click="filters.date = ''">
                    <HugeiconsIcon :icon="Cancel01Icon" class="size-4" aria-hidden="true" />
                </button>
            </div>
            <select v-model="filters.status" aria-label="Appointment status" class="w-full min-w-0 rounded-lg border p-2.5 text-sm leading-4 sm:w-auto">
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
            <Button size="sm" :disabled="loading || saving || !!confirmHint" @click="updateAppointments('appointment confirmed')">Confirm appointments</Button>
            <Button size="sm" variant="outline" :disabled="loading || saving || !!collectHint" @click="updateAppointments('collected')">Mark collected</Button>
        </template>
        <template #cellCustomer="{ row }">
            <p class="truncate">{{ row.customer }}</p>
            <small class="block truncate text-sm text-muted-foreground">{{ row.email || 'Email not provided' }}</small>
        </template>
        <template #cellBook="{ row }">
            <BookIdentity :title="row.booktitle" :author="row.book?.authors?.join(', ') || 'Unknown Author'" :cover="row.book?.coverurl" />
        </template>
        <template #cellCollection="{ row }">
            <p>{{ formatDate(row.appointmentdate) }} · {{ row.timeslot }}</p>
            <p class="text-muted-foreground">{{ row.location }}</p>
        </template>
        <template #cellStatus="{ value }"><StatusBadge :status="value" /></template>
        <template #empty>
            <h2>{{ hasFilters ? 'No matching appointments' : emptyTitles[filters.view] }}</h2>
            <p class="text-sm text-muted-foreground">{{ hasFilters ? 'Try another search term, date, status, or view.' : 'Pickup bookings will appear in their corresponding view.' }}</p>
        </template>
    </AdminList>

    <AdminDetailsDialog v-if="selectedAppointment" :open="detailsOpen" title="Appointment details"
        :book="{ ...selectedAppointment.book, title: selectedAppointment.booktitle }" :status="selectedAppointment.status"
        :fields="appointmentFields" @update:open="detailsOpen = $event">
        <!--@lee-hlmilk > completed ||| inactive appointments are read-only > active pickups show the next step-->
        <p v-if="['pending confirmation', 'appointment confirmed'].includes(selectedAppointment.status)" class="text-muted-foreground">
            {{ detailsHint || (selectedAppointment.status === 'pending confirmation' ? 'Confirm after checking the requested date, time, and location.' : 'Mark collected only after the customer has physically received the book.') }}
        </p>
        <template v-if="['pending confirmation', 'appointment confirmed'].includes(selectedAppointment.status)" #actions>
            <Button v-if="selectedAppointment.status === 'pending confirmation'" type="button" class="w-full" :disabled="!!detailsHint" @click="updateAppointments('appointment confirmed', [selectedAppointment])">Confirm appointment</Button>
            <Button v-else type="button" class="w-full" :disabled="!!detailsHint" @click="updateAppointments('collected', [selectedAppointment])">Mark collected</Button>
        </template>
    </AdminDetailsDialog>
</template>
