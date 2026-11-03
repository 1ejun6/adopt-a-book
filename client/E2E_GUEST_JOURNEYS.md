# Adopt-a-Book: Guest User Journeys (E2E)

### 📚 1.1 "What books do you have?": browsing the shelf
**File:** `e2e/guest/browse-shelf.journey.spec.js`
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
| 7 | uses only the keyboard: Tab to another spine, press **Enter** | that book's details open, so the shelf works without a mouse |
| 8 | closes it with **✕** | the window closes |

---

### 📍 1.2 "Is there a drive near me?": finding a nearby drive
**File:** `e2e/guest/find-nearby-drive.journey.spec.js`
**Goal:** a guest wants to find an upcoming book drive close to where they are.
**Pages:** Homepage → Adoption drives

| # | The guest… | We check that… |
|---|---|---|
| 1 | clicks **Adoption Drives** in the navbar | the page opens with **"5 adoption drives found"** and 5 drive cards, each showing the date, title, venue, **slots left** and **books nearby** |
| 2 | taps 📍 **use current location** and allows it | a "current location ready" message appears, along with a **Distance** slider |
| 3 | sets the distance and presses **search** | "location filter applied" appears, and only drives near them are listed, with the "found" count updated |
| 4 | widens the distance and searches again | more drives appear |
| 5 | 🔌 types a postcode instead and presses search | the list changes to drives near that postcode |
| 6 | 🔌 searches a place with no drives nearby | **"no adoption drives near this location > try a wider distance"** |
| 7 | clears the location box | all 5 drives come back |
| 8 | taps 📍 but **blocks** location access | an error explains permission was denied and suggests entering a postcode |

---

### 🔎 1.3 "Which drive suits me?": comparing and looking at a drive
**File:** `e2e/guest/explore-drives.journey.spec.js`
**Goal:** a guest narrows the list down and looks closely at one drive before deciding.
**Pages:** Adoption drives

| # | The guest… | We check that… |
|---|---|---|
| 1 | searches for an MRT station's name (e.g. "Bugis") | only drives at that station stay, and the "found" count updates |
| 2 | clears the search and switches sort to **latest first** | all drives come back, furthest date first |
| 3 | clicks the green **open** legend button | only open drives show; clicking it again shows all drives |
| 4 | picks **cancelled** in the status dropdown | **"no matching drives > adjust your filters"** (the seed has no cancelled drives) |
| 5 | resets the status and clicks a drive card | a window opens with the title, **open** badge, full date, venue, available slots and a **book list** of real books at that MRT station (up to 5, plus "& N more") |
| 6 | clicks the **venue** | Google Maps opens in a new tab |
| 7 | closes the window and opens a different drive | the new drive's details and **its own** book list show, not the previous one's |
| 8 | 🔌 opens the **past** tab when there are past drives | only past drives show, the tab counts add up, and the cards show no "slots left" |
| 9 | 🔌 opens a **closed**, **cancelled** and an **ended** drive | each shows "registration has closed", "this drive has been cancelled" or "this drive has ended" instead of an rsvp button |
| 10 | 🔌 has 12 drives to look through | only 10 show; **next page** shows the other 2; changing a filter returns to page 1 |

---

### ✍️ 1.4 "I want to go!": from rsvp to creating an account
**File:** `e2e/guest/rsvp-to-signup.journey.spec.js`
**Goal:** a guest finds a drive they like, tries to rsvp, and signs up to be able to.
**Pages:** Adoption drives → Create account → Login

| # | The guest… | We check that… |
|---|---|---|
| 1 | opens an open drive and clicks **rsvp** | **"log in to rsvp"** appears with **log in** and **create account** buttons, and it stays until they choose |
| 2 | clicks **create account** | the drive window closes and they land on **Create Your Account** |
| 3 | fills in name, a **new** email and a password, ticking **show password** to check it | the password becomes readable |
| 4 | clicks **Register** | the button says **"Registering…"**, then **"account created > log in to continue"** appears and they're taken to **Login** |
| 5 | goes back to **Adoption Drives**, opens a drive, clicks **rsvp**, then **log in** | they land on **Login** |

> Logging in successfully ends the guest journey. What happens next belongs to the customer journeys.

---

### 🚧 1.5 "That didn't work": signing up and logging in with mistakes
**File:** `e2e/guest/signup-mistakes.journey.spec.js`
**Goal:** a guest makes the usual mistakes and gets clear feedback every time.
**Pages:** Create account → Login

| # | The guest… | We check that… |
|---|---|---|
| 1 | clicks **Create Account** and presses **Register** with empty fields | the form won't submit, and the browser points to the first empty field |
| 2 | types an email without **@** | the form won't submit |
| 3 | registers with an email that **already has an account** | an error message appears and they stay on **Create account**, with their typing kept |
| 4 | clicks **Login** in the navbar and enters the **wrong password** | an error message appears and they stay on **Login** |
| 5 | ticks **show password** to check what they typed | the password becomes readable |

---

### 🔒 1.6 "Can I just go straight there?": opening members-only pages
**File:** `e2e/guest/locked-pages.journey.spec.js`
**Goal:** a guest opens a link a friend shared, or types a members-only address.
**Pages:** Customer and admin pages → Login

| # | The guest… | We check that… |
|---|---|---|
| 1 | opens `/customer/watchlist` | they're sent to **Login** |
| 2 | opens `/customer/books?search=dune` (a shared link) | they're sent to **Login** |
| 3 | opens `/customer/adoptions` and `/customer/account` | both send them to **Login** |
| 4 | opens `/admin/books` | they're sent to **Login** |
| 5 | looks at the navbar on every page they visited | it only ever shows the guest links (**Browse Books**, **Adoption Drives**, **Login**, **Create Account**) |

---

### 📱 1.7 "On my phone": using the site on a small screen
**File:** `e2e/guest/mobile.journey.spec.js` *(phone-sized screen)*
**Goal:** a guest browses on their phone, where the navbar works differently.
**Pages:** Homepage → Adoption drives → Create account

| # | The guest… | We check that… |
|---|---|---|
| 1 | opens the homepage | the navbar links are hidden behind a **☰** button, and the shelf fits the screen |
| 2 | taps a book spine | the **Book details** window opens straight away (no hover preview on touch screens) and fits the screen |
| 3 | closes it and taps **☰** | the menu opens with all 4 guest links |
| 4 | taps **Adoption Drives** | the drives page opens **and** the menu closes by itself |
| 5 | opens a drive | the drive window fits the screen and can be scrolled to the **rsvp** button |
| 6 | opens **☰** and taps **Create Account** | the sign-up form opens and the menu closes |
| 7 | opens **☰** and taps **✕** | the menu closes without changing page |

---

### 🔁 1.8 "I'm back": returning visitor
**File:** `e2e/guest/returning-visitor.journey.spec.js`
**Goal:** a guest comes back to the site later.
**Pages:** Homepage → Adoption drives

| # | The guest… | We check that… |
|---|---|---|
| 1 | visits the homepage and the drives page once | both load from the server |
| 2 | comes back later (reload) | the shelf and the drives appear **instantly** from saved data, **without** asking the server again |
| 3 | comes back after a drive's date has passed (clock moved forward) | that drive has moved from **upcoming** to **past** without a new request to the server |
| 4 | has broken saved data in the browser | the site ignores it, loads fresh data from the server, and nothing breaks |

---

### ⚠️ 1.9 "Something's wrong": when the server has problems
**File:** `e2e/guest/server-problems.journey.spec.js`
**Goal:** a guest visits while the server is having trouble, and can recover without reloading.
**Pages:** Homepage → Adoption drives

| # | The guest… | We check that… |
|---|---|---|
| 1 | 🔌 opens the homepage while the server is down | an error message with a **retry** button appears, and the page doesn't crash |
| 2 | 🔌 clicks **retry** once the server is back | the 5 books appear and "books refreshed" shows |
| 3 | 🔌 opens **Adoption Drives** while the server is down | an error with **try again** appears |
| 4 | 🔌 clicks **try again** once the server is back | the drives appear |
| 5 | 🔌 opens a drive whose book list fails to load | the drive details still show, with **retry book list** under them |
| 6 | 🔌 clicks **retry book list** | the books at that station appear |
| 7 | 🔌 one station's book count fails to load | that drive card shows **"— books"** and every other card is normal |

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

- **Login and Create account don't link to each other.** A guest on Login with no account has to find "Create Account" in the navbar.
- **The test data only has open, upcoming drives.** The **past** tab is always empty and closed or cancelled drives never appear. Adding a few to `sql/seed.sql` would let journey 1.3 run without faking.
- **Journey 1.4 creates a real account every run.** The tests must run against a **separate test database**, not the team's shared one.

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
