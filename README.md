# Adopt a Book — README

## Application and repository

Adopt a Book is a book adoption and sharing application built with a Vue/Vite frontend, an Express backend, and Supabase for authentication, database storage, and book cover uploads. It integrates Open Library for book information and OneMap for location searches.

- First page of the hosted application — [Adopt a Book](https://adopt-a-book.vercel.app/)
- Public Git repository — [lee-hlmilk/adopt-a-book](https://github.com/lee-hlmilk/adopt-a-book)
- Hosted backend — [Adopt a Book API](https://adopt-a-book-api.vercel.app/)

## Test accounts

Use the following accounts to access the hosted application.

| Role | Email | Password |
| --- | --- | --- |
| Customer | customer@gmail.com | 1234567890 |
| Admin | admin@gmail.com | 1234567890 |

Open the application, select **Login**, and enter the credentials for the desired role. Customer accounts can browse books, manage their watchlist and adoptions, and view adoption drives. The admin account provides access to the dashboard, book inventory, adoption applications, appointments, and adoption drives.

## Set up the application locally

### 1. Install prerequisites

- Install Node.js 24.12.0 or a later Node.js 24 release.
- Install pnpm and ensure `node --version` and `pnpm --version` work in a terminal.
- Install Git if obtaining the project by cloning the repository.
- Obtain access to the application's configured Supabase project, or create a separate Supabase project using the database setup below.
- Obtain a OneMap account for address and postal-code searches.

### 2. Obtain the submitted files

Extract the submitted project archive and open a terminal in the folder containing the root `package.json`, `client`, `server`, and `sql` directories.

Alternatively, clone the public repository.

```bash
git clone https://github.com/lee-hlmilk/adopt-a-book.git
cd adopt-a-book
```

### 3. Install dependencies

Run the following command from the project root. The pnpm workspace installs dependencies for both the frontend and backend.

```bash
pnpm install
```

### 4. Configure the environment

Copy `example.env` to `.env` in the project root.

Fill in the values for your Supabase project and OneMap account. A local configuration has the following form.

```dotenv
supabaseurl=https://YOUR_PROJECT_REF.supabase.co
supabasepublishablekey=YOUR_SUPABASE_PUBLISHABLE_KEY
supabasesecretkey=YOUR_SUPABASE_SECRET_KEY
port=3000
clienturl=http://localhost:5174
serverurl=http://localhost:3000
openlibraryapi=https://openlibrary.org
onemapemail=YOUR_ONEMAP_EMAIL
onemappassword=YOUR_ONEMAP_PASSWORD
basetoken=
databaseurl=
```

Use the URL and keys belonging to the same Supabase project. The backend accepts `supabaseanonkey` as an alternative to `supabasepublishablekey`. Obtain the required keys from the project owner when reusing the existing database.

`databaseurl` and `basetoken` are only required for the database maintenance endpoints. They can remain empty when applying SQL through the Supabase SQL Editor. Keep `.env` private and keep Supabase secret keys on the backend.

For local development, leave the shell variable `VITE_SERVER_URL` unset so the frontend uses `serverurl`. Run with a development environment so local HTTP login cookies work.

### 5. Prepare the database and storage

If using the existing configured Supabase project, use its existing schema, data, storage bucket, and accounts.

For a fresh Supabase project, complete these steps.

1. Open the project's SQL Editor and execute the complete contents of `sql/base.sql` to create the schema and application functions.
2. Configure `.env`, start the application using the instructions below, and register the customer and admin emails through **Create Account** with the passwords listed above. Registration initially creates customer profiles for both accounts.
3. In the Supabase SQL Editor, promote the admin profile with the following statement.

   ```sql
   update public.users
   set role = 'admin'
   where email = 'admin@gmail.com';
   ```

4. In Supabase Authentication, find the UUIDs of these two accounts. In your local copy of `sql/seed.sql`, replace the `admin_id` and `customer_id` constants near the beginning with the corresponding UUIDs. The submitted seed script expects specific existing demo account IDs and does not create Supabase Auth accounts.
5. Execute the updated `sql/seed.sql` in the SQL Editor to populate the demo book catalogue, MRT stations, and demonstration activity. This script resets its demo fixtures, so run it on the intended demonstration database before testing.
6. In Supabase Storage, create a public bucket named `book-covers` for uploaded cover images. The backend performs uploads using its Supabase secret key.
7. Sign out and sign in again as the admin to load the updated role.

## Run the application

1. Open a terminal in the project root.
2. Start both services.

   ```bash
   pnpm dev
   ```

3. Keep the terminal running and open [http://localhost:5174](http://localhost:5174) in a browser.
4. Confirm the backend responds at [http://localhost:3000](http://localhost:3000). The root endpoint returns JSON containing `"status":"ok"`.
5. Sign in using the customer or admin account. The supplied accounts are available locally when connected to the existing Supabase project, or after completing the fresh-project account setup.
6. Press `Ctrl+C` in the terminal to stop the services.

To start the services separately, use two terminals in the project root.

```bash
# Terminal 1
pnpm dev:server

# Terminal 2
pnpm dev:client
```

To build the frontend for production, run the following command from the project root.

```bash
pnpm build
```

The generated frontend files are written to `client/dist`. The hosted deployment uses Vercel's `/api` rewrite to reach the backend. Local development uses the `serverurl` value above.

## How to test the application

The guest, customer, and admin Playwright test suites are on the repository's `test` branch. From the project root, fetch and switch to that branch before running the tests.

```bash
git fetch origin
git switch test
```

1. Add the following variables to the root `.env` file. Preserve the lowercase variable names.

   ```dotenv
   e2e_customer_email=customer@gmail.com
   e2e_customer_password=1234567890
   e2e_admin_email=admin@gmail.com
   e2e_admin_password=1234567890
   e2e_url=https://adopt-a-book.vercel.app
   ```

2. From the project root, enter the frontend directory and install dependencies on the first run.

   ```bash
   cd client
   pnpm install
   ```

3. Install the Playwright browser binaries on the first run if they are not already installed.

   ```bash
   npx playwright install
   ```

4. Run each test suite from the `client` directory.

   ```bash
   # Guest tests
   npx playwright test e2e/guest

   # Customer tests
   npx playwright test e2e/customer

   # Admin tests
   npx playwright test e2e/admin
   ```

5. Review the terminal output for passed and failed tests. If an HTML report is generated, open it with the following command.

   ```bash
   npx playwright show-report
   ```

The supplied `e2e_url` targets the hosted application. To test locally, replace its value with `http://localhost:5174` and start the frontend and backend by running `pnpm dev` from the project root in a separate terminal before running the tests.
