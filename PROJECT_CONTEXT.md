# Adopt a Book — project context

Source reviewed on 4 November 2026. This guide describes the working tree, including the current dashboard in `client/src/views/admin/Home.vue`.

## Admin routes and workflows

Admin pages live in `client/src/views/admin/` and share `AppLayout`. The router derives navigation links from child routes with `label` and `roles`. Admin sign-in still lands on Book Inventory through `homeRoute` in `client/src/lib/auth.js`. Home is separately accessible from the navbar.

| Route | View | Current behavior |
| --- | --- | --- |
| `/admin` | `Home.vue` | Live summary cards, up to five of today's pickups, and a Needs attention preview for overdue pickups, pending confirmations, and pending applications. Inventory and Next book drive show sample data. |
| `/admin/books` | `BookInventory.vue` | Server-paged inventory with status, search, and subject filters. Supports details, manual intake, Open Library import, editing, optional cover uploads, and deletion. |
| `/admin/applications` | `AdoptionApplications.vue` | Organisation-copy review queue. Defaults to Pending. Also offers All applications, Approved, Rejected, and Cancelled, with search and oldest/newest ordering. |
| `/admin/appointments` | `Appointments.vue` | Organisation-copy collection queue. Tabs are Awaiting confirmation, Today's pickup, Upcoming, Overdue, and History. Supports confirmation and collection. Customer-side routes handle rescheduling and cancellation. |
| `/admin/drives` | `Drives.vue` | Defaults to Upcoming and also offers Past. Supports search, date and status filters, creation, editing, closing registration, cancellation, and deletion. Past and cancelled details are read-only. |

### Dashboard and appointment navigation

- `fetchDashboard()` uses `Promise.allSettled` to fetch pending applications, overdue pickups, and awaiting confirmations with `limit=1` per queue, plus today's appointments with `limit=5`. Needs attention shows the first record for the selected queue and links to the full list. Pickup previews also link to the appointment details. Full counts come from the server, and failed requests offer a retry toast.
- Appointment cards and pickup links use Vue Router history state (`view` and optional `appointment`). `loadAppointmentLink()` requests the linked appointment directly after the initial list request settles, so links work for off-page records. It selects a matching queue, opens details, and clears the appointment target from history state.
- Singapore calendar rules drive the appointment tabs. Awaiting means pending confirmation on a future date. Today means confirmed today. Upcoming includes both active statuses on future dates. Overdue includes both active statuses on past dates and pending confirmations due today. History contains inactive statuses. `matchesView()` mirrors SQL's `admin_appointment_view()` for linked details.
- `updateAppointments()` confirms pending appointments dated today or later, or marks confirmed appointments collected. Both actions require a reserved copy. It snapshots targets before confirmation, rechecks eligibility, PATCHes each record, reports partial failures, and refreshes the list.

### Inventory and applications

- Inventory represents physical copies. Repeated ISBNs or Open Library IDs are valid. Inventory includes organisation and customer-owned copies. The database restricts admin edits to available organisation copies.
- `getBookDetails()` caches detail promises by ID. List reloads invalidate the cache and pending detail selections. `searchBooks()` guards Open Library results against stale requests. `importBooks()` creates reviewed results individually and retains failed entries for retry.
- `saveBook()` uploads a selected cover before saving its URL with the book. If saving fails, it attempts to delete the new unused upload and retains the form draft. Successful Add and continue resets the form. Existing external cover URLs remain supported.
- `deleteBooks()` takes a selection snapshot, prompts for confirmation, then checks that the selected copies are still present and available. Reserved and Adopted tabs hide selection. The availability restriction is frontend-only. SQL `delete_books` permits admin deletion across ownership and removes linked watchlist entries, appointments, and applications.
- `decideApplications()` accepts pending applications for available copies and blocks bulk approval of competing requests for the same copy. It confirms a fixed set of targets, rechecks eligibility, PATCHes each application, reports partial failures, and reloads. SQL `decide_book_application` atomically reserves an approved copy and rejects competing pending requests. Rejection also requires an available copy.
- Pending applications without an active search have a dedicated empty state with a View all applications action. Approved, Rejected, and Cancelled tabs hide selection. Details display applicant email from the admin relation. The Reason field is placeholder text because the API supplies no customer message.

### Drives

- `isPastDrive()` treats dates before Singapore today and all cancelled drives as Past. `openForm()` loads selectable MRT stations on demand. `saveDrive()` POSTs or PATCHes form data. `updateDrives()` uses per-record PATCHes for status changes and the collection DELETE endpoint for bulk deletion.
- `fetchStationBooks()` loads available catalogue copies at the drive's MRT station for current drive details. It reads `/books` in batches of up to 100 and applies local title/author search. This is a station lookup. The schema has no drive-to-book assignment.
- The drive form validates the event date and capacity. Capacity cannot fall below existing registrations. Legacy drives without a linked station expose `needsLocationUpdate`.

## Admin components and helpers

Admin components live in `client/src/components/admin/`. Views own requests, filters, eligibility, and mutations. Components handle presentation, input, and form drafts.

| Component | Responsibility |
| --- | --- |
| `AdminList.vue` | Composes filters, toolbar, table, and optional pagination. Models `search`, `tab`, `selectedIds`, and `page`. Exposes action and filter slots, forwards cell and empty slots, and emits `openRow`. Errors suppress the table and pagination. |
| `AdminTable.vue` | Renders supplied rows and columns, loading skeletons, and empty content. Emits row opening and current-page selection. A disabled selection column keeps its spacing. Compact mode is used for station books. |
| `AdminDetailsDialog.vue` | Shared details shell for all four lists. Renders optional book identity, status, label/value fields, and custom content and actions. Views decide which actions are available. |
| `AdminFormDialog.vue` | Shared form shell. Handles dirty-form discard confirmation and blocks dismissal during submission. |
| `BookFormDialog.vue` | Owns manual/edit drafts, form validation, and cover selection. `submitBook()` prepares the payload. `selectCover()` validates JPEG/PNG/WebP up to 5 MiB and decodes before replacing the current preview. Request IDs protect against stale checks and object URLs are revoked when discarded. |
| `BookImportSelection.vue` | Handles Open Library result selection and review. Requires an MRT station for each selected copy before import. |
| `DriveFormDialog.vue` | Owns the drive draft and validation. `submitDrive()` emits the date, location, station, description, title, and capacity payload. |

- `useServerPagination()` in `client/src/composables/useServerPagination.js` powers all four lists. It owns 15-row pages, totals and counts, loading and errors, a 250 ms search debounce, stale-response protection, selection resets, retry toasts, and recovery when the current page disappears. Each view supplies its filters and response mapping and calls `refresh()` for the initial load and after writes.
- `useFormValidation()` centralizes invalid field IDs, native validity checks, clearing corrected fields, reset, and post-render focus. The forms own domain rules and messages. Book validation opens collapsed metadata before focusing a field there.
- `useConfirmation()` in `client/src/lib/confirmation.js` returns a boolean promise from a persistent toast with two explicit choices. Repeated requests leave the existing prompt in place. Disposal cancels the pending action. Keep the keyboard-accessible custom buttons and focus handling when changing this flow.
- `client/src/lib/date.js` supplies `todayInSingapore()`, `formatDate()`, and `formatDateTime()`. Date-only values represent Singapore calendar dates, timestamps preserve their instant, and missing values display “Not provided.” `withCurrentStation()` in `stations.js` adds a saved inactive station when it is absent from the selectable options.
- Shared components in `client/src/components/shared/` include `AppFilters`, `AppToolbar`, `AppPagination`, `AppDatePicker`, `AppBookIdentity`, and `AppStatusBadge`. Local shadcn-vue/Reka primitives live under `components/ui/`.

## Admin API and database

The request path is Express route and middleware → controller → model/service → Supabase/PostgreSQL. `client/src/lib/api.js` wraps Axios with credentialed requests, optional headers, normalized errors, and a null result for HTTP 204. Authentication uses server-managed HttpOnly access and refresh cookies with Supabase Auth. Frontend routing checks the profile role, and admin API routes use authenticated/admin middleware.

| Endpoint | Contract |
| --- | --- |
| GET `/admin/books` | Returns `books,total,counts,genres,page,limit`. The inventory view sends `search,status,subject,page,limit`. `server/models/books.js` calls `browse_admin_books`. |
| POST/PATCH/DELETE `/admin/books` | POST creates a copy. GET and PATCH `/:bookid` read and edit a copy, with detail under `currentbook`. Collection DELETE takes `{ ids }` and returns `{ deletedids }`. |
| POST/DELETE `/admin/books/cover` | POST receives raw image bytes with an image Content-Type and returns `coverurl`. DELETE accepts the URL. `bookcovercontroller.js` and `bookcoveruploads.js` validate size and signature, limit explicit cleanup to the uploader, and protect referenced or external URLs. Book mutations attempt to clean up unused managed covers. |
| GET `/admin/open-library` | Searches using `q` and returns mapped `books`. Imported book creates use `source: 'open_library'`. |
| GET `/admin/applications` | Takes `search,status,sort,page,limit`. Returns `adoptionapplications` with applicant `userid` and book `bookid` objects, plus paging metadata. GET `/:id` reads a record. PATCH `/:id/status` accepts `approved` or `rejected`. |
| GET `/admin/appointments` | Takes `search,view,status,date,page,limit`. Returns `appointments` with `customer,email,book`, plus paging metadata. GET `/:id` includes the same relations. PATCH `/:id` accepts `appointment confirmed` or `collected`. |
| GET `/admin/drives` | Takes `search,view,status,date,page,limit`. Returns `drives` with MRT data plus paging metadata. POST creates, GET/PATCH `/:id` reads/updates, and DELETE accepts `/:id` or collection `{ ids }` and returns 204. |
| GET `/locations/stations` | Returns `{ stations }`, optionally filtered by `q`. New assignments require a selectable station. An edit can retain the current inactive station. |
| `/admin/users` | Backend account list/create and per-ID read/update/delete routes exist. There is no admin account view in the client router. Current-admin and last-admin protections apply to deletion. |

- `server/models/adminpagination.js` validates filters with Zod for applications, appointments, and drives and dispatches to the corresponding `browse_admin_*` RPC. Their list responses include `total,counts,today,page,limit`. `total` reflects the current filters, while `counts` reflect the eligible queues across all pages independently of search and filters. SQL applies filtering and stable ID tie-breaks before paging. Application and appointment lists are restricted to organisation copies.
- `sql/admin-pagination.sql` is the repeatable migration for existing databases. `sql/base.sql` carries the same definitions for fresh setups. Browse RPC access is granted to `service_role`. Verify the migration in the target environment before deploying dependent endpoints.
- The cover service expects a public Supabase Storage bucket named `book-covers`, with a 5 MiB limit and JPEG/PNG/WebP allowed. The current checkout has no standalone bucket setup SQL file.
- A copy's `ownerid` is null for organisation stock and points to a customer for community listings. The normal collection path is approved application → reserved copy → pending confirmation → appointment confirmed → collected. Collection makes the book adopted. PostgreSQL functions enforce ownership and transition rules, including `edit_book`, `decide_book_application`, and `change_collection`.
- RLS is enabled and routine backend data access uses the server's Supabase client. Keep secrets server-side. `/base`, `/seed`, and `/clear` are token-protected database maintenance operations. Read their SQL files when inspecting behavior.

## How the user wants files created or edited

- Use `client/src/views/admin/BookInventory.vue`, `client/src/components/admin/`, and the shared components as the starting point for new admin work. Keep changes small and readable. Reuse existing components and helpers. Avoid unnecessary dependencies, wrappers, defensive scaffolding, unrelated refactors, and whole-file reformatting.
- Prefer explicit props and emits for new components. Preserve existing `defineModel` and `defineExpose` contracts unless the task calls for changing them. Keep page-level requests and actions in the view, reusable presentation in components, and form drafts in the form components.
- Preserve attribution and existing comments, including `@lee-hlmilk` for the user's contributions and `@1ejun6` where present. Leave unattributed code unattributed. Match nearby naming and formatting, including the existing API field names.
- Use the existing Vue layouts, Tailwind tokens, and shared component defaults as the styling authority. Use `client/reference.html` for feature and flow ideas only. Its sidebar, pink theme, CSS, and imperative rendering belong to the prototype. Check which element owns spacing before adding padding or utility classes. Preserve responsive spacing, safe-area padding, and tape-decoration clearance.
- Keep Book Inventory server-filtered and paginated. The user asked to restore `@1ejun6`'s server flow after trying a load-once prototype. The alternative was authorized as a plan only in chat `01a17890-b69f-7841-9359-70606284347c`. Revisit it only with fresh authorization.
- Keep discard and action confirmations as persistent toasts with two explicit choices and no timeout, swipe dismissal, or close X. Leaving the page cancels its pending action. Preserve fixed action targets, validation, eligibility checks, duplicate-submission guards, and partial-failure feedback.
- Keep inventory's protected-copy deletion rule in the frontend unless the user authorizes backend changes for it. Reserved and Adopted tabs hide selection controls while keeping the empty column for spacing. The All books tab can still select rows and explains why Delete is disabled for protected or mixed selections.
- Keep appointment navigation targets in Vue Router history state so dashboard links leave the URL clean. For cover photos, keep the accessible chooser, preview, and nearby Change photo and Remove photo actions. Preserve a valid selection if its replacement fails validation.
- Keep edits within the current request. Clarify consequential behavior when the prototype and implementation conflict or the requirement is unclear.

## Stack and verification

- The pnpm workspace contains `client` (Vue, Vue Router, Vite, Tailwind, shadcn-vue/Reka) and `server` (Node, Express, Supabase, Zod). Use the root README for startup commands and package files for scripts and engine requirements. Guest browsing/drives and customer browsing, watchlist, adoptions, drives, and account routes are wired in the same router.
- Prior notes record targeted lint and build checks, mocked admin browser coverage, and database checks for the pagination work. The checked-in Playwright spec still targets the Vue starter. This documentation refresh verified source and did not exercise the browser or database.
