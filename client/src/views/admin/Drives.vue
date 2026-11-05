<script setup>
import AppIcon from '@/components/shared/AppIcon.vue';
import AppCalendarButton from '@/components/shared/AppCalendarButton.vue';
import { driveEvent } from '@/lib/calendar';
import { currentTime } from '@/lib/clock';
import { driveHasEnded, driveTimeLabel } from '../../../../shared/drives.mjs';
import { useAdminRecord } from '@/composables/useAdminRecord';
import { computed, reactive, ref, watch } from 'vue';
import { toast } from 'vue-sonner';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/date';
import { useServerPagination } from '@/composables/useServerPagination';
import { useConfirmation } from '@/lib/confirmation';
import AdminList from '@/components/admin/AdminList.vue';
import AppFilterSelect from '@/components/shared/AppFilterSelect.vue';
import AppAdoptionDriveBooks from '@/components/shared/AppAdoptionDriveBooks.vue';
import AdminDetailsDialog from '@/components/admin/AdminDetailsDialog.vue';
import DriveFormDialog from '@/components/admin/DriveFormDialog.vue';
import AppDatePicker from '@/components/shared/AppDatePicker.vue';
import StatusBadge from '@/components/shared/AppStatusBadge.vue';
import AppAdoptionDriveLegend from '@/components/shared/AppAdoptionDriveLegend.vue';
import { Button } from '@/components/ui/button';

const stations = ref([]);
const selectedIds = ref([]);
const selectedDrive = ref(null);
const editingDrive = ref(null);
const detailsOpen = ref(false);
const { detailError, detailLoading, refreshDetail } = useAdminRecord(selectedDrive, detailsOpen, '/admin/drives', 'drive', { busy: () => saving.value || !!formLoading.value });
const formOpen = ref(false);
const saving = ref(false);
const booksRevision = ref(0);
const formLoading = ref('');
const today = ref('');
const filters = reactive({ search: '', date: '', view: 'upcoming', status: 'all' });
const { confirm } = useConfirmation();
let formRequestId = 0;

const viewTabs = [{ value: 'upcoming', label: 'Upcoming' }, { value: 'past', label: 'History/Cancelled' }];
const columns = [
    { key: 'title', label: 'Drive', class: 'w-2/5', mobileClass: 'col-start-1 row-start-1' },
    { key: 'eventdate', label: 'Date / location', class: 'w-1/4' },
    { key: 'registrations', label: 'Registrations', class: 'w-32', mobileClass: 'col-span-2 flex items-baseline gap-2' },
    { key: 'status', label: 'Status', class: 'text-center', mobileClass: 'col-start-2 row-start-1' }
];
//@lee-hlmilk > cancelled drives belong in Past regardless of their scheduled date
function isPastDrive(drive) { return driveHasEnded(drive, currentTime.value); }
const statusOptions = computed(() => filters.view === 'past' ? ['closed', 'cancelled'] : ['open', 'closed']);
//@lee-hlmilk > SQL owns tab/date/search filtering > only this page is loaded
const { rows: drives, page, pageSize, total, counts, pageCount, loading, loadError, refresh: fetchDrives } = useServerPagination({
    busy: () => saving.value || !!formLoading.value, endpoint: '/admin/drives', filters, selectedIds, read: response => response.drives,
    beforeLoad: () => { formRequestId++; formLoading.value = ''; }, onResponse: response => { today.value = response.today; }
});
const selectedDrives = computed(() => drives.value.filter(drive => selectedIds.value.includes(drive.id)));
const pastDrive = computed(() => selectedDrive.value && isPastDrive(selectedDrive.value));
const driveFields = computed(() => [
    { label: 'Event date', value: selectedDrive.value ? formatDate(selectedDrive.value.eventdate) : null },
    { label: 'Time', value: driveTimeLabel(selectedDrive.value) },
    { key: 'location', label: 'Location', value: selectedDrive.value?.location },
    { label: 'Registrations', value: selectedDrive.value ? `${selectedDrive.value.userids.length} / ${selectedDrive.value.maxcapacity}` : null }
]);

function actionHint(rows) {
    if (rows.some(drive => drive.eventdate < today.value)) { return 'Past drives cannot be cancelled.'; }
    if (rows.some(drive => drive.status === 'cancelled')) { return 'Cancelled drives cannot be cancelled again.'; }
    return '';
}
const cancelHint = computed(() => actionHint(selectedDrives.value));

function openDrive(drive) {
    if (loading.value || saving.value || formLoading.value) { return; }
    selectedDrive.value = drive;
    detailsOpen.value = true;
}

async function openForm(drive = null) {
    if (loading.value || saving.value || formLoading.value) { return; }
    const id = ++formRequestId;
    formLoading.value = drive ? 'edit' : 'create';
    try {
        if (!stations.value.length) { stations.value = (await api('/locations/stations')).stations; }
        if (id !== formRequestId) { return; }
        const fullDrive = drive ? (await api(`/admin/drives/${drive.id}`)).drive : null;
        if (id !== formRequestId) return;
        editingDrive.value = fullDrive;
        detailsOpen.value = false;
        formOpen.value = true;
    } catch (error) { if (id === formRequestId) { toast.error(error.message); } }
    finally { if (id === formRequestId) { formLoading.value = ''; } }
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
        await refreshDetail();
    } catch (error) {
        if (error.status === 409) booksRevision.value++;
        toast.error(error.message);
    }
    finally { saving.value = false; }
}

// Snapshot targets before confirmation and report individual cancellation failures.
async function cancelDrives(rows = selectedDrives.value) {
    if (detailLoading.value || detailError.value || loading.value || saving.value || formLoading.value || !rows.length || actionHint(rows)) { return; }
    const targets = [...rows];
    if (!await confirm(`Cancel ${targets.length === 1 ? 'drive' : `${targets.length} drives`}?`, {
        actionLabel: 'Cancel', destructive: true
    })) { return; }
    if (loading.value || saving.value || formLoading.value) { return; }
    const current = targets.map(target => drives.value.find(drive => drive.id === target.id));
    if (current.some(drive => !drive) || actionHint(current)) { toast.error('These drives have changed. Select them again.'); return; }
    saving.value = true;
    let completed = 0;
    const failures = [];
    try {
        for (const drive of targets) {
            try { await api(`/admin/drives/${drive.id}`, { method: 'PATCH', body: { status: 'cancelled' } }); completed++; }
            catch (error) { failures.push(`${drive.title}: ${error.message}`); }
        }
        if (completed) { toast.success(`${completed} ${completed === 1 ? 'drive' : 'drives'} cancelled`); }
        if (failures.length) { toast.error(`${failures.length} ${failures.length === 1 ? 'update' : 'updates'} failed`, { description: failures.join('\n'), style: { whiteSpace: 'pre-line' } }); }
    } catch (error) { toast.error(error.message); }
    finally { await fetchDrives();
        await refreshDetail(); saving.value = false; }
}

watch(() => filters.view, () => { filters.status = 'all'; });
fetchDrives();
</script>

<template>
    <!--@lee-hlmilk > list models update this view > Past hides selection &&& actions while retaining the table's column alignment-->
    <AdminList @retry="fetchDrives" title="Drives" description="manage adoption drives and registrations"
        v-model:search="filters.search" v-model:tab="filters.view" v-model:selectedIds="selectedIds" v-model:page="page"
        :rows="drives" :columns="columns" :tabs="viewTabs" :counts="counts" :loading="loading" :disabled="saving || !!formLoading" :selectable="filters.view !== 'past'"
        :error="loadError" searchPlaceholder="Search by title, venue or MRT station..."
        :emptyKey="JSON.stringify(filters)"
        :emptyTitle="filters.search.trim() || filters.date || filters.status !== 'all' ? 'No matching drives' : filters.view === 'past' ? 'No past drives' : 'No upcoming drives'"
        emptyDescription="Try another date, status, search term, or view."
        :pagination="{ itemLabel: 'drives', total, pageSize, pageCount }" @openRow="openDrive">
        <template #headerActions><Button title="Add drive" :loading="formLoading === 'create'" :disabled="detailLoading || !!detailError || loading || saving || !!formLoading" @click="openForm()"><AppIcon name="add" /><span class="sr-only">Add drive</span></Button></template>
        <template #legend>
            <AppAdoptionDriveLegend v-model:status="filters.status" :statuses="statusOptions" class="justify-start" />
        </template>
        <template #filters>
            <AppDatePicker filter v-model="filters.date" label="Event date" />
            <AppFilterSelect v-model="filters.status" aria-label="Drive status">
                <option value="all">All</option>
                <option v-for="status in statusOptions" :key="status" :value="status">{{ status.charAt(0).toUpperCase() + status.slice(1) }}</option>
            </AppFilterSelect>
        </template>
        <template #selectionActions="{ onlyOne }">
            <Button v-if="onlyOne" variant="outline" :loading="formLoading === 'edit'" :disabled="detailLoading || !!detailError || loading || saving || !!formLoading" @click="openForm(selectedDrives[0])"><AppIcon name="edit" /><span class="sr-only">Edit</span></Button>
            <p v-if="cancelHint && filters.view !== 'past'" class="text-sm text-muted-foreground" role="status">{{ cancelHint }}</p>
            <Button v-if="filters.view !== 'past'" variant="outline" :disabled="detailLoading || !!detailError || loading || saving || !!cancelHint" @click="cancelDrives()" :loading="saving">Cancel</Button>
        </template>
        <template #cellTitle="{ value }"><strong class="block break-words lg:truncate font-heading font-normal text-lg">{{ value }}</strong></template>
        <template #cellEventdate="{ row }">
            <p>{{ formatDate(row.eventdate) }}</p><p>{{ driveTimeLabel(row) }}</p>
            <small class="block break-words text-sm lg:truncate lg:text-muted-foreground">{{ row.location }}</small>
        </template>
        <template #cellRegistrations="{ row }">{{ row.userids.length }} / {{ row.maxcapacity }}</template>
        <template #cellStatus="{ value }"><div class="flex items-center justify-center"><StatusBadge :status="value" dot :title="value" /></div></template>
    </AdminList>

    <AdminDetailsDialog :loading="detailLoading" :error="detailError" :busy="saving || detailLoading || !!formLoading" @retry="refreshDetail" v-if="selectedDrive" :open="detailsOpen" title="Drive details" :status="selectedDrive.status" statusDot
        :description="selectedDrive.description || 'No description recorded.'" :fields="driveFields" @update:open="detailsOpen = $event">
        <template #summary><h2 class="min-w-0 flex-1">{{ selectedDrive.title }}</h2></template>
        <template #field-location="{ field }">
            <a :href="`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(field.value)}`" target="_blank" rel="noopener noreferrer" class="underline underline-offset-4 hover:text-primary" :aria-label="`${field.value} (opens in Google Maps)`">{{ field.value }} ↗</a>
        </template>
        <AppCalendarButton :event="driveEvent(selectedDrive, currentTime)" :disabled="detailLoading || !!detailError" />
        <AppAdoptionDriveBooks v-if="detailsOpen && selectedDrive.id" :driveId="selectedDrive.id" />
        <template v-if="!pastDrive" #actions>
            <div class="grid w-full gap-2.5 sm:grid-cols-2">
                <Button type="button" variant="outline" :loading="formLoading === 'edit'" :disabled="detailLoading || !!detailError || loading || saving || !!formLoading" @click="openForm(selectedDrive)"><AppIcon name="edit" /><span class="sr-only">Edit</span></Button>
                <Button v-if="selectedDrive.eventdate >= today && selectedDrive.status !== 'cancelled'" type="button" variant="outline" :disabled="detailLoading || !!detailError || loading || saving" @click="cancelDrives([selectedDrive])" :loading="saving">Cancel</Button>
            </div>
        </template>
    </AdminDetailsDialog>
    <!--@lee-hlmilk > saved drive &&& station options flow down > visibility updates &&& validated draft payload flow back up-->
    <DriveFormDialog :open="formOpen" :drive="editingDrive" :stations="stations" :today="today" :submitting="saving" :booksRevision="booksRevision" @update:open="formOpen = $event" @submit="saveDrive" />
</template>
