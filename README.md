# Adopt a Book

A Vue application for discovering available books, saving favourites, requesting adoption, and arranging collection.

## Setup

Use Node.js 22.18+ (or 24.12+) and pnpm. Copy `example.env` to `.env`, then supply the existing Supabase/database and service credentials. Keep secrets out of version control. `clienturl` and `serverurl` must point to your local client and API, including ports (defaults: 5174 and 3000).

```bash
pnpm install
pnpm dev                 # client and API together
# Alternatively, in separate terminals:
pnpm dev:server
pnpm dev:client
```

The existing SQL files in `sql/` describe the database. For existing installations, apply `sql/migrations/20261105_preferredgenres.sql` followed by `sql/migrations/20261105_journey_repairs.sql` before releasing the matching API and client. The second migration protects book history, aligns pickup queues with remaining Singapore slot starts, rejects expired legacy confirmations, and returns authoritative RSVP receipts. Fresh installations include the same definitions in `sql/base.sql`. Do not replay `base.sql` against existing data; it contains historical cleanup steps. Existing accounts receive empty preferences and continue seeing all available genres.

```bash
pnpm lint
pnpm build
```

## Week 11 mapping

| Topic | Implementation |
| --- | --- |
| Composables | `useServerPagination` handles server pagination; `useFormValidation` manages validation; `lib/confirmation.js` provides the reusable confirmation interaction; `useAdoptionDrives` owns cancellable drive reads, station counts, Singapore date classification and guest cache restoration. |
| Pinia | `auth` restores cookie sessions and identifies the current role; `watchlist` owns saved entries and pending operations; `adoptions` shares applications, appointments, readiness, journeys and guarded mutations. Identity changes reset private stores and invalidate pending responses. |
| Running example | Discover up to 100 available books at `/customer`, reshuffle five spines locally, save or request through the existing dialogs, track the request in My Adoptions, then arrange collection after approval. Saving does not reserve a copy. |
| Routing | `AppLayout` provides the shared navbar; route metadata enforces role guards; login accepts validated return destinations; unknown URLs render the named `notFound` route with a role-aware home link. Book details remain dialogs. |

Customer home loads discovery on entry and when a backgrounded page becomes visible. Random guarantees a changed selection for pools above five and a changed order for pools of two to five. The saved carousel reads the watchlist store directly, supports manual scrolling and keyboard activation, and retains unavailable copies. Its styles are scoped to home components.

Guest shelves and drives display cached data while revalidating on entry. Drive refresh bypasses guest browser cache; authenticated drives are never cached in browser storage. Failed station counts remain unknown. RSVP actions stay in the customer page and reconnect the selected drive after refresh.

Adoption resources have independent errors and loading state. Reads are deduplicated and owned by the store, so closing a dialog does not abort another consumer’s read. Writes are never automatically retried; book-level locks prevent conflicts, and application submission checks current applications and fresh availability before sending. Acknowledged writes remain successful if a following refresh fails. An uncertain submission is reconciled before another submission; pickup dialogs retain their existing reconciliation and draft workflows.

The requested `reference.html` was not present in this checkout. Customer home follows the supplied five-spine/Random/saved-carousel description using the existing theme and spine asset.

## Favourite genres

Registration requires one or more genres from `shared/genres.json`. Customers can change these in My account. The authenticated shelf matches any saved genre and filters available books before limiting the discovery pool to 100; Random displays up to five from that pool. Browse Books remains independent of saved preferences.


## Journey repair verification

Implementation verification passed lint, the production build, server checks, isolated PostgreSQL integration checks, and 200 mocked browser checks across Chromium, Firefox, WebKit, iPhone and iPad profiles. The browser checks covered customer/admin journeys, recovery, keyboard access and responsive layouts. The test files were subsequently removed at the user's request and are not included in this checkout.

Database verification used a new, empty, disposable PostgreSQL database on loopback. It checked protected bulk deletion, competing approvals, expired confirmations, proposal versions, cancellation/collection, final-place RSVP races, capacity reopening and manual closure. A temporary `embedded-postgres` installation under `/tmp` was used; it is not an application dependency. No migration was applied to a live database and nothing was deployed.

Only available copies with no adoption applications or appointments may be deleted; a protected copy rejects the entire batch with HTTP 409. Eligible deletion also removes saved entries, and cover cleanup runs only after successful deletion. Cancelling or declining pickup preserves approval and reservation. Admin collection confirmation is what marks a copy adopted.

Pending pickups remain awaiting confirmation while any proposed start is in the future. Legacy rows use their stored time; incomplete rows need attention. Confirmed pickups stay in Today through Singapore midnight. Controls re-evaluate every minute and when the page becomes visible. Admin lists and open details expose retryable errors and prevent stale decisions.

## Responsive UI and CSS cleanup

The cleanup follows `rawr/CSS_CLEANUP.md` across shared UI components, global/scoped styles and template utilities. It removes the duplicated shelf/password styling, conflicting tab rules, custom cursor, decorative motion/shadows, redundant control utilities and unnecessary table spacing. Existing components, handwritten fonts, core colours, focus, validation, disabled states and checkbox states remain.

All password fields use eye toggles. Guest and customer shelves share their presentation while pages keep separate data/actions. Tabs wrap, controls use 44px targets, and dialogs scroll within the dynamic viewport with safe-area spacing.

| Production CSS | Before cleanup | After cleanup | Reduction |
| --- | ---: | ---: | ---: |
| Raw bytes | 45,528 | 40,065 | 12.0% |
| Gzip bytes | 11,023 | 9,944 | 9.8% |

The measurements sum all emitted `client/dist/assets/*.css` files after the same production build. Gzip is measured per file using Python `gzip.compress(..., mtime=0)`.
