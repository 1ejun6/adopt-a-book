# Adopt-a-Book: Customer User Journeys (E2E)

A customer is a logged-in reader. These journeys pick up where the guest journeys stop: right after a successful login.

> 🔌 = the step fakes a server response with `page.route()`, because the real data can't produce that situation on demand.

### Which account each journey uses

| Account | Used by | Why |
|---|---|---|
| **A fresh account**, registered through `/register` at the start of the journey | 2.1, 2.2, 2.3, 2.4, 2.5, 2.7, 2.8, 2.9, 2.10 | Each journey starts with an empty watchlist, no requests and no rsvps, and can change its own name, email and password without breaking other journeys running at the same time |
| **The seeded demo customer** (`b3563099-…`) | 2.6 | Only the seed can make **approved** requests (approving needs an admin). It also starts with 3 saved books |

The demo customer's email and password go in the root `.env` as `e2e_customer_email` and `e2e_customer_password`. Journey 2.6 only reads data, so it doesn't need a fresh seed every run.

### How each journey logs in

Being logged in just means the browser has the `access_token` and `refresh_token` cookies the server sets on `/login`. A journey gets them one of two ways:

| Way | How | Used for |
|---|---|---|
| **Through the login form** | open `/login`, type the email and password, click **Login** | Only steps marked **(through the login form)**, where checking the login itself is the point: 2.1 step 1 and 2.8 steps 7–8 |
| **Through the API** | `page.request.post('/login')` at the start of the journey, before opening any page | Everything else, where logging in is just setup |

The API way is faster, and it means a broken login page fails **only** the journeys that test the login form, not all 10. `page.request` shares cookies with the journey's browser, so the next `page.goto()` opens already logged in.

A `customer` fixture in `e2e/support/customer.js` does this for every journey:

1. **registers** a fresh account with `POST /register` (`e2e+<random>@example.com`), or uses the demo customer for 2.6
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
| 1 | logs in with their email and password **(through the login form)** | the button says **"Logging in…"**, then **"logged in"** appears and they land on `/customer` |
| 2 | looks at the navbar | it shows **Browse Books**, **Watchlist**, **My Adoptions**, **Pickups**, **Adoption Drives**, **Account** and **Logout**, and none of the guest links |
| 3 | clicks each navbar link in turn | each page opens with its own heading, and the clicked link is marked as active |
| 4 | clicks the **Adopt a Book** logo | they're taken back to `/customer` |
| 5 | reloads the page | they're still logged in, with the same navbar |
| 6 | types a guest address (`/`, `/drives`, `/login`, `/register`) | each one sends them to `/customer` instead |
| 7 | types `/admin/books` | they're sent to `/customer`, not to the admin page |
| 8 | clicks **Logout** | **"logged out"** appears, they land on **Login**, and the navbar is back to the guest links |
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
| 1 | opens an available book's details | the window shows the book and a **request** button |
| 2 | clicks **request** | the details window closes and **Request a copy** opens, with the 4-step tracker on **request & review**, the book's title and cover, and **their own** name and email under **Requesting as** |
| 3 | closes it with **Esc** | nothing is submitted (My Adoptions stays empty) |
| 4 | opens the book again, clicks **request**, then **Submit Request** | the button says **"Submitting..."**, then **"Request Submitted"**, and **"adoption request submitted"** appears |
| 5 | closes it and opens the same book again | **"you already requested this copy > check my adoptions"** appears and the button says **Request Pending** and can't be clicked |
| 6 | opens **My Adoptions** | **Active (1)**, with the book under **Awaiting Approval**, marked **Pending Review** and **requested** today's date |
| 7 | clicks **View Book** on that card | the book's details open **without** a request button |
| 8 | 🔌 tries to submit for a book someone else just took (server answers 409) | the server's error shows with a **retry** button, and nothing appears in My Adoptions |

---

### 📦 2.6 "Where are my books?": following my adoptions
**File:** `e2e/customer/06-follow-my-adoptions.spec.js`
**Goal:** a customer with approved requests checks what to do next.
**Pages:** My adoptions
**Account:** the seeded demo customer (3 approved requests)

| # | The customer… | We check that… |
|---|---|---|
| 1 | opens **My Adoptions** | **Active (3)** and **History (0)**, with all 3 books under **Your Next Step**, each marked **Approved** |
| 2 | looks at an approved card | it has **Arrange Pickup** (greyed out) and **View Book**, plus **"pickup scheduling is not available yet"** |
| 3 | clicks **View Book** | the book's details open without a request button |
| 4 | opens the **History** tab | **"No adoption history yet"** |
| 5 | 🔌 has one each of pending, approved, rejected, withdrawn and collected requests | pending sits under **Awaiting Approval**, approved under **Your Next Step**, and the other 3 are in **History** with the right labels; the tab counts add up |
| 6 | 🔌 has requests from different days | each section lists newest first |
| 7 | 🔌 has a request whose book was deleted | the card says **"book details unavailable"** and has no **View Book** button |

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
**Goal:** a customer fixes their details and changes their password.
**Pages:** Account → Browse books → Login

| # | The customer… | We check that… |
|---|---|---|
| 1 | opens **Account** | **My account** shows their name, initials, **reader account** and sign-in email |
| 2 | clicks **Edit profile** without changing anything | **Save changes** can't be clicked and it says **"No changes yet"** |
| 3 | changes their name and saves | **"account details updated"**, the window closes, and the new name and initials show |
| 4 | opens a book's **Request a copy** window | **Requesting as** shows the new name |
| 5 | opens **Change password** and types two different passwords | **"Passwords do not match."** shows and **Save changes** can't be clicked |
| 6 | fixes the confirmation and saves | **"password updated"** appears |
| 7 | logs out and logs in with the **old** password **(through the login form)** | an error appears and they stay on **Login** |
| 8 | logs in with the **new** password **(through the login form)** | they're back in |
| 9 | changes their email to one that **another account already uses** | the error shows inside the window, it stays open, and their typing is kept |
| 10 | presses **Esc** | the window closes and the old details are still showing |

---

### ⚠️ 2.9 "Something's wrong": server problems and an expired session
**File:** `e2e/customer/09-server-errors-and-expired-session.spec.js`
**Goal:** a customer keeps using the site when things go wrong, and recovers without reloading.
**Pages:** Browse books → Watchlist → My adoptions → Account → Adoption drives → Login

| # | The customer… | We check that… |
|---|---|---|
| 1 | 🔌 opens **Browse Books** while `/books` is down | an error toast with **retry** shows; **retry** brings the books back |
| 2 | 🔌 opens **Browse Books** while only `/watchlist` is down | the books still show, but bookmarks can't be clicked until **retry** on the error toast |
| 3 | 🔌 opens **Watchlist** while the server is down | **"We couldn't load your watchlist"** with **Try Again**, which loads it once the server is back |
| 4 | 🔌 opens **My Adoptions** while the server is down | the error shows with **Try Again**, which loads it once the server is back |
| 5 | 🔌 opens **Account** while the server is down | **"We couldn't load your details"** with **Try Again**, which loads it once the server is back |
| 6 | 🔌 opens **Adoption Drives** while the server is down | an error toast with **retry**, which loads the drives once the server is back |
| 7 | 🔌 opens a book whose details fail to load | the window shows no request button and the error toast has **retry**, which loads the book |
| 8 | 🔌 their session expires (the server starts answering 401) and they click to another page | they're sent to **Login** and the navbar shows the guest links |

---

### 📱 2.10 "On my phone": using the site on a small screen
**File:** `e2e/customer/10-use-on-a-phone.spec.js` *(phone-sized screen)*
**Goal:** a customer uses the site on their phone.
**Pages:** Browse books → Watchlist → Adoption drives

| # | The customer… | We check that… |
|---|---|---|
| 1 | logs in and taps **☰** | the menu shows all 6 customer links and **Logout** |
| 2 | taps **Browse Books** | the page opens, the menu closes, and the cards sit in a single column |
| 3 | taps a card's 🔖 | the **"saved to watchlist"** toast fits the screen and its comment box can be typed in |
| 4 | taps a card | the **Book details** window fits the screen and can be scrolled to the **request** button |
| 5 | opens **☰** and taps **Adoption Drives**, then opens a drive | the drive window fits and can be scrolled to **rsvp** |
| 6 | opens **☰** and taps **Logout** | **"logged out"**, they land on **Login**, and the menu is closed |

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
| 2.6 | Following my adoptions | `06-follow-my-adoptions.spec.js` | My adoptions | 7 |
| 2.7 | Rsvp to an adoption drive | `07-rsvp-to-a-drive.spec.js` | Adoption drives | 8 |
| 2.8 | Updating my account | `08-update-my-account.spec.js` | Account → Browse books → Login | 10 |
| 2.9 | Server problems and an expired session | `09-server-errors-and-expired-session.spec.js` | Every customer page → Login | 8 |
| 2.10 | Using the site on a phone | `10-use-on-a-phone.spec.js` | Browse books → Watchlist → Drives | 6 |
| | **Total** | | **10 journeys** | **81** |

---

# What the tests need

| What | How |
|---|---|
| A `customer` fixture | `e2e/support/customer.js` registers a fresh account and logs it in through the API (see **How each journey logs in**) |
| Demo customer login | `e2e_customer_email` and `e2e_customer_password` in the root `.env` |
| A test database | journeys create accounts, requests, watchlist entries and rsvps every run, so they must **not** run against the team's shared database (same as guest journey 1.4) |

---

# Not tested here

| What | Why |
|---|---|
| **Pickups** | The route has no page yet. Journey 2.1 only checks the link is there |
| An admin approving or rejecting a request | Belongs to the admin journeys. 2.6 uses seeded and faked statuses instead |
| Withdrawing a pending request | The server supports it (`DELETE /applications/:id`), but there's no button for it in the app |
| Exact colours, fonts and spacing | E2E checks behaviour and content, not design |
| Firefox and Safari | Chrome only for now, same as the guest journeys |

---

# Things we noticed while planning

- **Customers land on a blank page after logging in.** `/customer` (`views/customer/Home.vue`) is an empty `<div />`, and so is the logo link. Journey 2.1 will only be able to check the URL and navbar until it has content.
- **The Pickups link opens an empty page.** It's in the navbar but the route has no component.
- **The seed gives the demo customer 3 approved requests but no pending or rejected ones**, and no rsvps. Adding a pending and a rejected request to `sql/seed.sql` would let journey 2.6 run steps 5–6 without faking.
- **`WatchlistEntryDialog.vue` isn't used anywhere.** Notes are edited through the toast instead.
- **Changing the email or password in journey 2.8 must use a fresh account**, otherwise the demo login stops working for every other journey.

---

# How to run the journeys

From the `client/` folder:

```powershell
pnpm test:e2e -- e2e/customer         # run only the customer journeys
pnpm test:e2e -- e2e/customer --ui    # watch each journey click through the app
npx playwright show-report            # see the results, with screenshots of anything that failed
```
