
create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null check (length(btrim(name)) > 0),
  email text not null,
  role text not null default 'customer'
    check (role in ('customer', 'admin')),
  createdat timestamptz not null default now(),
  updatedat timestamptz not null default now()
);

create unique index if not exists users_email_unique_idx on public.users (lower(email));

create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(btrim(title)) > 0),
  authors text[] not null default '{}',
  isbn text,
  subjects text[] not null default '{}',
  publicationyear integer,
  description text not null default '',
  coverurl text,
  openlibraryid text,
  source text not null default 'manual'
    check (source in ('manual', 'open_library')),
  createdby uuid references public.users (id) on delete set null,
  status text not null default 'available'
    check (status in ('available', 'reserved', 'adopted')),
  createdat timestamptz not null default now(),
  updatedat timestamptz not null default now()
);

create table if not exists public.adoptiondrives (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(btrim(title)) > 0),
  location text not null check (length(btrim(location)) > 0),
  eventdate date not null,
  description text not null default '',
  maxcapacity integer not null check (maxcapacity > 0),
  userids uuid[] not null default '{}',
  createdby uuid references public.users (id) on delete set null,
  status text not null default 'open'
    check (status in ('open', 'closed', 'cancelled')),
  createdat timestamptz not null default now(),
  updatedat timestamptz not null default now()
);

create table if not exists public.adoptionapplications (
  id uuid primary key default gen_random_uuid(),
  userid uuid not null references public.users (id) on delete cascade,
  bookid uuid not null references public.books (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  createdat timestamptz not null default now(),
  updatedat timestamptz not null default now()
);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  userid uuid not null references public.users (id) on delete cascade,
  bookid uuid not null references public.books (id) on delete cascade,
  booktitle text not null check (length(btrim(booktitle)) > 0),
  location text not null check (length(btrim(location)) > 0),
  appointmentdate date not null,
  timeslot text not null check (length(btrim(timeslot)) > 0),
  status text not null default 'pending confirmation'
    check (status in (
      'pending confirmation',
      'appointment confirmed',
      'collected',
      'cancelled',
      'rejected'
    )),
  createdat timestamptz not null default now(),
  updatedat timestamptz not null default now()
);

create table if not exists public.watchlist (
  id uuid primary key default gen_random_uuid(),
  userid uuid not null references public.users (id) on delete cascade,
  bookid uuid not null references public.books (id) on delete cascade,
  bookname text not null check (length(btrim(bookname)) > 0),
  comments text not null default '',
  lastupdated timestamptz not null default now(),
  constraint watchlist_user_book_unique unique (userid, bookid)
);

create index if not exists books_status_idx on public.books (status);
create index if not exists books_authors_idx on public.books using gin (authors);
create index if not exists books_subjects_idx on public.books using gin (subjects);
create index if not exists adoption_drives_event_date_idx
  on public.adoptiondrives (eventdate);
create index if not exists adoption_applications_user_id_idx
  on public.adoptionapplications (userid);
create index if not exists adoption_applications_book_id_idx
  on public.adoptionapplications (bookid);
create index if not exists adoption_applications_status_idx
  on public.adoptionapplications (status);
create unique index if not exists adoption_applications_active_user_book_idx
  on public.adoptionapplications (userid, bookid)
  where status in ('pending', 'approved');
create unique index if not exists adoption_applications_approved_book_idx
  on public.adoptionapplications (bookid)
  where status = 'approved';
create index if not exists appointments_user_id_idx on public.appointments (userid);
create index if not exists appointments_book_id_idx on public.appointments (bookid);
create index if not exists appointments_date_idx
  on public.appointments (appointmentdate, timeslot);
create index if not exists watchlist_user_updated_idx
  on public.watchlist (userid, lastupdated desc);

alter table public.users enable row level security;
alter table public.books enable row level security;
alter table public.adoptiondrives enable row level security;
alter table public.adoptionapplications enable row level security;
alter table public.appointments enable row level security;
alter table public.watchlist enable row level security;

grant usage on schema public to service_role;
grant select, insert, update, delete on
  public.users,
  public.books,
  public.adoptiondrives,
  public.adoptionapplications,
  public.appointments,
  public.watchlist
to service_role;

create or replace function public.decide_book_application(
  application_id uuid,
  admin_id uuid,
  decision text
)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  book_id uuid;
  book_status text;
  application_status text;
  rejected_count integer := 0;
begin
  if decision is null or decision not in ('approved', 'rejected') then
    raise exception 'decision must be approved or rejected';
  end if;

  if not exists (
    select 1 from public.users where id = admin_id and role = 'admin'
  ) then
    raise exception 'admin account not found';
  end if;

  select bookid into book_id
  from public.adoptionapplications
  where id = application_id;
  if not found then
    raise exception 'adoption application not found';
  end if;

  select status into book_status
  from public.books
  where id = book_id
  for update;
  if not found then
    raise exception 'book not found';
  end if;

  select status into application_status
  from public.adoptionapplications
  where id = application_id
  for update;
  if application_status is distinct from 'pending' then
    raise exception 'only pending applications can be decided';
  end if;

  if decision = 'approved' then
    if book_status <> 'available' then
      raise exception 'book is no longer available';
    end if;

    update public.adoptionapplications
    set status = 'approved', updatedat = now()
    where id = application_id;

    update public.adoptionapplications
    set status = 'rejected', updatedat = now()
    where bookid = book_id and id <> application_id and status = 'pending';
    get diagnostics rejected_count = row_count;

    update public.books
    set status = 'reserved', updatedat = now()
    where id = book_id;
  else
    update public.adoptionapplications
    set status = 'rejected', updatedat = now()
    where id = application_id;
  end if;

  return rejected_count;
end;
$$;

create or replace function public.complete_book_collection(appointment_id uuid)
returns text
language plpgsql
security invoker
set search_path = ''
as $$
declare
  book_id uuid;
  customer_id uuid;
  appointment_status text;
  book_status text;
  title text;
begin
  select bookid into book_id
  from public.appointments
  where id = appointment_id;
  if not found then
    raise exception 'appointment not found';
  end if;

  select status into book_status
  from public.books
  where id = book_id
  for update;
  if not found then
    raise exception 'book not found';
  end if;

  select userid, status, booktitle
  into customer_id, appointment_status, title
  from public.appointments
  where id = appointment_id
  for update;

  if appointment_status is distinct from 'appointment confirmed'
     or book_status <> 'reserved' then
    raise exception 'only confirmed appointments for reserved books can be completed';
  end if;

  if not exists (
    select 1 from public.adoptionapplications
    where userid = customer_id and bookid = book_id and status = 'approved'
  ) then
    raise exception 'approved application not found';
  end if;

  update public.appointments
  set status = 'collected', updatedat = now()
  where id = appointment_id;

  update public.books
  set status = 'adopted', updatedat = now()
  where id = book_id;

  return title;
end;
$$;

revoke all on function public.decide_book_application(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.complete_book_collection(uuid) from public, anon, authenticated;
grant execute on function public.decide_book_application(uuid, uuid, text) to service_role;
grant execute on function public.complete_book_collection(uuid) to service_role;

-- One active booking per physical book, including simultaneous requests.
create unique index if not exists appointments_active_book_idx
  on public.appointments (bookid)
  where status in ('pending confirmation', 'appointment confirmed');

create or replace function public.book_collection_appointment(
  customer_id uuid, book_id uuid, collection_location text,
  collection_date date, time_slot text
)
returns public.appointments
language plpgsql
security invoker
set search_path = ''
as $$
declare
  selectedbook public.books;
  booking public.appointments;
begin
  select * into selectedbook from public.books where id = book_id for update;
  if not found or selectedbook.status <> 'reserved' then
    raise exception 'book must be reserved before booking';
  end if;
  if not exists (select 1 from public.users where id = customer_id and role = 'customer')
     or not exists (
       select 1 from public.adoptionapplications
       where userid = customer_id and bookid = book_id and status = 'approved'
     ) then
    raise exception 'approved customer application required';
  end if;
  if collection_date is null or collection_date < current_date then
    raise exception 'collection date must be today or later';
  end if;
  insert into public.appointments
    (userid, bookid, booktitle, location, appointmentdate, timeslot)
  values (customer_id, book_id, selectedbook.title, collection_location, collection_date, time_slot)
  returning * into booking;
  return booking;
end;
$$;

create or replace function public.rsvp_adoption_drive(drive_id uuid, customer_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  drive public.adoptiondrives;
begin
  if not exists (select 1 from public.users where id = customer_id and role = 'customer') then
    raise exception 'customer account not found';
  end if;
  select * into drive from public.adoptiondrives where id = drive_id for update;
  if not found then
    return jsonb_build_object('result', 'missing');
  end if;
  if drive.status = 'cancelled' then
    return jsonb_build_object('result', 'cancelled', 'title', drive.title);
  end if;
  if customer_id = any(drive.userids) then
    return jsonb_build_object('result', 'registered', 'title', drive.title);
  end if;
  if drive.status = 'closed' or drive.eventdate < current_date
     or cardinality(drive.userids) >= drive.maxcapacity then
    return jsonb_build_object('result', 'closed', 'title', drive.title);
  end if;
  update public.adoptiondrives
  set userids = array_append(userids, customer_id),
      status = case when cardinality(userids) + 1 >= maxcapacity then 'closed' else 'open' end,
      updatedat = now()
  where id = drive_id;
  return jsonb_build_object('result', 'success', 'title', drive.title);
end;
$$;

create or replace function public.sync_user_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.users
  set email = lower(new.email),
      name = coalesce(nullif(btrim(new.raw_user_meta_data ->> 'name'), ''), name),
      updatedat = now()
  where id = new.id;
  return new;
end;
$$;

drop trigger if exists sync_user_profile on auth.users;
create trigger sync_user_profile
  after update of email, raw_user_meta_data on auth.users
  for each row execute function public.sync_user_profile();

revoke all on function public.sync_user_profile() from public, anon, authenticated;
revoke all on function public.book_collection_appointment(uuid, uuid, text, date, text) from public, anon, authenticated;
revoke all on function public.rsvp_adoption_drive(uuid, uuid) from public, anon, authenticated;
grant execute on function public.book_collection_appointment(uuid, uuid, text, date, text) to service_role;
grant execute on function public.rsvp_adoption_drive(uuid, uuid) to service_role;

create or replace function public.check_pending_application()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  book_status text;
begin
  select status into book_status from public.books where id = new.bookid for update;
  if not found or book_status <> 'available' then
    raise exception 'book is no longer available for adoption';
  end if;
  return new;
end;
$$;

drop trigger if exists check_pending_application on public.adoptionapplications;
create trigger check_pending_application
  before insert on public.adoptionapplications
  for each row when (new.status = 'pending')
  execute function public.check_pending_application();

create or replace function public.check_drive_capacity()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if cardinality(new.userids) > new.maxcapacity then
    raise exception 'capacity cannot be lower than the number of registrations';
  end if;
  if new.status = 'open' and cardinality(new.userids) = new.maxcapacity then
    new.status := 'closed';
  end if;
  return new;
end;
$$;

drop trigger if exists check_drive_capacity on public.adoptiondrives;
create trigger check_drive_capacity
  before insert or update on public.adoptiondrives
  for each row execute function public.check_drive_capacity();

revoke all on function public.check_pending_application() from public, anon, authenticated;
revoke all on function public.check_drive_capacity() from public, anon, authenticated;
grant execute on function public.check_pending_application() to service_role;
grant execute on function public.check_drive_capacity() to service_role;

notify pgrst, 'reload schema';
