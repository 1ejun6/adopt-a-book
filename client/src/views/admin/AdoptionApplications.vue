<script setup>
import { computed, reactive, ref, watch } from 'vue';
import { toast } from 'vue-sonner';
import { api } from '@/lib/api';
import { useConfirmation } from '@/lib/confirmation';
import AdminList from '@/components/admin/AdminList.vue';
import ApplicationDetailsDialog from '@/components/admin/ApplicationDetailsDialog.vue';
import BookIdentity from '@/components/shared/AppBookIdentity.vue';
import StatusBadge from '@/components/shared/AppStatusBadge.vue';
import { Button } from '@/components/ui/button';

const applications = ref([]);
const selectedIds = ref([]);
const selectedApplication = ref(null);
const detailsOpen = ref(false);
const loading = ref(false);
const saving = ref(false);
const { confirm } = useConfirmation();
const loadError = ref('');
const filters = reactive({ search: '', status: 'pending', sort: 'oldest' });
const page = ref(1);
const pageSize = 15;
let requestId = 0;

const statusTabs = [
    { value: 'all', label: 'All applications' },
    { value: 'pending', label: 'Pending', status: 'pending' },
    { value: 'approved', label: 'Approved', status: 'approved' },
    { value: 'rejected', label: 'Rejected', status: 'rejected' },
    { value: 'cancelled', label: 'Cancelled', status: 'cancelled' }
];
const columns = [
    { key: 'applicant', label: 'Applicant', class: 'w-1/5' },
    { key: 'book', label: 'Requested copy', class: 'w-2/5' },
    { key: 'submitted', label: 'Submitted', class: 'w-1/5' },
    { key: 'status', label: 'Status' }
];
const counts = computed(() => Object.fromEntries(statusTabs.map(tab => [tab.value,
    tab.value === 'all' ? applications.value.length : applications.value.filter(application => application.status === tab.value).length
])));

//@lee-hlmilk > applications API returns all rows > filter &&& paginate locally instead of sending unsupported queries
const filteredApplications = computed(() => {
    const search = filters.search.trim().toLowerCase();
    return applications.value.filter(application =>
        (filters.status === 'all' || application.status === filters.status) &&
        [application.userid?.name, application.bookid?.title, application.bookid?.authors?.join(', ')]
            .filter(Boolean).join(' ').toLowerCase().includes(search)
    ).sort((a, b) => filters.sort === 'oldest' ? a.createdat.localeCompare(b.createdat) : b.createdat.localeCompare(a.createdat));
});
const pageCount = computed(() => Math.max(1, Math.ceil(filteredApplications.value.length / pageSize)));
const visibleApplications = computed(() => filteredApplications.value.slice((page.value - 1) * pageSize, page.value * pageSize));
const selectedApplications = computed(() => visibleApplications.value.filter(application => selectedIds.value.includes(application.id)));
//@lee-hlmilk > caught-up message is for a loaded pending queue > searches keep their own no-results state
const pendingEmpty = computed(() => !loading.value && !loadError.value && filters.status === 'pending' && !filters.search.trim() && counts.value.pending === 0);

//@lee-hlmilk > both backend decisions require pending requests &&& available copies > explain disabled actions
function decisionHint(rows) {
    if (rows.some(application => application.status !== 'pending')) { return 'Only pending applications can be approved or rejected.'; }
    if (rows.some(application => application.bookid?.status !== 'available')) { return 'Decisions require an available copy.'; }
    return '';
}
const selectionHint = computed(() => decisionHint(selectedApplications.value));
const approvalConflict = computed(() => new Set(selectedApplications.value.map(application => application.bookid.id)).size !== selectedApplications.value.length);

function formatDate(value) {
    return value ? new Date(value).toLocaleDateString('en-SG', { dateStyle: 'medium', timeZone: 'Asia/Singapore' }) : 'Not provided';
}

function openApplication(application) {
    if (loading.value || saving.value) { return; }
    selectedApplication.value = application;
    detailsOpen.value = true;
}

async function fetchApplications() {
    const id = ++requestId;
    loading.value = true;
    loadError.value = '';
    selectedIds.value = [];
    try {
        const response = await api('/admin/applications');
        if (id !== requestId) { return; }
        applications.value = response.adoptionapplications;
        page.value = Math.min(page.value, pageCount.value);
    } catch (error) {
        if (id !== requestId) { return; }
        loadError.value = error.message;
        toast.error(error.message, { action: { label: 'retry', onClick: fetchApplications } });
    } finally {
        if (id === requestId) { loading.value = false; }
    }
}

//@lee-hlmilk > backend decides one request at a time > report partial failures &&& reload auto-rejected competing requests
async function decideApplications(status, rows = selectedApplications.value) {
    if (loading.value || saving.value || !rows.length || decisionHint(rows)) { return; }
    if (status === 'approved' && new Set(rows.map(application => application.bookid.id)).size !== rows.length) { return; }
    const targets = [...rows];
    if (!await confirm(`${status === 'approved' ? 'Approve' : 'Reject'} ${targets.length === 1 ? 'application' : 'applications'}?`, {
        description: (status === 'approved' ? 'Each approved copy becomes reserved. Competing pending requests will be rejected.' : 'The selected pending requests will be rejected.') +
            '\n' + targets.map(application => `${application.userid?.name || 'Unknown applicant'} — ${application.bookid.title}`).join('\n'),
        actionLabel: status === 'approved' ? 'Approve' : 'Reject', destructive: status === 'rejected'
    })) { return; }
    if (loading.value || saving.value) { return; }
    const current = targets.map(target => applications.value.find(application => application.id === target.id));
    if (current.some(application => !application) || decisionHint(current)) { toast.error('These applications have changed. Select them again.'); return; }
    detailsOpen.value = false;
    saving.value = true;
    let completed = 0;
    const failures = [];
    try {
        for (const application of targets) {
            try {
                await api(`/admin/applications/${application.id}/status`, { method: 'PATCH', body: { status } });
                completed++;
            } catch (error) { failures.push(`${application.userid?.name || 'Unknown applicant'}: ${error.message}`); }
        }
        if (completed) { toast.success(`${completed} ${completed === 1 ? 'application' : 'applications'} ${status}`); }
        if (failures.length) { toast.error(`${failures.length} ${failures.length === 1 ? 'decision' : 'decisions'} failed`, { description: failures.join('\n'), style: { whiteSpace: 'pre-line' } }); }
        await fetchApplications();
    } finally { saving.value = false; }
}

//@lee-hlmilk > selection belongs to displayed rows > changing filters ||| page clears it
watch(filters, () => { page.value = 1; selectedIds.value = []; });
watch(page, () => { selectedIds.value = []; });
fetchApplications();
</script>

<template>
    <AdminList title="Adoption applications" description="Review requests for organisation copies. Approval reserves the copy for collection."
        v-model:search="filters.search" v-model:tab="filters.status" v-model:selectedIds="selectedIds" v-model:page="page"
        :rows="visibleApplications" :columns="columns" :tabs="statusTabs" :counts="counts" :loading="loading" :disabled="saving"
        :selectable="['all', 'pending'].includes(filters.status)"
        :error="loadError" searchPlaceholder="Search by Applicant, Book, Author..."
        :pagination="{ itemLabel: 'applications', total: filteredApplications.length, pageSize, pageCount }" @openRow="openApplication">
        <template #filters>
            <select v-model="filters.sort" aria-label="Application order" class="w-full min-w-0 rounded-lg border p-2.5 text-sm leading-4 sm:w-auto">
                <option value="oldest">Oldest first</option>
                <option value="newest">Newest first</option>
            </select>
        </template>
        <template #selectionActions>
            <p v-if="selectionHint || approvalConflict" class="text-sm text-muted-foreground" role="status">
                {{ selectionHint || 'Choose one reader per copy to approve requests.' }}
            </p>
            <Button size="sm" :disabled="loading || saving || !!selectionHint || approvalConflict" @click="decideApplications('approved')">Approve</Button>
            <Button size="sm" variant="destructive" :disabled="loading || saving || !!selectionHint" @click="decideApplications('rejected')">Reject</Button>
        </template>
        <template #cellApplicant="{ row }">
            <p class="truncate">{{ row.userid?.name || 'Unknown applicant' }}</p>
            <small class="block truncate text-sm text-muted-foreground">{{ row.userid?.email || 'Email not provided' }}</small>
        </template>
        <template #cellBook="{ row }">
            <BookIdentity :title="row.bookid?.title || 'Untitled'" :author="row.bookid?.authors?.join(', ') || 'Unknown Author'" :cover="row.bookid?.coverurl" />
        </template>
        <template #cellSubmitted="{ row }"><span class="whitespace-nowrap text-sm">{{ formatDate(row.createdat) }}</span></template>
        <template #cellStatus="{ value }"><StatusBadge :status="value" /></template>
        <template #empty>
            <h2>{{ pendingEmpty ? 'No pending applications' : filters.search.trim() ? 'No matching applications' : 'No applications in this view' }}</h2>
            <p class="text-sm text-muted-foreground">{{ pendingEmpty ? 'You’re all caught up.' : filters.search.trim() ? 'Try another search term or status.' : 'New requests will appear here. Try another status or search term.' }}</p>
            <Button v-if="pendingEmpty" variant="outline" class="mt-2.5" @click="filters.status = 'all'">View all applications</Button>
        </template>
    </AdminList>
    <!--@lee-hlmilk > AdminList hides the table on failure > keep retry visible without relying on the toast-->
    <div v-if="loadError" class="mx-auto mt-5 max-w-7xl space-y-2.5 rounded-lg border p-5" role="alert">
        <p>{{ loadError }}</p>
        <Button variant="outline" :disabled="loading" @click="fetchApplications">Retry</Button>
    </div>

    <ApplicationDetailsDialog :open="detailsOpen" :application="selectedApplication"
        :decisionHint="selectedApplication ? decisionHint([selectedApplication]) : ''"
        @update:open="detailsOpen = $event" @decide="decideApplications($event, [selectedApplication])" />
</template>
