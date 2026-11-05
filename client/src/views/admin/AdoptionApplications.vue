<script setup>
import AppIcon from '@/components/shared/AppIcon.vue';
import { useAdminRecord } from '@/composables/useAdminRecord';
import { computed, reactive, ref } from 'vue';
import { toast } from 'vue-sonner';
import { api } from '@/lib/api';
import { formatDate, formatDateTime } from '@/lib/date';
import { useServerPagination } from '@/composables/useServerPagination';
import { useConfirmation } from '@/lib/confirmation';
import AdminList from '@/components/admin/AdminList.vue';
import AppFilterSelect from '@/components/shared/AppFilterSelect.vue';
import AppBookPreviewDialog from '@/components/shared/AppBookPreviewDialog.vue';
import BookIdentity from '@/components/shared/AppBookIdentity.vue';
import StatusBadge from '@/components/shared/AppStatusBadge.vue';
import StatusLegend from '@/components/shared/AppStatusLegend.vue';
import { Button } from '@/components/ui/button';

const selectedIds = ref([]);
const selectedApplication = ref(null);
//@lee-hlmilk > page supplies record-specific details > the shared dialog owns their layout
const applicationFields = computed(() => [
    { label: 'Applicant', value: selectedApplication.value?.userid?.name },
    { label: 'Email', value: selectedApplication.value?.userid?.email },
    { label: 'Submitted', value: formatDateTime(selectedApplication.value?.createdat) },
    { label: 'Collection area', value: selectedApplication.value?.bookid?.collectionarea }
]);
const detailsHint = computed(() => selectedApplication.value ? decisionHint([selectedApplication.value]) : '');
const detailsOpen = ref(false);
const { detailError, detailLoading, refreshDetail } = useAdminRecord(selectedApplication, detailsOpen, '/admin/applications', 'adoptionapplication', { busy: () => saving.value });
const saving = ref(false);
const savingAction = ref('');
const { confirm } = useConfirmation();
const filters = reactive({ search: '', status: 'all', sort: 'oldest' });

const statusTabs = [
    { value: 'all', label: 'All' },
    { value: 'pending', label: 'Pending', status: 'pending' },
    { value: 'approved', label: 'Approved', status: 'approved' },
    { value: 'rejected', label: 'Rejected', status: 'rejected' },
    { value: 'cancelled', label: 'Cancelled', status: 'cancelled' }
];
const applicationStatuses = statusTabs.filter(tab => tab.status);
const columns = [
    { key: 'applicant', label: 'Applicant', class: 'w-1/5', mobileClass: 'col-span-2 flex items-baseline gap-2' },
    { key: 'book', label: 'Requested copy', class: 'w-2/5', mobileClass: 'col-start-1 row-start-1' },
    { key: 'submitted', label: 'Date submitted', class: 'w-1/5', mobileClass: 'col-span-2 flex items-baseline gap-2' },
    { key: 'status', label: 'Status', class: 'text-center', mobileClass: 'col-start-2 row-start-1' }
];
//@lee-hlmilk > filters &&& totals come from SQL > selection stays scoped to the returned page
const { rows: applications, page, pageSize, total, counts, pageCount, loading, loadError, refresh: fetchApplications } = useServerPagination({
    busy: () => saving.value, endpoint: '/admin/applications', filters, selectedIds, read: response => response.adoptionapplications
});
const selectedApplications = computed(() => applications.value.filter(application => selectedIds.value.includes(application.id)));
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

function openApplication(application) {
    if (loading.value || saving.value) { return; }
    selectedApplication.value = application;
    detailsOpen.value = true;
}

//@lee-hlmilk > backend decides one request at a time > report partial failures &&& reload auto-rejected competing requests
async function decideApplications(status, rows = selectedApplications.value) {
    if (detailLoading.value || detailError.value || loading.value || saving.value || !rows.length || decisionHint(rows)) { return; }
    if (status === 'approved' && new Set(rows.map(application => application.bookid.id)).size !== rows.length) { return; }
    const targets = [...rows];
    if (!await confirm(`${status === 'approved' ? 'Approve' : 'Reject'} ${targets.length === 1 ? 'application' : `${targets.length} applications`}?`, {
        actionLabel: status === 'approved' ? 'Approve' : 'Reject', destructive: status === 'rejected'
    })) { return; }
    if (loading.value || saving.value) { return; }
    const current = targets.map(target => applications.value.find(application => application.id === target.id));
    if (current.some(application => !application) || decisionHint(current)) { toast.error('These applications have changed. Select them again.'); return; }
    savingAction.value = status;
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
        await refreshDetail();
    } finally { saving.value = false; savingAction.value = ''; }
}

fetchApplications();
</script>

<template>
    <!--@lee-hlmilk > AdminList updates view-owned models > applications contains only the matching server page-->
    <AdminList @retry="fetchApplications" title="Adoption Applications" description="approval reserves a copy for collection"
        v-model:search="filters.search" v-model:tab="filters.status" v-model:selectedIds="selectedIds" v-model:page="page"
        :rows="applications" :columns="columns" :tabs="statusTabs" :counts="counts" :loading="loading" :disabled="saving"
        :selectable="['all', 'pending'].includes(filters.status)"
        :error="loadError" searchPlaceholder="Search by applicant, book or author..."
        :emptyKey="JSON.stringify(filters)"
        :emptyTitle="pendingEmpty ? 'No pending applications' : filters.search.trim() ? 'No matching applications' : 'No applications in this view'"
        :emptyDescription="pendingEmpty ? 'You’re all caught up.' : filters.search.trim() ? 'Try another search term or status.' : 'New requests will appear here. Try another status or search term.'"
        :emptyAction="pendingEmpty ? { label: 'View all applications', onClick: () => { filters.status = 'all'; } } : null"
        :pagination="{ itemLabel: 'applications', total, pageSize, pageCount }" @openRow="openApplication">
        <template #filters>
            <AppFilterSelect v-model="filters.sort" aria-label="Application order">
                <option value="oldest">Oldest first</option>
                <option value="newest">Newest first</option>
            </AppFilterSelect>
        </template>
        <template #selectionActions>
            <p v-if="selectionHint || approvalConflict" class="text-sm text-muted-foreground" role="status">
                {{ selectionHint || 'Choose one reader per copy to approve requests.' }}
            </p>
            <Button title="Approve" :disabled="detailLoading || !!detailError || loading || saving || !!selectionHint || approvalConflict" @click="decideApplications('approved')" :loading="saving && savingAction === 'approved'"><AppIcon name="success" class="text-success-foreground" /><span class="sr-only">Approve</span></Button>
            <Button title="Reject" variant="destructive" :disabled="detailLoading || !!detailError || loading || saving || !!selectionHint" @click="decideApplications('rejected')" :loading="saving && savingAction === 'rejected'"><AppIcon name="cancel" /><span class="sr-only">Reject</span></Button>
        </template>
        <template #cellApplicant="{ row }">
            <p class="break-words lg:truncate">{{ row.userid?.name || 'Unknown applicant' }}</p>
            <small class="hidden truncate text-sm text-muted-foreground lg:block">{{ row.userid?.email || 'Email not provided' }}</small>
        </template>
        <template #cellBook="{ row }">
            <BookIdentity :title="row.bookid?.title || 'Untitled'" :author="row.bookid?.authors?.join(', ') || 'Unknown Author'" :cover="row.bookid?.coverurl" />
        </template>
        <template #cellSubmitted="{ row }">{{ formatDate(row.createdat) }}</template>
        <template #legend><StatusLegend :statuses="applicationStatuses" /></template>
        <template #cellStatus="{ value }"><div class="flex items-center justify-center"><StatusBadge :status="value" dot :title="value" /></div></template>
    </AdminList>

    <AppBookPreviewDialog :loading="detailLoading" :error="detailError" :preventClose="saving || detailLoading" @retry="refreshDetail" v-if="selectedApplication" v-model:open="detailsOpen" title="Application details" subtitle="details for the selected application"
        :book="selectedApplication.bookid" :metadata="applicationFields" fullDescription>
        <template #book-action><StatusBadge :status="selectedApplication.status" dot :title="selectedApplication.status" class="shrink-0" /></template>
        <template v-if="selectedApplication.status === 'pending' && detailsHint" #details><p class="text-muted-foreground">{{ detailsHint }}</p></template>
        <!--@lee-hlmilk > reviewed applications are read-only > decision actions remain available only for pending requests-->
        <template v-if="selectedApplication.status === 'pending'" #actions>
            <!--@lee-hlmilk > both flex-1 buttons share the footer width > pass one record to the same bulk-capable action-->
            <Button type="button" title="Reject" variant="destructive" class="flex-1" :disabled="detailLoading || !!detailError || loading || saving || !!detailsHint" @click="decideApplications('rejected', [selectedApplication])" :loading="saving && savingAction === 'rejected'"><AppIcon name="cancel" /><span class="sr-only">Reject</span></Button>
            <Button type="button" title="Approve" class="flex-1" :disabled="detailLoading || !!detailError || loading || saving || !!detailsHint" @click="decideApplications('approved', [selectedApplication])" :loading="saving && savingAction === 'approved'"><AppIcon name="success" class="text-success-foreground" /><span class="sr-only">Approve</span></Button>
        </template>
    </AppBookPreviewDialog>
</template>
