# Adopt a Book — tiered implementation plan

Based on the UX audit of 5 November 2026. Planning document only; no application changes are included.

## How to use this plan

Start with Tier 1 and complete its acceptance checks before moving to Tier 2. Tiers 1–2 use current backend capabilities. Tier 3 adds the most valuable missing product capabilities. Tier 4 needs operational policies or database design. Tier 5 is conditional work that should follow validation.

Items within a tier are ordered by recommended implementation sequence. Dependencies override that order. Work on one item at a time and keep its changes reviewable. Do not combine this plan with a redesign or unrelated refactoring.

Effort is relative, not a delivery commitment:

- **Small:** localized component, copy, or state change.
- **Medium:** coordinated changes across screens, routing, or API integration.
- **Large:** new product rules, transactional behavior, database work, or delivery infrastructure.

Evidence labels:

- **Observed:** reproduced in the running interface.
- **Code-confirmed:** established from source; the relevant behavior was not reproduced end to end.
- **Functional gap:** capability absent from the reviewed implementation.
- **Hypothesis:** possible usability issue requiring validation.

Severity describes impact separately from confidence: High risks substantial failure or misunderstanding; Medium adds avoidable effort; Low affects minor clarity. No universal core-task blocker was demonstrated.

## Audit boundaries

Guest screens, login, registration, customer Home, Browse, Watchlist, adoption request review, adoption stages, pickup dialogs, Account, and supporting admin queues were inspected. Customer and admin sign-in succeeded. Browser requests used the configured backend, without mocked responses. Some titles looked like test records, but the environment's purpose was not established.

No adoption, save, withdrawal, pickup, profile, approval, or collection mutation was submitted. Submission receipts, concurrency, backend failures, and database transition behavior were reviewed in source where applicable. No conversion research, full screen-reader audit, or measured contrast audit was performed.

Use a designated staging or disposable environment for mutation verification. Do not interpret an inspected control as a verified end-to-end write.

## Existing capabilities to preserve

These are already implemented and must not be estimated as new features:

- Validated post-login return destinations.
- Search, genre, sorting, pagination, and collection-location filtering.
- Saved books, private notes, and availability in the Home saved carousel.
- Adoption request review, existing-request links, and submission recovery.
- Pending-request withdrawal.
- Reservation of a physical copy on approval.
- Task-based My Adoptions groups and history.
- Pickup proposals with three distinct future hourly slots on one date.
- Pickup cancellation and rescheduling/change requests.
- Reconfirmation after submitting changes to a confirmed pickup.
- Calendar export and previous pickup attempts.
- Team-confirmed collection, which marks the copy adopted.
- Independent resource errors, duplicate-operation guards, and uncertain-write reconciliation.

Retain the cream/brown/lavender palette, bow, book spines, cover imagery, and handwritten identity. Reuse the existing Vue, Pinia, shared UI, and Reka patterns. Do not add dependencies merely to complete routine UI changes.

## Tier 1 — do first: complete and protect core journeys

**Goal:** make the next action clear and remove avoidable dead ends using existing APIs.

### T1.1 — connect guest book interest to authentication

- **Audit:** U1; Observed; High; UI-only; Medium.
- **Evidence:** guest Home loads five books and supplies no action slot to its details dialog. A protected catalogue URL successfully retained its search through login.
- **Primary files:** `client/src/views/guest/Home.vue`, `client/src/components/shared/AppBookPreviewDialog.vue`, `client/src/components/customer/CustomerBookDialogs.vue`, `client/src/router/index.js`, `client/src/views/Login.vue`, `client/src/views/Register.vue`.
- **Implementation:** add guest actions **Log in to request** and **Create an account**. Carry a copy ID in a validated destination; after authentication, fetch current details and reopen that copy. Keep search/filter context. Use the existing dialog action slot rather than embedding authentication logic in the shared preview.
- **Catalogue access:** expose a guest catalogue using the existing public `/books` endpoint and current filter/pagination components. Keep save/request mutations authenticated. Preserve the five-book shelf as discovery, with **Browse all books** as the forward action. Product must confirm whether full guest browsing is intended; the authentication handoff can ship independently.
- **Dependencies:** agree on a book-target query parameter and its close/Back behavior. No automatic save or adoption submission after login.
- **Done when:** login and registration preserve the chosen copy; an unavailable/deleted copy produces an explicit recovery message; invalid targets are rejected; Back returns predictably; keyboard focus returns to a sensible trigger.

### T1.2 — make saved-book availability consistent

- **Audit:** U2; Observed; Medium; UI-only; Small.
- **Primary files:** `CustomerBookCard.vue`, `CustomerSavedCarousel.vue`, `CustomerBookDialogs.vue`, `views/customer/Watchlist.vue`.
- **Implementation:** reuse the carousel's available/unavailable presentation in Watchlist cards. Keep collection location prominent because identical titles can represent different physical copies. Keep unavailable saved copies visible. Show **View my request** where an existing request is known.
- **Copy:** **Available to request**, **Unavailable for new requests**, and **Saving doesn't reserve a copy**.
- **Done when:** customers can distinguish availability before opening details; different copies are distinguishable by location; stale data never enables a request without the existing fresh eligibility checks.

### T1.3 — provide persistent empty-state recovery

- **Audit:** U3; Observed; Medium; UI-only; Small.
- **Primary files:** `views/customer/BrowseBooks.vue`, `views/customer/Home.vue`, `BrowseBookFilters.vue`, `AppLocationFilter.vue`.
- **Implementation:** replace toast-only no-result guidance with an inline panel. Provide **Clear search** and **Reset all filters**. On an empty personalized Home shelf, offer **Browse all books** and **Change favourite genres**. Clear all relevant query parameters when resetting; reset the page to 1.
- **Copy:** **No books match your current search and filters. Try a broader search or remove a filter.**
- **Done when:** recovery remains visible after notifications disappear; search, genre, sort, location, and pagination reset coherently; errors are distinguished from a successful empty result; browser Back restores the previous filter state.

### T1.4 — prevent impossible pickup dates early

- **Audit:** U6; Code-confirmed; Medium; UI-only; Small.
- **Primary files:** `CustomerPickupForm.vue`, `usePickupDraft.js`, `usePickupState.js`, `lib/pickupTimes.js`, `shared/pickups.mjs`.
- **Implementation:** derive the number of future slots for the selected date using existing Singapore-time helpers. Explain the requirement before slot selection. For a date with fewer than three future slots, show a date-specific error and prevent progression to review. Re-evaluate as time passes and on visibility restoration. Retain server validation.
- **Copy:** **Choose three different hourly times on the same date. The team will confirm one.** If insufficient slots remain: **There aren't three available times left on this date. Choose another date.**
- **Done when:** exactly three distinct future slots are required; late-day and midnight boundaries are handled; a form opened before a slot expires updates correctly; changing date preserves valid draft information without silently submitting anything.

### T1.5 — protect saved notes during removal

- **Audit:** U7; Observed and code-confirmed; Medium; UI-only; Small.
- **Primary files:** `views/customer/Watchlist.vue`, `CustomerBookList.vue`, `views/customer/Home.vue`, `stores/watchlist.js`, `lib/confirmation.js`.
- **Implementation:** use the existing persistent two-choice confirmation when removing a saved entry containing a note, across all entry points. Capture the target entry before awaiting a decision. Explain that removal also deletes its private note. Preserve pending-operation guards and focus restoration.
- **Actions:** **Remove saved book** / **Keep book**.
- **Done when:** cancelling makes no deletion request; confirmation affects the original copy only; duplicate clicks cannot duplicate mutations; failure leaves the entry and note recoverable; success is not reversed by a failed refresh.

### T1.6 — repair control labels and card semantics

- **Audit:** U5 and U10; Code-confirmed; Medium; UI-only; Medium.
- **Primary files:** `BrowseBookFilters.vue`, `CustomerBookCard.vue`, `AppToolbar.vue`.
- **Implementation:** add associated visible **Genre** and **Sort by** labels. Change the book card from an outer button role containing another button to an article with a dedicated details action and a sibling save/remove button. Use distinct accessible names including the title where useful.
- **Done when:** keyboard users independently open details and save/remove; Enter and Space do not trigger both actions; controls have meaningful accessible names; focus is visible; primary controls meet the existing 44px target convention.

### Tier 1 verification gate

- Desktop: guest copy → login/register → same copy; existing request → matching adoption; empty search → reset; saved unavailable copy → accurate feedback.
- Mobile at 390px, with a 320px stress check: all labels, errors, and actions remain reachable; long titles and multiple authors do not obscure controls.
- Keyboard: traverse card actions, filters, dialogs, error summaries, and confirmations; Escape and focus restoration work.
- In a safe test environment: verify no duplicate request, note-aware removal cancellation, and late-day scheduling behavior.
- Run the repository's applicable lint and build checks. Add focused behavioral coverage for routing/state recovery rather than tests that mirror templates.

## Tier 2 — do next: consistency, state recovery, and polish

**Goal:** make returning visits and everyday use predictable. Start after Tier 1 unless an item is independently ready.

### T2.1 — explain restored collection-location filters

- **Audit:** U4; Code-confirmed; Medium; UI-only; Medium.
- **Primary files:** `views/customer/BrowseBooks.vue`, `AppLocationFilter.vue`.
- **Implementation:** make URL-backed station IDs authoritative and show an applied-filter summary after refresh/Back. Preserve human-readable place/radius context where appropriate; when that context is unavailable, say **Collection-location filter active** rather than showing an apparently unfiltered UI. Keep explicit **Clear location filter**. Do not put precise device coordinates into shareable URLs.
- **Done when:** results and displayed filter state agree after refresh, Back, Forward, and a copied URL; an empty station selection is distinguishable from no filter; failed location lookup leaves useful inline recovery guidance.

### T2.2 — protect Account drafts and clarify save actions

- **Audit:** U8; Code-confirmed; Medium; UI-only; Medium.
- **Primary files:** `views/customer/Account.vue`, `lib/confirmation.js`; reference existing pickup navigation protection.
- **Implementation:** add dirty-form route-leave handling for profile, preferences, and password drafts. Offer **Keep editing** / **Discard changes**. Handle reload/closing with the appropriate browser unload behavior when dirty. Do not store password drafts. Rename generic actions to **Save profile**, **Save genres**, and **Update password**.
- **Done when:** leaving and browser Back cannot silently discard a dirty form; Keep editing retains it; successful saves clear dirty state; in-flight writes cannot be dismissed in ways that falsely imply cancellation.

### T2.3 — make registration requirements easier to scan

- **Audit:** U9; Observed layout, unmeasured conversion consequence; Medium; UI-only; Small.
- **Primary files:** `views/Register.vue`, `GenrePicker.vue`.
- **Implementation:** explicitly label genre selection required. Present a compact subset plus **Show all genres**, with all 26 choices available and selected values always visible. Keep checkbox semantics and selected count. Put a genre error beside the group and focus an appropriate target when validation fails.
- **Dependency:** retain the current one-or-more requirement unless product deliberately changes it. Optional genres would also require backend validation changes.
- **Done when:** the requirement is clear before submission; expansion works by keyboard; selected hidden choices are not lost; the submit action remains easy to find on mobile.

### T2.4 — standardize customer vocabulary and next-action copy

- **Audit:** U11; Observed; Low; UI-only; Small–Medium.
- **Primary files:** `router/index.js`, `views/customer/Watchlist.vue`, saved-book components, `lib/adoptions.js`, adoption/pickup presentation components.
- **Implementation:** use **Saved books** consistently without changing existing URLs. Add **Browse all books** and **View saved books** links to Home. Make **Edit note** visually explicit. State who acts next for each adoption status. Expose current action labels visibly in adoption rows without nesting buttons inside buttons.
- **Status contract:** request sent → team reviews; approved → customer proposes pickup; pickup requested → team confirms; confirmed → customer collects; collected → completed. Cancellation of a pickup must never imply cancellation of the adoption.
- **Done when:** identical concepts use identical terms; pending states never imply approval or confirmation; no copy promises notifications before Tier 3 delivers them.

### T2.5 — perform a focused responsive and readability pass

- **Evidence:** existing brand and styles; visual preference and hypotheses, not a mandate to redesign; Low; UI-only; Small–Medium.
- **Primary files:** `assets/main.css`, `assets/adoptions.css`, `assets/account.css`, shared UI components.
- **Implementation:** preserve current tokens and imagery. Improve operational text size/line-height only where inspection demonstrates a problem. Keep compact metadata readable and primary actions clear. Check actual rendered contrast rather than inferring it from a screenshot.
- **Done when:** important text remains readable at zoom, focus is not obscured, status does not rely on color alone, and dialogs work with a mobile keyboard and safe-area spacing.

### Tier 2 verification gate

- Browse: refresh/Back/Forward with combined search, genre, sort, page, and location filters.
- Account: leave/reload with dirty profile, genre, and password forms; save success/failure; no password persistence.
- Registration: no genre, one genre, many genres, expansion, error correction, and long form navigation.
- Adoption states: pending, approved, pending pickup, confirmed, cancelled/declined pickup, overdue, collected, and withdrawn.
- Resource states: loading, empty, error, unavailable, uncertain write, and saved-but-refresh-failed. Preserve existing retry and reconciliation safeguards.
- Review desktop, 768px, 390px, 320px, and zoomed layouts. Perform targeted screen-reader checks on changed controls.

## Tier 3 — highest-value new functionality

**Goal:** complete missing product capabilities. These items require backend integration or new rules and should ship separately.

### T3.1 — password recovery

- **Audit:** N1; Functional gap; High; Full-stack; Medium.
- **Frontend:** **Forgot password?**, recovery request, neutral acknowledgement, reset-password form, expired/used-link recovery, return to login and the original task.
- **Backend:** integrate the supported Supabase recovery flow, configured redirect allowlist, request throttling, email delivery, and session handling. Avoid revealing whether an account exists.
- **Dependencies:** approved sender/delivery configuration and deployed callback URLs. Verify current official provider documentation during implementation.
- **Done when:** a customer can recover access; invalid, expired, and reused links have clear outcomes; external redirect targets cannot be injected; reset success does not lose task context.

### T3.2 — status notifications

- **Audit:** N2; Functional gap; High; Full-stack; Large.
- **Frontend:** in-app notification list/unread state; links to exact authorized adoption/pickup records; communication preferences if email is included.
- **Backend:** transactional event/outbox design, delivery worker/provider, idempotent event keys, retries, authorization, and audit information. Start with approval, rejection, pickup confirmation, pickup change/cancellation, and collection events.
- **Dependencies:** event contracts, communication channel, delivery ownership, sender configuration. Reuse existing adoption links; do not replace acknowledgement/reconciliation logic.
- **Done when:** each transition creates one logical notification; retrying delivery does not duplicate it; cross-account records remain inaccessible; email failure does not roll back a successful business transition.

### T3.3 — relinquish an approved adoption

- **Audit:** N3; Functional gap; High; Full-stack; Large.
- **Frontend:** separate **Give up this adoption** from **Cancel pickup**. Explain that the copy will become available again. Provide explicit confirmation and a history outcome.
- **Backend:** atomic closure of the approved request, cancellation of active appointments, stock release, ownership checks, audit history, and race handling against collection. Decide whether existing rejected applicants can reapply or receive an offer.
- **Dependencies:** product agreement on eligibility, history status, and competing-request treatment.
- **Done when:** releasing an uncollected adoption makes the correct copy available exactly once; collected copies cannot be released by this action; concurrent collection and release cannot both succeed inconsistently; cancelling only a pickup still preserves approval.

### Tier 3 verification gate

Use a designated staging/disposable backend. Verify authorization, double submissions, expired links, provider failure, notification retries, and concurrent release/collection. Run each customer-facing path on desktop and mobile. Review database migration and rollback/recovery procedures before deployment.

## Tier 4 — policy and data reliability

**Goal:** close operational edge cases once ownership and product rules are agreed.

### T4.1 — an actionable help path for stuck pickups

- **Audit:** N4; Functional gap; High; UI-only Small for a configured contact link, or Full-stack Medium–Large for tracked support.
- **Problem:** warnings ask users to check with the team without providing a contact destination.
- **First increment:** product supplies the actual support channel and owner; show **Get help with this pickup** with a copyable reference. Do not invent contact details or response promises.
- **Full version:** create authorized support records linked to a request/pickup, staff assignment, status, resolution, and notifications. Reuse Tier 3 notification infrastructure.
- **Done when:** a customer can take a real next step from an overdue/unlinked state; staff can identify the record; a support request cannot disclose another customer's data.

### T4.2 — link pickups explicitly to adoption requests

- **Audit:** N5; Code-confirmed structural gap; Medium; Full-stack; Large.
- **Primary files:** `sql/base.sql`, `server/models/appointments.js`, appointment controllers, `client/src/lib/adoptions.js`.
- **Implementation:** add an application relationship to appointments; create it transactionally; backfill only unambiguous legacy rows; define constraints and API shapes. Retain a read-only needs-checking path for unresolved rows. Replace frontend date-cycle inference for authoritative linked records.
- **Dependencies:** schema/backfill review, treatment of old request cycles, and coordinated API/client rollout.
- **Done when:** each new pickup belongs to exactly one authorized request; repeated adoption cycles and previous attempts remain correct; ambiguous history is not silently assigned.

### T4.3 — reservation deadlines and missed-pickup policy

- **Audit:** N6; Functional gap; Medium; Full-stack; Large.
- **Product decisions first:** hold duration, reminders, grace periods, extensions, no-shows, active confirmed pickups, manual overrides, and release of stock.
- **Frontend:** actual deadline, explanation, extension/release actions, and expired outcome.
- **Backend:** reservation timestamps, scheduled transitions, reminder events, atomic release, and audit trail. Reuse Tier 3 release/notification mechanisms where appropriate.
- **Done when:** deadlines use Singapore rules consistently; a collected copy cannot expire; active confirmations are handled according to policy; repeated expiry jobs are safe and do not send duplicate reminders.

### Tier 4 verification gate

Review policies before coding. Verify ambiguous legacy data, repeated adoption cycles, overlapping jobs, date/time boundaries, manual overrides, and concurrent collection/release/expiry. Support and expiry must have an accountable operational owner.

## Tier 5 — validate before scheduling

These are optional and should not delay Tiers 1–3.

| Candidate | Evidence / effort | Validation needed | Implementation direction if justified |
|---|---|---|---|
| Simplify My Adoptions tab hierarchy | H1; Hypothesis; UI-only Medium | Can first-time users locate an approved book, a confirmed pickup, and an overdue pickup without coaching? | Improve summaries/action labels first; reduce nesting only if it causes observed failures. |
| Change progress labels | H2; Hypothesis; UI-only Medium | Can users distinguish requested, approved, pickup requested, and pickup confirmed? | Consider Requested → Approved → Pickup arranged → Collected; keep an explicit unsent-draft state. |
| Optional genre onboarding | Product proposal; Full-stack Medium | Does mandatory selection obstruct task completion, and is personalization valuable immediately? | Permit empty preferences deliberately, update backend validation, provide all-books fallback, and invite preferences later. |
| Multiple-date pickup availability | Product proposal; Full-stack Large | Do customers/staff struggle to provide three times on one date? | Update form, schema, API validation, confirmation selection, expiry rules, and summaries together. |
| Capacity-aware pickup scheduling | Product proposal; Full-stack Large | Are staff actually overscheduled or locations constrained? | Staff availability, capacity rules, atomic slot allocation, and conflict recovery. |
| Waitlists and availability alerts | Product proposal; Full-stack Large | Is there meaningful demand for unavailable titles/copies? | Define title-versus-copy subscriptions, fairness, consent, holds, and notification rules. |
| Alternative body typography | V1; Visual preference; UI-only Small | Do readability checks demonstrate a problem with dense operational text? | Adjust size/line-height first; preserve handwritten headings and the existing identity. |

## Recommended implementation batches

1. **Guest handoff:** T1.1 authentication context restoration; public catalogue exposure after its product decision.
2. **Saved books:** T1.2, T1.5, related card semantics from T1.6, and naming from T2.4.
3. **Browse recovery:** T1.3, filter labels from T1.6, and T2.1.
4. **Pickup clarity:** T1.4 and adoption next-action copy from T2.4.
5. **Account/onboarding:** T2.2 and T2.3.
6. **Focused visual QA:** T2.5 across the changed surfaces.
7. **Separate full-stack releases:** T3.1, T3.2, T3.3, then approved Tier 4 work.

These batches are suggested review boundaries, not instructions to combine unrelated changes into one commit. Close each batch with its acceptance evidence and any remaining limitations.

## Completion checklist

- [ ] Tier 1 core journey fixes accepted.
- [ ] Tier 2 returning-user behavior and UI consistency accepted.
- [ ] Password recovery accepted in a safe backend environment.
- [ ] Notification channel, event rules, and delivery ownership agreed.
- [ ] Approved-adoption release rules agreed and implemented safely.
- [ ] Support channel and owner established.
- [ ] Legacy relationship/backfill strategy agreed before schema changes.
- [ ] Reservation/no-show policy agreed before expiry automation.
- [ ] Tier 5 hypotheses tested before implementation is scheduled.
- [ ] Each implemented batch passes appropriate lint/build and behavioral checks.
- [ ] No deployment depends on stale documentation or assumed database state: verify actual migration files and deployed functions before backend releases.

**Recommended starting point:** T1.1, followed by the Saved books batch. They close the clearest observed gaps while preserving the existing product and backend.
