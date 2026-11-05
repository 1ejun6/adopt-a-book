# Adopt-a-Book: Guest User Journeys (E2E)

A guest is an unauthenticated visitor browsing the shelf, exploring adoption drives, or creating an account.

> 🔌 = the step fakes a server response with `page.route()`, because the real data can't produce that situation on demand.

> Helpers in `e2e/support/guest.js` never hardcode which books or drives exist in the database — they read what `/books` and `/drives` return from the server and check the UI against that.

### 📚 1.1 "What books do you have?": browsing the shelf
**File:** `e2e/guest/01-browse-the-bookshelf.spec.js`
**Goal:** a first-time visitor looks through the books on the homepage and reads about one.
**Pages:** Homepage

| # | The guest… | We check that… |
|---|---|---|
| 1 | opens the website for the first time | the heading **"Different shelves, Shared stories"** shows, a loading shelf appears briefly, then **5 book spines** with real titles and authors |
| 2 | hovers the mouse over a spine | a small preview pops up with that book's cover, title and the start of its description |
| 3 | moves to another spine | the first preview disappears and the new book's preview shows |
| 4 | clicks a spine | a **Book details** window opens with that book's title, author, description, subject, published year, ISBN, condition and collection point |
| 5 | clicks the **collection point** | Google Maps opens **in a new tab** for that location, and our site stays open |
| 6 | presses **Esc** | the window closes and they're back at the shelf |
| 7 | uses only the keyboard: focus another spine and press **Enter** | that book's details open, so the shelf works without a mouse |
| 8 | closes it with **✕** (**Close**) | the window closes |

---

### 📍 1.2 "Is there a drive near me?": finding a nearby drive
**File:** `e2e/guest/02-find-a-drive-near-me.spec.js`
**Goal:** a guest wants to find an upcoming book drive close to where they are.
**Pages:** Homepage → Adoption drives

| # | The guest… | We check that… |
|---|---|---|
| 1 | clicks **Adoption Drives** in the navbar | the page opens with **"N adoption drives found"** (matching upcoming drives from `/drives`) and drive cards, each showing the date, title, venue, **slots left** and **books** count |
| 2 | taps 📍 **use current location** and allows it | a **"current location ready"** toast appears, along with a **Distance** slider (`Distance: 3 km`) |
| 3 | sets the distance (`Distance: 2 km`) and presses **search** | **"location filter applied"** appears, and only drives near them are listed, with the "found" count updated |
| 4 | widens the distance (`Distance: 20 km`) and searches again | more stations and drives appear |
| 5 | 🔌 types a postcode (`188021`) instead and presses **search** | the list changes to drives near that postcode |
| 6 | 🔌 searches a place with no drives nearby (`jurong island`) | **"no adoption drives near this location > try a wider distance"** |
| 7 | clears the location box | all upcoming drives come back and the **Distance** slider disappears |
| 8 | taps 📍 **use current location** but **blocks** location access | an error toast (**"location permission denied > allow location access \ enter a postcode"**) explains permission was denied and suggests entering a postcode |

---

### 🔎 1.3 "Which drive suits me?": comparing and looking at a drive
**File:** `e2e/guest/03-compare-and-view-drives.spec.js`
**Goal:** a guest narrows the list down and looks closely at one drive before deciding.
**Pages:** Adoption drives

| # | The guest… | We check that… |
|---|---|---|
| 1 | searches for an MRT station's name (e.g. "Bugis") | only drives matching that station stay, and the "found" count updates |
| 2 | clears the search and switches sort to **latest first** (`desc`) | all upcoming drives come back, furthest date first |
| 3 | clicks the green **open** legend button | `aria-pressed="true"` and only open drives show; clicking it again sets `aria-pressed="false"` and shows all upcoming drives |
| 4 | picks **cancelled** in the status dropdown | **"no matching drives > adjust your filters or check another tab"** (when there are no upcoming cancelled drives) |
| 5 | resets the status and sort, and clicks a drive card | a window opens with the title, **open** badge, full date, venue, **available slots** (or **capacity**) and a **book list** of real books at that MRT station (up to 5, plus `"& N more"`, or `"no available books at this station yet"`) |
| 6 | clicks the **venue** | Google Maps opens in a new tab |
| 7 | closes the window and opens a different drive | the new drive's details and **its own** station's book list show, not the previous one's |
| 8 | 🔌 opens the **past** tab when there are past drives | only past drives show, the **upcoming** and **past** tab counts match, and the cards show no "slots left" |
| 9 | 🔌 opens a **closed**, **cancelled** and an **ended** drive | each shows **"registration has closed"**, **"this drive has been cancelled"** or **"this drive has ended"** instead of an **rsvp** button |
| 10 | 🔌 has 12 drives to look through | only 10 show (`"1–10 of 12 adoption drives"`); **Next page** shows the other 2 (`"Page 2 of 2"`); changing a search/filter returns to `"Page 1 of 2"` |

---

### ✍️ 1.4 "I want to go!": from rsvp to creating an account
**File:** `e2e/guest/04-rsvp-then-create-account.spec.js`
**Goal:** a guest finds a drive they like, tries to rsvp, and signs up to be able to.
**Pages:** Adoption drives → Create account → Login

| # | The guest… | We check that… |
|---|---|---|
| 1 | opens an open drive and clicks **rsvp** | **"log in to rsvp"** appears with **log in** and **create account** buttons, and it stays visible (`duration: Infinity`) until they choose |
| 2 | clicks **create account** | the drive window closes and they land on `/register` (**Create Your Account**) |
| 3 | fills in **Name**, a **new** **Email** and a **Password**, ticking **show password** to check it | the password field switches to `type="text"` and becomes readable |
| 4 | clicks **Register** | the button says **"Registering…"**, then **"registration successful"** appears and they're taken to `/login` (**Login**) |
| 5 | goes back to **Adoption Drives**, opens a drive, clicks **rsvp**, then **log in** | they land on `/login` (**Login**) |

> Logging in successfully ends the guest journey. What happens next belongs to the customer journeys.

---

### 🚧 1.5 "That didn't work": signing up and logging in with mistakes
**File:** `e2e/guest/05-signup-and-login-mistakes.spec.js`
**Goal:** a guest makes the usual mistakes and gets clear feedback every time.
**Pages:** Create account → Login

| # | The guest… | We check that… |
|---|---|---|
| 1 | clicks **Create Account** and presses **Register** with empty fields | the form won't submit, and the browser focuses the first empty field (**Name**, `valueMissing`) |
| 2 | types an email without **@** | the form won't submit (`typeMismatch`, no `POST /register` sent) |
| 3 | registers with an email that **already has an account** | an error toast appears and they stay on **Create Account** (`/register`), with their **Name** and **Email** typing kept |
| 4 | clicks **Login** in the navbar and enters the **wrong password** | an error toast appears and they stay on **Login** (`/login`) |
| 5 | ticks **show password** to check what they typed | the password field switches to `type="text"` and becomes readable |

---

### 🔒 1.6 "Can I just go straight there?": opening members-only pages
**File:** `e2e/guest/06-blocked-from-member-pages.spec.js`
**Goal:** a guest opens a link a friend shared, or types a members-only address.
**Pages:** Customer and admin pages → Login

| # | The guest… | We check that… |
|---|---|---|
| 1 | opens `/customer/watchlist` | they're sent to **Login** (`/login`) |
| 2 | opens `/customer/books?search=dune` (a shared link) | they're sent to **Login** (`/login`) |
| 3 | opens `/customer/adoptions` (or `/customer/adoption`) and `/customer/account` | both send them to **Login** (`/login`) |
| 4 | opens `/admin/books` | they're sent to **Login** (`/login`) |
| 5 | looks at the navbar on every page they visited | it only ever shows the guest links (**Browse Books**, **Adoption Drives**, **Login**, **Create Account**) |

---

### 📱 1.7 "On my phone": using the site on a small screen
**File:** `e2e/guest/07-use-on-a-phone.spec.js` *(phone-sized screen: Pixel 5)*
**Goal:** a guest browses on their phone, where the navbar works differently.
**Pages:** Homepage → Adoption drives → Create account

| # | The guest… | We check that… |
|---|---|---|
| 1 | opens the homepage | the desktop navbar is hidden, links sit behind the **☰** button (`button[aria-controls="mobile"]`), and the shelf fits the screen |
| 2 | taps a book spine | the **Book details** window opens straight away (no hover preview on touch screens) and fits the screen width |
| 3 | closes it and taps **☰** | the mobile menu (`#mobile`) opens (`aria-expanded="true"`) with all 4 guest links |
| 4 | taps **Adoption Drives** | the drives page (`/drives`) opens **and** the mobile menu closes by itself |
| 5 | opens a drive | the drive window fits the screen and can be scrolled to the **rsvp** button |
| 6 | opens **☰** and taps **Create Account** | the sign-up form (`/register`) opens and the mobile menu closes |
| 7 | opens **☰** and taps **✕** (or presses **Esc**) | the mobile menu closes without changing page |

---

### 🔁 1.8 "I'm back": returning visitor
**File:** `e2e/guest/08-return-visit.spec.js`
**Goal:** a guest comes back to the site later.
**Pages:** Homepage → Adoption drives

| # | The guest… | We check that… |
|---|---|---|
| 1 | visits the homepage and the drives page once | both load from the server (`/books` and `/drives`) and cache to `localStorage` (`guest-bookshelf` and `guest-adoption-drive`) |
| 2 | comes back later (re-navigates) | the shelf and the drives appear **instantly** from saved data, **without** asking the server again |
| 3 | comes back after the earliest upcoming drive's date has passed (clock moved forward) | that drive has moved from **upcoming** to **past** in Singapore time without a new `/drives` request to the server |
| 4 | has broken saved data in `localStorage` | the site ignores it, loads fresh data from `/books` and `/drives`, and nothing breaks |

---

### ⚠️ 1.9 "Something's wrong": when the server has problems
**File:** `e2e/guest/09-server-errors-and-retry.spec.js`
**Goal:** a guest visits while the server is having trouble, and can recover without reloading.
**Pages:** Homepage → Adoption drives

| # | The guest… | We check that… |
|---|---|---|
| 1 | 🔌 opens the homepage while `/books` is down (503) | an error toast (`"server unavailable"`) with a **retry** button appears, and the page heading still renders without crashing |
| 2 | 🔌 clicks **retry** once the server is back | the books appear on the shelf and **"books refreshed"** shows |
| 3 | 🔌 opens **Adoption Drives** while `/drives` is down (503) | an alert box (`role="alert"`) with **try again** appears (along with an error toast) and no drive cards render |
| 4 | 🔌 clicks **try again** once the server is back | the drives load and the **"N adoption drives found"** count appears |
| 5 | 🔌 opens a drive whose book list (`/books?limit=5`) fails to load | the drive details still show, with an alert and **retry book list** button under them |
| 6 | 🔌 clicks **retry book list** | the alert disappears and the books at that station appear |
| 7 | 🔌 one station's book count (`/books?limit=1`) fails to load | that station's drive card shows **"— books"** and every other station's card is normal |

---

### Guest summary

All files live in `client/e2e/guest/`. The number at the front matches the journey number, so files sort in the same order as this document.

| # | Journey | File | Pages it crosses | Steps |
|---|---|---|---|---|
| 1.1 | Browsing the shelf | `01-browse-the-bookshelf.spec.js` | Homepage | 8 |
| 1.2 | Finding a nearby drive | `02-find-a-drive-near-me.spec.js` | Homepage → Drives | 8 |
| 1.3 | Comparing and looking at a drive | `03-compare-and-view-drives.spec.js` | Drives | 10 |
| 1.4 | From rsvp to creating an account | `04-rsvp-then-create-account.spec.js` | Drives → Create account → Login | 5 |
| 1.5 | Signing up and logging in with mistakes | `05-signup-and-login-mistakes.spec.js` | Create account → Login | 5 |
| 1.6 | Opening members-only pages | `06-blocked-from-member-pages.spec.js` | Customer and admin pages → Login | 5 |
| 1.7 | Using the site on a phone | `07-use-on-a-phone.spec.js` | Homepage → Drives → Create account | 7 |
| 1.8 | Returning visitor | `08-return-visit.spec.js` | Homepage → Drives | 4 |
| 1.9 | When the server has problems | `09-server-errors-and-retry.spec.js` | Homepage → Drives | 7 |
| | **Total** | | **9 journeys** | **59** |

---

# Not tested here

| What | Why |
|---|---|
| A successful login and everything after it | Covered by the customer journeys |
| Exact colours, fonts and spacing | E2E checks that things work and show the right content, not the design |
| Firefox and Safari | Chrome only for now, to keep runs fast. Easy to turn on later |

---

# Things we noticed while planning

- **`Register.vue` now uses the server's message (`"registration successful"`).** Previously `Register.vue` showed a hardcoded `"account created > log in to continue"` toast. Since merging `main`, `Register.vue` calls `toast.success(response.message)` (`"registration successful"` from `POST /register`), and `04-rsvp-then-create-account.spec.js` step 4 checks for `'registration successful'`.
- **Login and Create account still don't link to each other.** A guest on Login with no account has to find "Create Account" in the navbar.
- **The test data only has open, upcoming drives.** The **past** tab is always empty and closed or cancelled drives never appear in `sql/seed.sql`, so journey 1.3 steps 8–10 use `serveFakeDrives()`.
- **Customer adoptions now live at `/customer/adoption`**, with `/customer/adoptions` redirecting there; both redirect guests to `/login`.
- **Journey 1.4 (and 1.5 step 3) creates a real account every run.** The tests must run against a **separate test database**, not the team's shared one.

---

# How to run the journeys

From the `client/` folder:

```powershell
pnpm test:e2e                 # run all journeys in the background
pnpm test:e2e -- --ui         # open a window and watch each journey click through the app
pnpm test:e2e -- e2e/guest    # run only the guest journeys
npx playwright show-report    # see the results, with screenshots of anything that failed
```

Playwright starts the app by itself, so you don't need to run `pnpm dev` first.
