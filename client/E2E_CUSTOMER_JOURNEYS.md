# Adopt-a-Book: Customer User Journeys (E2E)

A customer is a logged-in reader. These journeys pick up where the guest journeys stop: right after a successful login.

> 🔌 = the step fakes a server response with `page.route()`, because the real data can't produce that situation on demand.

### Which account each journey uses

| Account | Used by | Why |
|---|---|---|
| **A fresh account**, registered through `/register` at the start of the journey | 2.1, 2.2, 2.3, 2.4, 2.5, 2.7, 2.8, 2.9, 2.10, 2.11, 2.14, 2.15, 2.16 | Each journey starts with an empty watchlist, no requests and no rsvps, and can change its own name, email and password without breaking other journeys running at the same time |
| **The seeded demo customer** (`b3563099-…`) | 2.6, 2.12, 2.13 | Only the seed (or an admin) can create **approved** requests with reserved books so pickup scheduling can run against the real backend |

The demo customer's email and password go in the root `.env` as `e2e_customer_email` and `e2e_customer_password`. Journeys 2.12 and 2.13 clean up any appointments they create before finishing so the demo customer stays ready for the next run.

### How each journey logs in

Being logged in just means the browser has the `access_token` and `refresh_token` cookies the server sets on `/login`. A journey gets them one of two ways:

| Way | How | Used for |
|---|---|---|
| **Through the login form** | open `/login`, type the email and password, click **Login** | Only steps marked **(through the login form)**, where checking the login itself is the point: 2.1 step 1 and 2.8 steps 8–9 |
| **Through the API** | `page.request.post('/login')` at the start of the journey, before opening any page | Everything else, where logging in is just setup |

The API way is faster, and it means a broken login page fails **only** the journeys that test the login form, not all 16. `page.request` shares cookies with the journey's browser, so the next `page.goto()` opens already logged in.

A `customer` fixture in `e2e/support/customer.js` does this for every journey:

1. **registers** a fresh account with `POST /register` (`e2e-customer-<random>@example.com`), or uses the demo customer for 2.6, 2.12 and 2.13
2. **logs in** with `POST /login` through `page.request`
3. **hands the journey** `{ name, email, password }`

```js
test('saving books while browsing', async ({ page, customer }) => {
  await page.goto('/customer/books') // already logged in as customer
})
```

Two things the fixture must get right:

- **Send `Origin: <clienturl>` on every API call.** The server rejects POST, PATCH and DELETE requests that carry cookies without the client's origin (`server/utils/security.js`), with "request origin is not allowed".
- **Log in before the first `page.goto()`.** The app checks the session once, on the first page load, and remembers the answer (`client/src/lib/session.js`). If a page opens first, the app decides "guest" and sends the journey to Login.

---

### 🔑 2.1 "I'm in": logging in and finding my way around
**File:** `e2e/customer/01-log-in-and-look-around.spec.js`
**Goal:** a new customer logs in and checks what they can and can't reach.
**Pages:** Login → Customer home → every customer page

| # | The customer… | We check that… |
|---|---|---|
| 1 | logs in with their email and password **(through the login form)** | the button says **"Logging in…"**, then **"login successful"** appears and they land on `/customer` |
| 2 | looks at the navbar | it shows **Browse Books**, **Watchlist**, **My Adoptions**, **Adoption Drives**, **Account** and **Logout**, and none of the guest links |
| 3 | clicks each navbar link in turn (and visits `/customer/adoptions`) | each page opens with its own heading and active link state, and `/customer/adoptions` redirects to `/customer/adoption` |
| 4 | clicks the **Adopt a Book** logo | they're taken back to `/customer` |
| 5 | reloads the page | they're still logged in, with the same navbar |
| 6 | types a guest address (`/`, `/drives`, `/login`, `/register`) | each one sends them to `/customer` instead |
| 7 | types `/admin/books` | they're sent to `/customer`, not to the admin page |
| 8 | clicks **Logout** | they land on **Login**, and the navbar is back to the guest links |
| 9 | presses the browser **Back** button | they're sent to **Login**, not back into a customer page |

---

### 📖 2.2 "What can I adopt?": searching the catalogue
**File:** `e2e/customer/02-search-the-catalogue.spec.js`
**Goal:** a customer looks for a specific book and narrows the list down.
**Pages:** Browse books

| # | The customer… | We check that… |
|---|---|---|
| 1 | opens **Browse Books** | **"Find your next read"** shows, loading cards appear briefly, then up to **16 book cards** and **"N books found"** matching what the server sent |
| 2 | types part of a real title into the search box | after a short pause the list updates, the URL gains `?search=…`, and every card matches |
| 3 | picks a genre from **All genres** | only books in that genre stay, and the URL gains `?subject=…` |
| 4 | switches the sort to **Author A–Z**, then **Newest** | the cards re-order to match, and the URL gains `?sort=…` |
| 5 | reloads the page | the search box, genre and sort are all restored from the URL, with the same results |
| 6 | searches for something that doesn't exist | **"0 books found"** and the toast **"no books found > adjust search & filters"** |
| 7 | clears the search and goes to **page 2** | a different set of cards shows and the URL gains `?page=2` |
| 8 | changes the genre while on page 2 | they're taken back to page 1 |
| 9 | presses the browser **Back** button | the previous filters and results come back |
| 10 | 🔌 sets a location near Bugis and searches | only books collected near there show, and **clear location filter** appears; clicking it brings all books back |

---

### 🔖 2.3 "I'll come back to this one": saving books while browsing
**File:** `e2e/customer/03-save-books-while-browsing.spec.js`
**Goal:** a customer bookmarks books they like and leaves a note on one.
**Pages:** Browse books → Watchlist

| # | The customer… | We check that… |
|---|---|---|
| 1 | clicks the 🔖 bookmark on a book card | the bookmark fills in straight away and a **"saved to watchlist"** toast appears with that book's title and a comment box |
| 2 | types a comment and presses **save** | **"comment saved"** appears and the toast closes |
| 3 | bookmarks a second book and closes the toast with **✕** without typing | the book stays saved, with no comment |
| 4 | opens a third book's details and clicks the bookmark inside the window | the bookmark fills in there and on its card |
| 5 | clicks a filled bookmark | **"removed from watchlist"** appears and the bookmark empties |
| 6 | opens **Watchlist** | **"2 saved books"**, showing exactly the two books still saved |
| 7 | goes back to **Browse Books** | the two saved books still have filled bookmarks |

---

### 📝 2.4 "Keeping my list tidy": managing the watchlist
**File:** `e2e/customer/04-manage-my-watchlist.spec.js`
**Goal:** a customer looks after the books they saved.
**Pages:** Watchlist → Browse books
**Setup:** the journey saves 3 books (one with a note) through the API before it starts.

| # | The customer… | We check that… |
|---|---|---|
| 1 | opens **Watchlist** | **"3 saved books"** and 3 cards with title, author and collection point |
| 2 | clicks the card with a note | the **Book details** window shows **Your private note** with that note; a book without one says **"no note added yet"** |
| 3 | clicks **Edit note**, changes the text and saves | **"comment saved"** appears and the new note shows in the window straight away |
| 4 | reloads the page and opens the same book | the new note is still there |
| 5 | clicks 🗑 **Remove from watchlist** inside the window | **"removed from watchlist"**, the window closes, and the count drops to **"2 saved books"** |
| 6 | clicks 🗑 on a card | that card disappears and the count drops to **"1 saved book"** |
| 7 | removes the last book | **"Your shelf is waiting"** shows with a **Browse books** button |
| 8 | clicks **Browse books** | they land on **Browse Books** |

---

### 🙋 2.5 "I'd like this one": requesting a book
**File:** `e2e/customer/05-request-a-book.spec.js`
**Goal:** a customer asks to adopt a book and follows the request.
**Pages:** Browse books → My adoptions

| # | The customer… | We check that… |
|---|---|---|
| 1 | opens an available book's details | the window shows the book, **"Available to request"**, and a **Request this book** button |
| 2 | clicks **Request this book** | the details window closes and **Request this book** opens, with the 4-step tracker (**Choose → Request → Pickup → Collect**) on **Request**, the book's title, condition and collection area, and **their own** name and email under **Requesting as** |
| 3 | clicks **Back to book details**, then **Request this book**, then presses **Esc** | **Back to book details** returns to the book window; **Esc** closes without submitting (My Adoptions stays empty) |
| 4 | opens the book again, clicks **Request this book**, then **Send adoption request** | the button says **"Sending…"**, then the dialog title becomes **"Adoption request sent"** with badge **Under review**, expandable **Request reference**, **Continue browsing**, and **View my request** |
| 5 | clicks **Continue browsing** and opens the same book again | **"You already have a request for this book."** appears with a **View my request** link instead of **Request this book** |
| 6 | clicks **Continue browsing** and opens **My Adoptions** from the navbar | **Active 1** and **Waiting 1** are shown, listing the book under **Waiting for book approval** marked **Under review** |
| 7 | clicks the adoption row to view details | **Adoption details** opens with progress on **Request**, badge **Under review**, book title, and **Withdraw request** button |
| 8 | 🔌 tries to submit for a book someone else just took (409 conflict and reserved book) | **"This book is no longer available for requests."** shows inside the window |

---

### 📦 2.6 "Where are my books?": following my adoptions
**File:** `e2e/customer/06-follow-my-adoptions.spec.js`
**Goal:** a customer with approved requests checks what to do next across the Active stage tabs and History.
**Pages:** My adoptions
**Account:** the seeded demo customer (3 approved requests)

| # | The customer… | We check that… |
|---|---|---|
| 1 | opens **My Adoptions** | **Active (3)** and **History (0)**, with stage sub-tab **Needs action (3)** selected by default and all 3 books under **Arrange a pickup**, each marked **Approved** and **Not scheduled** |
| 2 | clicks across **Waiting (0)**, **Pickups (0)** and **All (3)** | **Waiting** shows **"No requests awaiting a response"** with **View books needing action**, **Pickups** shows **"No confirmed pickups"**, and **All** lists all 3 approved books |
| 3 | opens the **History** tab | **"No history yet"** |
| 4 | 🔌 has one each of pending, approved, rejected, withdrawn and collected requests | **Active (2)** splits into **Needs action (1)** (**Arrange a pickup**) and **Waiting (1)** (**Waiting for book approval**), while **History (3)** lists **Not approved**, **Withdrawn**, and **Collected** |
| 5 | 🔌 has requests from different days | each section lists newest first |
| 6 | 🔌 has a request whose book was deleted (`bookid: null`) | the row says **"Book details unavailable"** and still opens **Adoption details** |

---

### 🎟️ 2.7 "Count me in": rsvp to an adoption drive
**File:** `e2e/customer/07-rsvp-to-a-drive.spec.js`
**Goal:** a customer signs up for a drive, then changes their mind.
**Pages:** Adoption drives

| # | The customer… | We check that… |
|---|---|---|
| 1 | opens **Adoption Drives** | the **my drives** tab is selected and says **"no registered adoption drives"**; **upcoming** lists every upcoming drive from the server |
| 2 | opens an open drive from **upcoming** and clicks **rsvp** | the button says **"saving..."**, then **"registered for adoption drive"** appears and it changes to **cancel registration** |
| 3 | closes the window | the drive has moved from **upcoming** to **my drives**, and the tab counts changed by one each |
| 4 | opens it from **my drives** | **slots left** is one lower than before |
| 5 | reloads the page | the drive is still in **my drives** |
| 6 | clicks **cancel registration** | **"registration cancelled"** appears, the drive goes back to **upcoming**, and the slots go back up |
| 7 | 🔌 opens a drive with **0 slots left** | **"this drive is full"** instead of an rsvp button |
| 8 | 🔌 clicks **rsvp** but the drive closed in the meantime (409) | **"drive is closed or cancelled"** appears and they stay unregistered |

---

### 👤 2.8 "That's not my name": updating my account
**File:** `e2e/customer/08-update-my-account.spec.js`
**Goal:** a customer fixes their profile details and changes their password in the Account workspace.
**Pages:** Account → Browse books → Login

| # | The customer… | We check that… |
|---|---|---|
| 1 | opens **Account** | **My account** shows their avatar initials, name and sign-in email in the sidebar, with the **Profile details** tab selected |
| 2 | checks the **Profile details** form before changing anything | **Full name** and **Email address** are pre-filled, status says **"No unsaved changes"**, and **Update** is disabled |
| 3 | types an invalid email and blurs the field | **"Enter a valid email address."** appears and **Update** cannot be clicked |
| 4 | restores the email, changes their **Full name**, and clicks **Update** | status shows **"You have unsaved changes"** before saving, then **"Profile saved"** appears (inline and toast), and the sidebar updates to the new name and initials |
| 5 | opens a book's **Request this book** window | **Requesting as** shows the new name |
| 6 | returns to **Account**, switches to the **Password** tab (using keyboard arrow keys), and types two different passwords | **"Passwords don’t match."** shows on blur, the eye buttons toggle password visibility, and **Update** is disabled |
| 7 | fixes the confirmation and clicks **Update** | **"Passwords match."** appears, then **"Password updated"** shows (inline and toast) and both fields clear |
| 8 | logs out and logs in with the **old** password **(through the login form)** | an error toast appears and they stay on **Login** |
| 9 | logs in with the **new** password **(through the login form)** | they're back in on `/customer` |
| 10 | changes their email to one that **another account already uses** | the error shows inside the form (`role="alert"`), their typing is kept, and reloading shows the original email is still saved |

---

### ⚠️ 2.9 "Something's wrong": server problems and an expired session
**File:** `e2e/customer/09-server-errors-and-expired-session.spec.js`
**Goal:** a customer keeps using the site when things go wrong, and recovers without reloading.
**Pages:** Browse books → Watchlist → My adoptions → Account → Adoption drives → Login

| # | The customer… | We check that… |
|---|---|---|
| 1 | 🔌 opens **Browse Books** while `/books` is down | an error toast with **retry** shows; **retry** brings the books back |
| 2 | 🔌 opens **Browse Books** while only `/watchlist` is down | the books still show, but bookmarks can't be clicked until **retry** on the error toast |
| 3 | 🔌 opens **Watchlist** while the server is down | **"We couldn’t load your watchlist"** with **Try Again**, which loads it once the server is back |
| 4 | 🔌 opens **My Adoptions** while `/applications` is down | **"We couldn’t load your adoptions"** with **Try again**, which loads **"No active adoptions"** once the server is back |
| 5 | 🔌 opens **Account** while `/customer/profile` is down | **"We couldn’t load your details"** with **Try again**, which loads the account once the server is back |
| 6 | 🔌 opens **Adoption Drives** while the server is down | an error toast with **retry**, which loads the drives once the server is back |
| 7 | 🔌 opens a book whose details fail to load | **Request this book** is disabled and the error toast has **Retry**, which loads the book and enables the button |
| 8 | 🔌 their session expires (cookies cleared / server answers 401) and they click to another page | they're sent to **Login** and the navbar shows the guest links |

---

### 📱 2.10 "On my phone": using the site on a small screen
**File:** `e2e/customer/10-use-on-a-phone.spec.js` *(phone-sized screen)*
**Goal:** a customer uses the site on their phone.
**Pages:** Browse books → Watchlist → Adoption drives

| # | The customer… | We check that… |
|---|---|---|
| 1 | logs in and taps **☰** | the menu shows all 5 customer links and **Logout**, and pressing **Esc** closes it |
| 2 | taps **Browse Books** | the page opens, the menu closes, and the cards sit in a single column |
| 3 | taps a card's 🔖 | the **"saved to watchlist"** toast fits the screen and its comment box can be typed in |
| 4 | taps a card | the **Book details** window fits the screen and can be scrolled to **Request this book** |
| 5 | opens **☰** and taps **Adoption Drives**, then opens a drive | the drive window fits and can be scrolled to **rsvp** |
| 6 | opens **☰** and taps **Logout** | they land on **Login**, and the menu is closed |

---

### ↩️ 2.11 "I changed my mind": inspecting and withdrawing a pending request
**File:** `e2e/customer/11-withdraw-a-request.spec.js`
**Goal:** a customer inspects their pending adoption request and withdraws it so the copy is freed up.
**Pages:** My adoptions
**Setup:** the journey creates 1 pending book request through `POST /applications` before opening the page.

| # | The customer… | We check that… |
|---|---|---|
| 1 | opens **My Adoptions** | **Active (1)** and **Waiting (1)** are selected by default, showing the book under **Waiting for book approval** with badge **Under review** |
| 2 | clicks the book row (**View details for \<title\>**) | **Adoption details** opens with the 4-step tracker on **Request**, badge **Under review**, **Back to my adoptions**, and **Withdraw request** |
| 3 | expands **Book and request information** | condition, collection area, requested date, request reference ID, and the lazy-loaded **Book description** from `/books/:id` appear |
| 4 | 🔌 expands **Book and request information** while `/books/:id` is down | **"We couldn’t load the book description."** shows with **Retry book information**, which loads the description once the server recovers |
| 5 | clicks **Withdraw request**, then **Keep request** | the dialog title becomes **"Withdraw this request?"**, and **Keep request** returns to **Adoption details** without sending a `DELETE` |
| 6 | clicks **Withdraw request**, then confirms **Withdraw request** | the button says **"Withdrawing…"**, the title becomes **"Request withdrawn"**, **"Your request has been withdrawn and moved to History."** shows, and **Active** drops to `0` |
| 7 | clicks **View in History** | the dialog closes, the **History (1)** tab opens, and the book is listed with badge **Withdrawn** |
| 8 | 🔌 tries to withdraw when `DELETE /applications/:id` fails, then clicks **Check status again** | the reconciliation flow checks `/applications` and tells them **"Your change was not saved. You can try again."** |

---

### 📅 2.12 "When can I collect it?": arranging a pickup for an approved book
**File:** `e2e/customer/12-arrange-a-pickup.spec.js`
**Goal:** a customer with an approved request proposes a preferred pickup location, date, and time.
**Pages:** My adoptions
**Account:** the seeded demo customer (or a mocked approved request with a reserved book)

| # | The customer… | We check that… |
|---|---|---|
| 1 | opens **My Adoptions** | **Needs action** is active, listing the approved book under **Arrange a pickup** with **Not scheduled** |
| 2 | clicks the row (**Arrange pickup for \<title\>**) | **Arrange pickup** opens with the 4-step tracker on **Pickup** and **Preferred pickup location** pre-filled with the book's collection area |
| 3 | clears location, enters a past date, leaves time blank, and clicks **Review pickup request** | **"Check your pickup details"** error summary appears with 3 links (**Enter a preferred pickup location.**, **Choose today or a later date in Singapore time.**, **Enter a preferred time or time range.**); clicking a link focuses its field |
| 4 | changes a field and presses **Esc** (or **Back**) | **"Leave without sending?"** appears; **Keep editing** returns to the form with their typing intact, while **Discard changes** closes without sending |
| 5 | fills a location, future date, and time (`10:30–11:00`) and clicks **Review pickup request** | the step changes to **Review pickup request** with badge **Not submitted yet** and the formatted Location, Date, and Time |
| 6 | clicks **Change** next to **Time**, updates it to `14:00–15:00`, and reviews again | `pickup-timeslot` is focused on return, and the review summary updates to `14:00–15:00` |
| 7 | clicks **Send pickup request** | `POST /appointments` is sent, the button says **"Sending…"**, and **Pickup request sent** appears with badge **Pickup awaiting confirmation** and expandable **Reference details** |
| 8 | clicks **Back to my adoptions** | the dialog closes, and the book moves from **Needs action** to **Waiting** under **Waiting for pickup confirmation** showing the scheduled date, time, and location |

---

### 🔄 2.13 "Can we move the time?": rescheduling, calendar export, and cancelling a pickup
**File:** `e2e/customer/13-manage-and-cancel-pickup.spec.js`
**Goal:** a customer edits an existing pickup request, downloads a calendar invite for a confirmed pickup, or cancels the pickup.
**Pages:** My adoptions
**Account:** the seeded demo customer (with an appointment created via API setup, plus 🔌 for confirmed status)

| # | The customer… | We check that… |
|---|---|---|
| 1 | opens a book in **Waiting** (`pending confirmation`) and clicks **Edit pickup request** | **Edit pickup request** opens pre-filled with the current location, date, and time |
| 2 | clicks **Review pickup request** without changing anything | **"Change at least one pickup detail before sending an updated request."** appears |
| 3 | updates the location, reviews, and clicks **Send pickup request** | `PATCH /appointments/:id` is sent, the receipt shows the new location, and the row in **My Adoptions** updates |
| 4 | 🔌 opens a book in **Pickups** (`appointment confirmed` with time `10:30–11:00`) | the book sits under **Your confirmed pickups**, and opening it shows **Confirmed pickup**, **Request a change**, **Add to calendar**, and **Cancel pickup** |
| 5 | 🔌 clicks **Add to calendar** | the browser downloads `pickup-<id>.ics` containing `BEGIN:VCALENDAR`, `SUMMARY:Collect <title>`, and `LOCATION:<location>` |
| 6 | 🔌 clicks **Request a change** on a confirmed pickup and proceeds to review | the review step displays the **Current confirmed pickup** box and warns **"Sending these changes replaces your current confirmation..."** |
| 7 | clicks **Cancel pickup**, clicks **Keep pickup**, then clicks **Cancel pickup** and confirms | **"Cancel this pickup?"** appears; confirming sends `DELETE /appointments/:id` and shows **Pickup cancelled** (*"Your pickup has been cancelled. Your adoption is still approved."*) |
| 8 | returns to **My Adoptions** and opens the book's **Adoption details** | the book is back in **Needs action** (**Arrange a pickup**) marked **Pickup cancelled**, and expanding **Previous pickup attempts (1)** lists the cancelled appointment |
| 9 | 🔌 has a pickup declined by admin (`status: 'rejected'`) | the book surfaces in **Needs action** marked **Pickup declined**, opening it shows the attempt under **Previous pickup attempts (1)**, and **Arrange pickup** allows proposing a new time |

---

### 🔍 2.14 "Where's that record?": searching, deep-linking, and handling pickup warnings in My Adoptions
**File:** `e2e/customer/14-search-and-edge-cases-in-adoptions.spec.js`
**Goal:** a customer searches their adoptions by title or reference ID, follows deep links, and sees warnings when pickup records need attention.
**Pages:** My adoptions

| # | The customer… | We check that… |
|---|---|---|
| 1 | 🔌 has 12 active adoption records and opens **All** in **Active** | 10 rows show on page 1 with pagination; going to **page 2** updates `?page=2` and shows the remaining 2 records |
| 2 | 🔌 types a book title or exact request/pickup UUID into **Search all adoptions** (`Find a book`) | stage sub-tabs hide, **Search results** groups matches under **Active** and **History**, and the URL gains `?search=…` |
| 3 | 🔌 searches for something with no matches, then clicks **Clear search** (or **Back to Active**) | **"No matching results"** shows; clearing restores the previous tab, stage, and page |
| 4 | 🔌 opens `/customer/adoption?request=<id>` and `/customer/adoption?appointment=<id>&edit=true` | the page reveals the right tab/page and automatically opens the matching **Adoption details** or **Edit pickup request** dialog |
| 5 | opens `/customer/adoption?request=non-existent-id` | **"That adoption or pickup could not be found. Your current records are shown below."** appears |
| 6 | 🔌 has an overdue pickup (`appointmentdate` in the past), an incomplete pickup (missing `timeslot`), and an unlinked appointment | all three surface in **Needs action** under **Check your pickup** (`Pickup date has passed`), **Check these details** (`Pickup details incomplete` → **Complete pickup details**), and **Pickup records to check** (`Unlinked pickup record`) |
| 7 | 🔌 opens **My Adoptions** while `/appointments` is down (503) but `/applications` succeeds | the amber alert **"Pickup information is unavailable. Retry before arranging a pickup or travelling."** shows, **Arrange pickup** is withheld, and clicking **Retry pickup information** restores pickup actions |

---

### 📥 2.15 "I'll take this one": adopting directly from the watchlist
**File:** `e2e/customer/15-adopt-from-watchlist.spec.js`
**Goal:** a customer decides to adopt a book saved on their watchlist, checks its details, submits an adoption request directly from the modal, navigates to view their pending request, and verifies the watchlist updates to reflect the active request.
**Pages:** Watchlist → My adoptions
**Account:** fresh account

| # | The customer… | We check that… |
|---|---|---|
| 1 | saves an available book to their watchlist with a comment, and opens **Watchlist** | the saved book card is displayed with badge **available** and private note |
| 2 | clicks the book card to inspect details | **Book details** dialog opens (`CustomerBookDialogs`), showing cover, author, condition, collection area, private note, and **Request this book** button |
| 3 | clicks **Request this book** | the nested **Request this copy** modal opens with reader email, collection point info, and **Send adoption request** button |
| 4 | clicks **Send adoption request** | `POST /applications` is sent; dialog transitions to **Adoption request sent** with badge **Adoption requested** and button **View my request** |
| 5 | clicks **View my request** | the dialog closes and user navigates to `/customer/adoption?request=<id>`, where the pending request details dialog automatically opens |
| 6 | closes the details modal and navigates back to **Watchlist** | clicking the book card now displays **"You already have a request for this book."** with a link to **View my request**, and the **Request this book** button is replaced |

---

### 🎪 2.16 "What's at this drive?": exploring books and venue at an adoption drive
**File:** `e2e/customer/16-explore-drive-books-and-venue.spec.js`
**Goal:** a customer explores an upcoming adoption drive, browses available books brought to that MRT station, follows the external venue map link, and handles empty and error states.
**Pages:** Adoption drives
**Account:** fresh account

| # | The customer… | We check that… |
|---|---|---|
| 1 | opens **Adoption Drives** and clicks an upcoming drive card | drive details dialog (`AppAdoptionDriveDialog`) opens showing drive title, station, dates, times, and venue section |
| 2 | checks the **Available books at this station** section (`AppAdoptionDriveBooks`) | `GET /books?mrtstationids=<id>&status=available&limit=5` is requested; up to 5 book cards render with thumbnail, title, and author |
| 3 | 🔌 drives with > 5 available books at the venue | the section renders the first 5 books and shows the overflow text **"& N more"** reflecting the remaining station inventory count |
| 4 | checks the venue location and clicks **Open in Google Maps** | venue link has `target="_blank"` and `rel="noopener noreferrer"` with valid maps query URL pointing to the drive venue or coordinates |
| 5 | 🔌 opens a drive located at a station with zero available books | empty state displays **"no available books at this station yet"** and **"browse the catalogue to request books from other locations"** |
| 6 | 🔌 opens a drive when `/books` fails with 500 | error alert displays with **"retry book list"** button; clicking retry re-fetches `/books` and renders the book list |

---

### Customer summary

All files live in `client/e2e/customer/`. The number at the front matches the journey number.

| # | Journey | File | Pages it crosses | Steps |
|---|---|---|---|---|
| 2.1 | Logging in and finding my way around | `01-log-in-and-look-around.spec.js` | Login → every customer page | 9 |
| 2.2 | Searching the catalogue | `02-search-the-catalogue.spec.js` | Browse books | 10 |
| 2.3 | Saving books while browsing | `03-save-books-while-browsing.spec.js` | Browse books → Watchlist | 7 |
| 2.4 | Managing the watchlist | `04-manage-my-watchlist.spec.js` | Watchlist → Browse books | 8 |
| 2.5 | Requesting a book | `05-request-a-book.spec.js` | Browse books → My adoptions | 8 |
| 2.6 | Following my adoptions | `06-follow-my-adoptions.spec.js` | My adoptions | 6 |
| 2.7 | Rsvp to an adoption drive | `07-rsvp-to-a-drive.spec.js` | Adoption drives | 8 |
| 2.8 | Updating my account | `08-update-my-account.spec.js` | Account → Browse books → Login | 10 |
| 2.9 | Server problems and an expired session | `09-server-errors-and-expired-session.spec.js` | Every customer page → Login | 8 |
| 2.10 | Using the site on a phone | `10-use-on-a-phone.spec.js` | Browse books → Watchlist → Drives | 6 |
| 2.11 | Inspecting and withdrawing a pending request | `11-withdraw-a-request.spec.js` | My adoptions | 8 |
| 2.12 | Arranging a pickup for an approved book | `12-arrange-a-pickup.spec.js` | My adoptions | 8 |
| 2.13 | Rescheduling, calendar export, and cancelling a pickup | `13-manage-and-cancel-pickup.spec.js` | My adoptions | 9 |
| 2.14 | Searching, deep-linking, and pickup warnings in My Adoptions | `14-search-and-edge-cases-in-adoptions.spec.js` | My adoptions | 7 |
| 2.15 | Adopting directly from the watchlist | `15-adopt-from-watchlist.spec.js` | Watchlist → My adoptions | 6 |
| 2.16 | Exploring books and venue at an adoption drive | `16-explore-drive-books-and-venue.spec.js` | Adoption drives | 6 |
| | **Total** | | **16 journeys** | **124** |

---

# What the tests need

| What | How |
|---|---|
| A `customer` fixture | `e2e/support/customer.js` registers a fresh account and logs it in through the API (see **How each journey logs in**) |
| Demo customer login | `e2e_customer_email` and `e2e_customer_password` in the root `.env` |
| A test database | journeys create accounts, requests, watchlist entries, appointments and rsvps every run, so they must **not** run against the team's shared database (same as guest journey 1.4) |

---

# Not tested here

| What | Why |
|---|---|
| An admin approving or rejecting a request or confirming a pickup | Belongs to the admin journeys. 2.6, 2.12, 2.13 and 2.14 use seeded and faked statuses instead |
| Customer home page content (`/customer`) | `views/customer/Home.vue` is still an empty `<div />`; journey 2.1 checks the URL and navbar |
| Exact colours, fonts and spacing | E2E checks behaviour and content, not design |
| Firefox and Safari | Chrome only for now, same as the guest journeys |

---

# Things we noticed while planning

- **Customers still land on a blank page after logging in.** `/customer` (`views/customer/Home.vue`) is an empty `<div />`, and so is the logo link. Journey 2.1 checks the URL and navbar until it has content.
- **Pickups now live inside My Adoptions (`/customer/adoption`).** The standalone Pickups navbar link was removed, and `/customer/adoptions` redirects to `/customer/adoption` preserving query parameters and hashes.
- **`/login` and `/session` still omit `name` in `auth.user`.** `RequestCopyDialog.vue` falls back to `"Reader"` under **Requesting as** until the customer updates their profile in **Account** (which updates `auth.user` in memory) or the server includes `name` in `req.user` and `/login`.
- **`WatchlistEntryDialog.vue` and `CustomerProfileDialog.vue` aren't used by the views anymore.** Watchlist notes are edited through `WatchlistCommentToast.vue`, and Account settings now live inline in `views/customer/Account.vue`.
- **Changing the email or password in journey 2.8 must use a fresh account**, otherwise the demo login stops working for every other journey.

---

# How to run the journeys

From the `client/` folder:

```powershell
pnpm test:e2e -- e2e/customer         # run only the customer journeys
pnpm test:e2e -- e2e/customer --ui    # watch each journey click through the app
npx playwright show-report            # see the results, with screenshots of anything that failed
```
