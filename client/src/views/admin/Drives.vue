<script setup>
import { computed, reactive, ref, watch } from 'vue';
import { toast } from 'vue-sonner';
import { api } from '@/lib/api';
import { useConfirmation } from '@/lib/confirmation';
import AdminList from '@/components/admin/AdminList.vue';
import AdminTable from '@/components/admin/AdminTable.vue';
import AdminDetailsDialog from '@/components/admin/AdminDetailsDialog.vue';
import DriveFormDialog from '@/components/admin/DriveFormDialog.vue';
import BookIdentity from '@/components/shared/AppBookIdentity.vue';
import StatusBadge from '@/components/shared/AppStatusBadge.vue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const drives = ref([]);
const stations = ref([]);
const selectedIds = ref([]);
const selectedDrive = ref(null);
const editingDrive = ref(null);
const detailsOpen = ref(false);
const formOpen = ref(false);
const loading = ref(false);
const saving = ref(false);
const loadError = ref('');
const stationBooks = reactive({ rows: [], search: '', loading: false, error: '' });
const filteredStationBooks = computed(() => {
    const search = stationBooks.search.trim().toLowerCase();
    return stationBooks.rows.filter(book => [book.title, ...book.authors].join(' ').toLowerCase().includes(search));
});
const today = ref('');
const filters = reactive({ search: '', view: 'upcoming', status: 'all' });
const page = ref(1);
const pageSize = 15;
const { confirm } = useConfirmation();
let requestId = 0;
let formRequestId = 0;
let booksRequestId = 0;

const viewTabs = [{ value: 'upcoming', label: 'Upcoming' }, { value: 'past', label: 'Past' }];
const columns = [
    { key: 'title', label: 'Drive', class: 'w-2/5' },
    { key: 'eventdate', label: 'Date / location', class: 'w-1/4' },
    { key: 'registrations', label: 'Registrations', class: 'w-32' },
    { key: 'status', label: 'Status' }
];
const bookColumns = [{ key: 'title', label: 'Title / Author' }];
//@lee-hlmilk > cancelled drives belong in Past regardless of their scheduled date
function isPastDrive(drive) { return drive.eventdate < today.value || drive.status === 'cancelled'; }
const statusOptions = computed(() => filters.view === 'past' ? ['closed', 'cancelled'] : ['open', 'closed']);
const counts = computed(() => ({ upcoming: drives.value.filter(drive => !isPastDrive(drive)).length,
    past: drives.value.filter(isPastDrive).length }));
//@lee-hlmilk > drive API returns all records > filter &&& paginate locally like the other admin queues
const filteredDrives = computed(() => {
    const search = filters.search.trim().toLowerCase();
    return drives.value.filter(drive => (filters.view === 'past' ? isPastDrive(drive) : !isPastDrive(drive)) &&
        (filters.status === 'all' || drive.status === filters.status) &&
        [drive.title, drive.location, drive.mrtstation?.name].filter(Boolean).join(' ').toLowerCase().includes(search)
    ).sort((a, b) => (filters.view === 'past' ? b.eventdate.localeCompare(a.eventdate) : a.eventdate.localeCompare(b.eventdate)) || a.id.localeCompare(b.id));
});
const pageCount = computed(() => Math.max(1, Math.ceil(filteredDrives.value.length / pageSize)));
const visibleDrives = computed(() => filteredDrives.value.slice((page.value - 1) * pageSize, page.value * pageSize));
const selectedDrives = computed(() => visibleDrives.value.filter(drive => selectedIds.value.includes(drive.id)));
const pastDrive = computed(() => selectedDrive.value && isPastDrive(selectedDrive.value));
const driveFields = computed(() => [
    { label: 'Event date', value: selectedDrive.value ? formatDate(selectedDrive.value.eventdate) : null },
    { key: 'location', label: 'Location', value: selectedDrive.value?.location },
    { label: 'Registrations', value: selectedDrive.value ? `${selectedDrive.value.userids.length} / ${selectedDrive.value.maxcapacity}` : null }
]);

function formatDate(value) { return new Date(`${value}T00:00:00+08:00`).toLocaleDateString('en-SG', { dateStyle: 'medium', timeZone: 'Asia/Singapore' }); }

function actionHint(rows, status) {
    if (rows.some(drive => drive.eventdate < today.value)) { return 'Past drives cannot be closed or cancelled.'; }
    if (status === 'closed' && rows.some(drive => drive.status !== 'open')) { return 'Only open drives can close registration.'; }
    if (status === 'cancelled' && rows.some(drive => drive.status === 'cancelled')) { return 'Cancelled drives cannot be cancelled again.'; }
    return '';
}
const closeHint = computed(() => actionHint(selectedDrives.value, 'closed'));
const cancelHint = computed(() => actionHint(selectedDrives.value, 'cancelled'));

function openDrive(drive) {
    if (loading.value || saving.value) { return; }
    selectedDrive.value = drive;
    detailsOpen.value = true;
}

//@lee-hlmilk > existing catalogue filters available copies by MRT > read every page &&& ignore results from closed or switched dialogs
async function fetchStationBooks() {
    const id = ++booksRequestId;
    const stationId = selectedDrive.value?.mrtstationid;
    Object.assign(stationBooks, { rows: [], search: '', loading: false, error: '' });
    if (!detailsOpen.value || pastDrive.value || !stationId) { return; }
    stationBooks.loading = true;
    try {
        const rows = [];
        let response;
        let bookPage = 1;
        do {
            response = await api('/books', { query: { mrtstationids: stationId, status: 'available', page: bookPage++, limit: 100 } });
            if (id !== booksRequestId) { return; }
            rows.push(...response.books);
        } while (response.books.length && rows.length < response.total);
        stationBooks.rows = rows;
    } catch (error) {
        if (id !== booksRequestId) { return; }
        stationBooks.error = error.message;
        toast.error(error.message, { action: { label: 'retry', onClick: fetchStationBooks } });
    } finally { if (id === booksRequestId) { stationBooks.loading = false; } }
}

async function openForm(drive = null) {
    if (loading.value || saving.value) { return; }
    const id = ++formRequestId;
    try {
        if (!stations.value.length) { stations.value = (await api('/locations/stations')).stations; }
        if (id !== formRequestId) { return; }
        editingDrive.value = drive;
        detailsOpen.value = false;
        formOpen.value = true;
    } catch (error) { if (id === formRequestId) { toast.error(error.message); } }
}

async function fetchDrives() {
    const id = ++requestId;
    formRequestId++;
    loading.value = true;
    loadError.value = '';
    selectedIds.value = [];
    today.value = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Singapore', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    try {
        const response = await api('/admin/drives');
        if (id !== requestId) { return; }
        drives.value = response.drives;
        page.value = Math.min(page.value, pageCount.value);
    } catch (error) {
        if (id !== requestId) { return; }
        loadError.value = error.message;
        toast.error(error.message, { action: { label: 'retry', onClick: fetchDrives } });
    } finally { if (id === requestId) { loading.value = false; } }
}

async function saveDrive(data) {
    if (saving.value) { return; }
    saving.value = true;
    try {
        const response = await api(editingDrive.value ? `/admin/drives/${editingDrive.value.id}` : '/admin/drives', {
            method: editingDrive.value ? 'PATCH' : 'POST', body: data
        });
        formOpen.value = false;
        toast.success(response.message);
        await fetchDrives();
    } catch (error) { toast.error(error.message); }
    finally { saving.value = false; }
}

//@lee-hlmilk > snapshot targets before confirmation > status updates report partial failures while DELETE uses the existing atomic endpoint
async function updateDrives(status, rows = selectedDrives.value) {
    if (loading.value || saving.value || !rows.length || (status !== 'delete' && actionHint(rows, status))) { return; }
    const targets = [...rows];
    const label = status === 'closed' ? 'Close registration' : status === 'cancelled' ? 'Cancel drives' : 'Delete';
    if (!await confirm(status === 'closed' ? 'Close registration?' : `${status === 'delete' ? 'Delete' : 'Cancel'} ${targets.length === 1 ? 'drive' : 'drives'}?`, {
        description: (status === 'closed' ? 'Stop new registrations. Existing registrations remain.' : status === 'cancelled'
            ? 'These events will be cancelled. Existing registrations remain for reference.' : 'These drives and their registrations will be permanently deleted.') + '\n' + targets.map(drive => drive.title).join('\n'),
        actionLabel: label, destructive: status !== 'closed'
    })) { return; }
    if (loading.value || saving.value) { return; }
    const current = targets.map(target => drives.value.find(drive => drive.id === target.id));
    if (current.some(drive => !drive) || (status !== 'delete' && actionHint(current, status))) { toast.error('These drives have changed. Select them again.'); return; }
    saving.value = true;
    detailsOpen.value = false;
    let completed = 0;
    const failures = [];
    try {
        if (status === 'delete') {
            await api('/admin/drives', { method: 'DELETE', body: { ids: targets.map(drive => drive.id) } });
            completed = targets.length;
        } else {
            for (const drive of targets) {
                try { await api(`/admin/drives/${drive.id}`, { method: 'PATCH', body: { status } }); completed++; }
                catch (error) { failures.push(`${drive.title}: ${error.message}`); }
            }
        }
        if (completed) { toast.success(`${completed} ${completed === 1 ? 'drive' : 'drives'} ${status === 'delete' ? 'deleted' : status}`); }
        if (failures.length) { toast.error(`${failures.length} ${failures.length === 1 ? 'update' : 'updates'} failed`, { description: failures.join('\n'), style: { whiteSpace: 'pre-line' } }); }
    } catch (error) { toast.error(error.message); }
    finally { await fetchDrives(); saving.value = false; }
}

watch(() => filters.view, () => { filters.status = 'all'; });
watch(() => [detailsOpen.value, selectedDrive.value?.mrtstationid, pastDrive.value], fetchStationBooks);
watch(filters, () => { page.value = 1; selectedIds.value = []; });
watch(page, () => { selectedIds.value = []; });
fetchDrives();
</script>

<template>
    <!--@lee-hlmilk > list models update this view > Past hides selection &&& actions while retaining the table's column alignment-->
    <AdminList title="Drives" description="Manage adoption drives and registrations."
        v-model:search="filters.search" v-model:tab="filters.view" v-model:selectedIds="selectedIds" v-model:page="page"
        :rows="visibleDrives" :columns="columns" :tabs="viewTabs" :counts="counts" :loading="loading" :disabled="saving" :selectable="filters.view !== 'past'"
        :error="loadError" searchPlaceholder="Search by Title, Venue, MRT station..."
        :pagination="{ itemLabel: 'drives', total: filteredDrives.length, pageSize, pageCount }" @openRow="openDrive">
        <template #headerActions><Button :disabled="loading || saving" @click="openForm()">Create drive</Button></template>
        <template #filters>
            <select v-model="filters.status" aria-label="Drive status" class="w-full rounded-lg border p-2.5 text-sm leading-4 sm:w-auto">
                <option value="all">All statuses</option>
                <option v-for="status in statusOptions" :key="status" :value="status">{{ status.charAt(0).toUpperCase() + status.slice(1) }}</option>
            </select>
        </template>
        <template #selectionActions="{ onlyOne }">
            <Button v-if="onlyOne" size="sm" variant="outline" :disabled="loading || saving" @click="openForm(selectedDrives[0])">Edit</Button>
            <p v-if="closeHint && cancelHint && filters.view !== 'past'" class="text-sm text-muted-foreground" role="status">{{ cancelHint }}</p>
            <Button v-if="filters.view !== 'past'" size="sm" :disabled="loading || saving || !!closeHint" @click="updateDrives('closed')">Close registration</Button>
            <Button v-if="filters.view !== 'past'" size="sm" variant="outline" :disabled="loading || saving || !!cancelHint" @click="updateDrives('cancelled')">Cancel drives</Button>
            <Button size="sm" variant="destructive" :disabled="loading || saving" @click="updateDrives('delete')">Delete</Button>
        </template>
        <template #cellTitle="{ value }"><strong class="block truncate font-heading font-normal text-lg">{{ value }}</strong></template>
        <template #cellEventdate="{ row }">
            <p>{{ formatDate(row.eventdate) }}</p>
            <small class="block truncate text-sm text-muted-foreground">{{ row.location }}</small>
        </template>
        <template #cellRegistrations="{ row }">{{ row.userids.length }} / {{ row.maxcapacity }}</template>
        <template #cellStatus="{ value }"><StatusBadge :status="value" /></template>
        <template #empty>
            <h2>{{ filters.search.trim() || filters.status !== 'all' ? 'No matching drives' : filters.view === 'past' ? 'No past drives' : 'No upcoming drives' }}</h2>
            <p class="text-sm text-muted-foreground">Try another status, search term, or view.</p>
        </template>
    </AdminList>

    <AdminDetailsDialog v-if="selectedDrive" :open="detailsOpen" title="Drive details" :status="selectedDrive.status" :fixedLayout="!pastDrive"
        :description="selectedDrive.description || 'No description recorded.'" :fields="driveFields" @update:open="detailsOpen = $event">
        <template #summary><h2 class="min-w-0 flex-1">{{ selectedDrive.title }}</h2></template>
        <template #field-location="{ field }">
            <!--@lee-hlmilk > field-location matches the field's key > scoped field data keeps the map link beside its location-->
            <p>{{ field.value }}</p>
            <a :href="`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(field.value)}`" target="_blank" rel="noopener noreferrer" class="underline">Open in Google Maps ↗</a>
        </template>
        <!--@lee-hlmilk > min-h-0 lets this section shrink inside fixedLayout > only the capped book region scrolls-->
        <section v-if="!pastDrive" class="flex min-h-0 flex-col gap-2.5" aria-labelledby="drive-books-title">
            <h2 id="drive-books-title" class="shrink-0">Available books</h2>
            <Input v-if="selectedDrive.mrtstationid" v-model="stationBooks.search" type="search" aria-label="Search available books by title or author"
                class="shrink-0" placeholder="Search by Title or Author..." :disabled="stationBooks.loading" />
            <p v-if="!selectedDrive.mrtstationid" class="text-muted-foreground">No MRT station assigned to this drive.</p>
            <!--@lee-hlmilk > contain long book lists within their own scroll area > no selection or record actions-->
            <div v-else-if="!stationBooks.error" class="min-h-0 max-h-80 overflow-x-hidden overflow-y-auto" tabindex="0" role="region" aria-label="Available books at this MRT station">
                <AdminTable compact :rows="filteredStationBooks" :columns="bookColumns" :isLoading="stationBooks.loading"
                    :selectable="false" :selectionColumn="false" rowAction="none"
                    :emptyTitle="stationBooks.search.trim() ? 'No matching books' : 'No available books'"
                    :emptyDescription="stationBooks.search.trim() ? 'Try another title or author.' : 'No available books are assigned to this MRT station.'">
                    <template #cellTitle="{ row }"><BookIdentity :title="row.title" :author="row.authors.join(', ')" :cover="row.coverurl" /></template>
                </AdminTable>
            </div>
        </section>
        <template v-if="!pastDrive" #actions>
            <!--@lee-hlmilk > two equal columns on mobile > sm gives each visible action an equal column across the footer-->
            <div class="grid w-full grid-cols-2 gap-2.5 sm:grid-flow-col sm:auto-cols-fr sm:grid-cols-none">
                <Button type="button" variant="outline" :disabled="loading || saving" @click="openForm(selectedDrive)">Edit</Button>
                <Button v-if="selectedDrive.eventdate >= today && selectedDrive.status === 'open'" type="button" :disabled="loading || saving" @click="updateDrives('closed', [selectedDrive])">Close registration</Button>
                <Button v-if="selectedDrive.eventdate >= today && selectedDrive.status !== 'cancelled'" type="button" variant="outline" :disabled="loading || saving" @click="updateDrives('cancelled', [selectedDrive])">Cancel drive</Button>
                <Button type="button" variant="destructive" :disabled="loading || saving" @click="updateDrives('delete', [selectedDrive])">Delete</Button>
            </div>
        </template>
    </AdminDetailsDialog>
    <!--@lee-hlmilk > saved drive &&& station options flow down > visibility updates &&& validated draft payload flow back up-->
    <DriveFormDialog :open="formOpen" :drive="editingDrive" :stations="stations" :today="today" :submitting="saving" @update:open="formOpen = $event" @submit="saveDrive" />
</template>
