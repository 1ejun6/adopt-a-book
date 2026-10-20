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
  ownerid uuid references public.users (id) on delete restrict,
  condition text check (condition in ('like new', 'good', 'fair')),
  collectionarea text,
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
    check (status in ('pending', 'approved', 'rejected', 'cancelled')),
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
  if drive.status = 'closed' or drive.eventdate < (now() at time zone 'Asia/Singapore')::date
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

revoke all on function public.rsvp_adoption_drive(uuid, uuid) from public, anon, authenticated;

grant execute on function public.rsvp_adoption_drive(uuid, uuid) to service_role;

create or replace function public.check_pending_application()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  book_status text;
  book_owner uuid;
begin
  if new.status <> 'pending' then raise exception 'new applications must be pending' using errcode='PT422'; end if;
  if not exists(select 1 from public.users where id=new.userid and role='customer') then
    raise exception 'customer account required' using errcode='PT403';
  end if;
  select status, ownerid into book_status, book_owner from public.books where id = new.bookid for update;
  if not found or book_status <> 'available' then
    raise exception 'book is no longer available for adoption';
  end if;
  if book_owner = new.userid then
    raise exception 'you cannot adopt your own book';
  end if;
  return new;
end;
$$;

drop trigger if exists check_pending_application on public.adoptionapplications;
create trigger check_pending_application
  before insert on public.adoptionapplications
  for each row
  execute function public.check_pending_application();

create or replace function public.check_drive_capacity()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.eventdate < (now() at time zone 'Asia/Singapore')::date then raise exception 'eventdate must be today or later' using errcode='PT422'; end if;
  elsif new.eventdate is distinct from old.eventdate and new.eventdate < (now() at time zone 'Asia/Singapore')::date then
    raise exception 'eventdate must be today or later' using errcode='PT422';
  end if;
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


alter table public.books add column if not exists ownerid uuid references public.users(id) on delete restrict;
alter table public.books add column if not exists condition text check (condition in ('like new', 'good', 'fair'));
alter table public.books add column if not exists collectionarea text;
delete from public.watchlist where bookid in (select id from public.books where status = 'withdrawn');
delete from public.appointments where bookid in (select id from public.books where status = 'withdrawn');
delete from public.adoptionapplications where bookid in (select id from public.books where status = 'withdrawn');
delete from public.books where status = 'withdrawn';
alter table public.books drop constraint if exists books_status_check;
alter table public.books add constraint books_status_check check (status in ('available','reserved','adopted'));
alter table public.adoptionapplications drop constraint if exists adoptionapplications_status_check;
alter table public.adoptionapplications add constraint adoptionapplications_status_check check (status in ('pending','approved','rejected','cancelled'));


create index if not exists books_owner_idx on public.books(ownerid);
create unique index if not exists appointments_active_book_idx on public.appointments(bookid)
  where status in ('pending confirmation', 'appointment confirmed');


drop function if exists public.decide_book_application(uuid, uuid, text);
drop function if exists public.complete_book_collection(uuid);

create or replace function public.can_manage_book(actor_id uuid, book_owner uuid)
returns boolean language sql stable set search_path = '' as $$
  select exists (select 1 from public.users where id = actor_id and
    ((role = 'customer' and id = book_owner) or (role = 'admin' and book_owner is null)));
$$;

create or replace function public.decide_book_application(application_id uuid, actor_id uuid, decision text)
returns integer language plpgsql set search_path = '' as $$
declare
  selectedbook public.books;
  application public.adoptionapplications;
  book_id uuid;
  rejected_count integer := 0;
begin
  if decision is null or decision not in ('approved','rejected') then
    raise exception 'decision must be approved or rejected' using errcode = 'PT422';
  end if;
  select bookid into book_id from public.adoptionapplications where id = application_id;
  select * into selectedbook from public.books where id = book_id for update;
  if not found then raise exception 'application not found' using errcode = 'PT404'; end if;
  if not public.can_manage_book(actor_id, selectedbook.ownerid) then
    raise exception 'you cannot decide this application' using errcode = 'PT403';
  end if;
  select * into application from public.adoptionapplications where id = application_id for update;
  if application.status <> 'pending' or selectedbook.status <> 'available' then
    raise exception 'application is no longer pending for an available book';
  end if;
  if decision = 'approved' then
    update public.adoptionapplications set status = 'rejected', updatedat = now()
      where bookid = book_id and id <> application_id and status = 'pending';
    get diagnostics rejected_count = row_count;
    update public.books set status = 'reserved', updatedat = now() where id = book_id;
  end if;
  update public.adoptionapplications set status = decision, updatedat = now() where id = application_id;
  return rejected_count;
end;
$$;

drop function if exists public.withdraw_books(uuid[],uuid);


create table if not exists public.mrtstations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  codes text[] not null check (cardinality(codes) > 0),
  lat double precision not null check (lat between 1.15 and 1.48),
  lng double precision not null check (lng between 103.58 and 104.12),
  selectable boolean not null default true,
  refreshedat timestamptz not null default now()
);
alter table public.mrtstations enable row level security;
revoke all on public.mrtstations from anon, authenticated;
grant select, insert, update, delete on public.mrtstations to service_role;
alter table public.books add column if not exists mrtstationid uuid references public.mrtstations(id) on delete restrict;
alter table public.adoptiondrives add column if not exists mrtstationid uuid references public.mrtstations(id) on delete restrict;
create index if not exists books_mrtstationid_idx on public.books(mrtstationid);
create index if not exists adoptiondrives_mrtstationid_idx on public.adoptiondrives(mrtstationid);
create index if not exists mrtstations_codes_idx on public.mrtstations using gin(codes);

create or replace function public.sync_mrt_stations(station_rows jsonb)
returns integer language plpgsql set search_path = '' as $$
declare item record; matches uuid[]; selected_id uuid; seen uuid[] := '{}'; count_rows integer := 0;
begin
  if jsonb_typeof(station_rows) is distinct from 'array' or jsonb_array_length(station_rows) = 0 then
    raise exception 'station sync requires a complete nonempty list' using errcode = 'PT422';
  end if;

  lock table public.mrtstations in exclusive mode;
  if exists (
    select code from jsonb_to_recordset(station_rows) as r(codes text[]), unnest(r.codes) code
    group by code having count(*) > 1
  ) then raise exception 'duplicate station codes in sync' using errcode = 'PT422'; end if;
  for item in select * from jsonb_to_recordset(station_rows) as r(name text, codes text[], lat double precision, lng double precision) loop
    if coalesce(trim(item.name),'') = '' or coalesce(cardinality(item.codes),0) = 0
       or item.lat is null or item.lat not between 1.15 and 1.48
       or item.lng is null or item.lng not between 103.58 and 104.12
       or exists (select 1 from unnest(item.codes) code where code is null or code !~ '^(NS|EW|CG|NE|CC|CE|DT|TE|JS|JE|JW|CR|CP)[0-9]+$') then
      raise exception 'invalid station data' using errcode = 'PT422';
    end if;
    select array_agg(id) into matches from public.mrtstations where codes && item.codes;
    if coalesce(cardinality(matches),0) > 1 then
      raise exception 'ambiguous station codes; review catalogue before syncing' using errcode = 'PT422';
    end if;
    selected_id := matches[1];
    if selected_id = any(seen) then raise exception 'one station matched multiple entries' using errcode = 'PT422'; end if;
    if selected_id is null then

      if exists (select 1 from public.mrtstations where lower(name) = lower(item.name)) then
        raise exception 'station name has different codes; review catalogue' using errcode = 'PT422';
      end if;
      insert into public.mrtstations(name,codes,lat,lng) values(item.name,item.codes,item.lat,item.lng) returning id into selected_id;
    else
      update public.mrtstations s set name = item.name,
        codes = array(select distinct code from unnest(s.codes || item.codes) code order by code),
        lat = item.lat, lng = item.lng, refreshedat = now() where s.id = selected_id;
    end if;
    seen := array_append(seen, selected_id);
    count_rows := count_rows + 1;
  end loop;

  return count_rows;
end;
$$;
revoke all on function public.sync_mrt_stations(jsonb) from public, anon, authenticated;
grant execute on function public.sync_mrt_stations(jsonb) to service_role;

create or replace function public.check_mrt_location()
returns trigger language plpgsql set search_path = '' as $$
declare station public.mrtstations; changed boolean; location_changed boolean := false;
begin
  changed := tg_op = 'INSERT';
  if tg_op = 'UPDATE' then changed := new.mrtstationid is distinct from old.mrtstationid; end if;
  if tg_table_name = 'books' then
    if tg_op = 'INSERT' then
      if new.collectionarea is not null then raise exception 'choose mrtstationid instead of collectionarea' using errcode = 'PT422'; end if;
    elsif new.collectionarea is distinct from old.collectionarea then
      raise exception 'choose mrtstationid instead of collectionarea' using errcode = 'PT422';
    end if;
  elsif tg_op = 'UPDATE' then
    location_changed := new.location is distinct from old.location;
  end if;
  if changed or location_changed then
    if new.mrtstationid is null then raise exception 'mrtstationid is required' using errcode = 'PT422'; end if;
    select * into station from public.mrtstations where id = new.mrtstationid for share;
    if not found or (changed and not station.selectable) then
      raise exception 'mrtstationid must identify a selectable MRT station' using errcode = 'PT422';
    end if;
    if tg_table_name = 'books' then new.collectionarea := station.name; end if;
  end if;
  return new;
end;
$$;
drop trigger if exists books_mrt_location on public.books;
create trigger books_mrt_location before insert or update on public.books for each row execute function public.check_mrt_location();
drop trigger if exists drives_mrt_location on public.adoptiondrives;
create trigger drives_mrt_location before insert or update on public.adoptiondrives for each row execute function public.check_mrt_location();
revoke all on function public.check_mrt_location() from public, anon, authenticated;
grant execute on function public.check_mrt_location() to service_role;

create or replace function public.edit_book(book_id uuid, actor_id uuid, changes jsonb)
returns public.books language plpgsql set search_path = '' as $$
declare selectedbook public.books;
begin
  select * into selectedbook from public.books where id = book_id for update;
  if not found then raise exception 'book not found' using errcode = 'PT404'; end if;
  if not public.can_manage_book(actor_id, selectedbook.ownerid) then raise exception 'book not found' using errcode = 'PT404'; end if;
  if selectedbook.status <> 'available' then raise exception 'only available books can be edited'; end if;
  if changes is null or jsonb_typeof(changes) <> 'object' or changes = '{}'::jsonb
     or changes - array['title','authors','description','condition','mrtstationid','isbn','subjects','publicationyear','coverurl','openlibraryid'] <> '{}'::jsonb then
    raise exception 'unsupported book fields' using errcode = 'PT422';
  end if;

  selectedbook := jsonb_populate_record(selectedbook, changes - array['id','ownerid','createdby','source','status','createdat','updatedat']);
  update public.books set title = selectedbook.title, authors = selectedbook.authors,
    description = selectedbook.description, condition = selectedbook.condition,
    collectionarea = selectedbook.collectionarea, mrtstationid = selectedbook.mrtstationid, isbn = selectedbook.isbn,
    subjects = selectedbook.subjects, publicationyear = selectedbook.publicationyear,
    coverurl = selectedbook.coverurl, openlibraryid = selectedbook.openlibraryid, updatedat = now()
    where id = book_id returning * into selectedbook;
  return selectedbook;
end;
$$;

create or replace function public.book_collection_appointment(
  customer_id uuid, book_id uuid, collection_location text, collection_date date, time_slot text
) returns public.appointments language plpgsql set search_path = '' as $$
declare selectedbook public.books; booking public.appointments;
begin
  select * into selectedbook from public.books where id = book_id for update;
  if not found then raise exception 'book not found' using errcode = 'PT404'; end if;
  if selectedbook.status <> 'reserved' or not exists (
    select 1 from public.adoptionapplications where bookid = book_id and userid = customer_id and status = 'approved'
  ) then raise exception 'approved application for a reserved book required'; end if;
  if collection_date is null or collection_date < (now() at time zone 'Asia/Singapore')::date then raise exception 'collection date must be today or later' using errcode = 'PT422'; end if;
  insert into public.appointments(userid, bookid, booktitle, location, appointmentdate, timeslot)
    values (customer_id, book_id, selectedbook.title, collection_location, collection_date, time_slot)
    returning * into booking;
  return booking;
end;
$$;

create or replace function public.change_collection(appointment_id uuid, actor_id uuid, changes jsonb)
returns public.appointments language plpgsql set search_path = '' as $$
declare selectedbook public.books; booking public.appointments; book_id uuid; next_status text;
begin
  select bookid into book_id from public.appointments where id = appointment_id;
  select * into selectedbook from public.books where id = book_id for update;
  select * into booking from public.appointments where id = appointment_id for update;
  if not found then raise exception 'appointment not found' using errcode = 'PT404'; end if;
  if selectedbook.status <> 'reserved' or booking.status not in ('pending confirmation','appointment confirmed') then
    raise exception 'collection is no longer active';
  end if;
  if booking.userid = actor_id then
    if changes ? 'status' or changes - array['location','appointmentdate','timeslot'] <> '{}'::jsonb then
      raise exception 'readers can only reschedule their collection' using errcode = 'PT422';
    end if;
    booking := jsonb_populate_record(booking, changes);
    if booking.appointmentdate < (now() at time zone 'Asia/Singapore')::date then raise exception 'collection date must be today or later' using errcode = 'PT422'; end if;
    booking.status := 'pending confirmation';
  else
    if not public.can_manage_book(actor_id, selectedbook.ownerid) then raise exception 'appointment not found' using errcode = 'PT404'; end if;
    next_status := changes->>'status';
    if changes - 'status' <> '{}'::jsonb or next_status is null or
       not ((next_status = 'appointment confirmed' and booking.status = 'pending confirmation' and booking.appointmentdate >= (now() at time zone 'Asia/Singapore')::date)
         or (next_status = 'collected' and booking.status = 'appointment confirmed')) then
      raise exception 'invalid collection transition';
    end if;
    if not exists (select 1 from public.adoptionapplications where bookid = book_id and userid = booking.userid and status = 'approved') then
      raise exception 'approved application required';
    end if;
    booking.status := next_status;
    if next_status = 'collected' then update public.books set status = 'adopted', updatedat = now() where id = book_id; end if;
  end if;
  update public.appointments set status = booking.status, location = booking.location,
    appointmentdate = booking.appointmentdate, timeslot = booking.timeslot, updatedat = now()
    where id = appointment_id returning * into booking;
  return booking;
end;
$$;


create or replace function public.remove_customer_records(resource text, record_ids uuid[], actor_id uuid)
returns integer language plpgsql set search_path = '' as $$
declare affected integer; book_ids uuid[];
begin
  if record_ids is null or cardinality(record_ids) not between 1 and 100 or cardinality(record_ids) <>
    (select count(distinct id) from unnest(record_ids) id) then raise exception 'provide 1 to 100 distinct ids' using errcode = 'PT400'; end if;
  if resource = 'watchlist' then
    perform id from public.watchlist where id = any(record_ids) order by id for update;
    select count(*) into affected from public.watchlist where id = any(record_ids) and userid = actor_id;
  elsif resource in ('applications','appointments') then
    if resource = 'applications' then
      select array_agg(distinct bookid) into book_ids from public.adoptionapplications where id = any(record_ids);
    else
      select array_agg(distinct bookid) into book_ids from public.appointments where id = any(record_ids);
    end if;
    perform id from public.books where id = any(book_ids) order by id for update;
    if resource = 'applications' then
      select count(*) into affected from public.adoptionapplications where id = any(record_ids) and userid = actor_id;
      if exists (select 1 from public.adoptionapplications where id = any(record_ids) and userid = actor_id and status <> 'pending') then
        raise exception 'only pending applications can be withdrawn';
      end if;
    else
      select count(*) into affected from public.appointments where id = any(record_ids) and userid = actor_id;
      if exists (select 1 from public.appointments where id = any(record_ids) and userid = actor_id and status not in ('pending confirmation','appointment confirmed')) then
        raise exception 'only active appointments can be cancelled';
      end if;
    end if;
  else raise exception 'invalid resource' using errcode = 'PT400'; end if;
  if affected <> cardinality(record_ids) then raise exception 'record not found' using errcode = 'PT404'; end if;
  if resource = 'watchlist' then delete from public.watchlist where id = any(record_ids) and userid = actor_id;
  elsif resource = 'applications' then update public.adoptionapplications set status = 'cancelled', updatedat = now() where id = any(record_ids);
  else update public.appointments set status = 'cancelled', updatedat = now() where id = any(record_ids);
  end if;
  return affected;
end;
$$;

create or replace function public.remove_drives(record_ids uuid[], actor_id uuid)
returns integer language plpgsql set search_path = '' as $$
declare affected integer;
begin
  if not exists (select 1 from public.users where id = actor_id and role = 'admin') then raise exception 'administrator required' using errcode = 'PT403'; end if;
  if record_ids is null or cardinality(record_ids) not between 1 and 100 or cardinality(record_ids) <> (select count(distinct id) from unnest(record_ids) id) then
    raise exception 'provide 1 to 100 distinct ids' using errcode = 'PT400'; end if;
  perform id from public.adoptiondrives where id = any(record_ids) order by id for update;
  select count(*) into affected from public.adoptiondrives where id = any(record_ids);
  if affected <> cardinality(record_ids) then raise exception 'drive not found' using errcode = 'PT404'; end if;
  delete from public.adoptiondrives where id = any(record_ids);
  return affected;
end;
$$;

create or replace function public.cancel_drive_rsvp(drive_id uuid, customer_id uuid)
returns void language plpgsql set search_path = '' as $$
declare drive public.adoptiondrives;
begin
  if not exists (select 1 from public.users where id = customer_id and role = 'customer') then
    raise exception 'authorised account required' using errcode = 'PT403';
  end if;
  select * into drive from public.adoptiondrives where id = drive_id for update;
  if not found then raise exception 'drive not found' using errcode = 'PT404'; end if;
  update public.adoptiondrives set userids = array_remove(userids, customer_id), updatedat = now()
    where id = drive_id;

end;
$$;

create or replace function public.protect_last_admin()
returns trigger language plpgsql set search_path = '' as $$
begin
  if old.role = 'admin' and (tg_op = 'DELETE' or new.role <> 'admin') then
    perform pg_advisory_xact_lock(735217);
    if (select count(*) from public.users where role = 'admin') <= 1 then raise exception 'the last administrator cannot be removed'; end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
drop trigger if exists protect_last_admin on public.users;
create trigger protect_last_admin before delete or update of role on public.users
  for each row execute function public.protect_last_admin();


revoke all on function public.can_manage_book(uuid,uuid), public.decide_book_application(uuid,uuid,text),
  public.edit_book(uuid,uuid,jsonb),
  public.book_collection_appointment(uuid,uuid,text,date,text), public.change_collection(uuid,uuid,jsonb),
  public.remove_customer_records(text,uuid[],uuid), public.remove_drives(uuid[],uuid),
  public.cancel_drive_rsvp(uuid,uuid), public.protect_last_admin() from public, anon, authenticated;
grant execute on function public.can_manage_book(uuid,uuid), public.decide_book_application(uuid,uuid,text),
  public.edit_book(uuid,uuid,jsonb),
  public.book_collection_appointment(uuid,uuid,text,date,text), public.change_collection(uuid,uuid,jsonb),
  public.remove_customer_records(text,uuid[],uuid), public.remove_drives(uuid[],uuid),
  public.cancel_drive_rsvp(uuid,uuid), public.protect_last_admin() to service_role;
notify pgrst, 'reload schema';



create index if not exists books_title_id_idx on public.books (lower(title), id);
drop index if exists public.books_public_title_id_idx;

drop function if exists public.browse_books(text,text,text,text,bigint,integer);
create or replace function public.browse_books(
  search_term text default '', book_status text default null, book_subject text default null,
  sort_by text default 'title', page_number bigint default 1, page_size integer default 24, station_ids uuid[] default null
) returns jsonb language plpgsql stable set search_path = '' as $$
declare result jsonb;
begin
  if page_number is null or page_number < 1 or page_number > 9007199254740991
     or page_size is null or page_size not between 1 and 100
     or sort_by is null or sort_by not in ('title','author','newest','nearest')
     or (book_status is not null and book_status not in ('available','reserved','adopted')) then
    raise exception 'invalid catalogue filters' using errcode = 'PT422';
  end if;
  if (sort_by = 'nearest' and station_ids is null)
     or cardinality(station_ids) > 500
     or cardinality(station_ids) <> (select count(distinct id) from unnest(station_ids) id)
     or exists (select 1 from unnest(station_ids) as filter(id) where not exists (select 1 from public.mrtstations s where s.id = filter.id)) then
    raise exception 'invalid MRT station filter' using errcode = 'PT422';
  end if;
  with filtered as not materialized (
    select b.* from public.books b
    where (station_ids is null or b.mrtstationid = any(station_ids))
      and (book_status is null or b.status = book_status)
      and (book_subject is null or b.subjects @> array[book_subject])
      and (coalesce(trim(search_term),'') = ''
        or strpos(lower(b.title),lower(trim(search_term))) > 0
        or strpos(lower(coalesce(b.isbn,'')),lower(trim(search_term))) > 0
        or exists (select 1 from unnest(b.authors) author
          where strpos(lower(author),lower(trim(search_term))) > 0))
  ), pagebooks as (
    select * from filtered
    order by
      case when sort_by = 'nearest' then array_position(station_ids,mrtstationid) end,
      case when sort_by = 'title' then lower(title) end,
      case when sort_by = 'author' then nullif(lower(authors[1]),'') end nulls last,
      case when sort_by = 'newest' then createdat end desc,
      id
    limit page_size offset ((page_number - 1) * page_size)
  ), paged as (
    select b.id, b.title, b.authors, b.isbn, b.subjects, b.publicationyear,
      b.description, b.coverurl, b.openlibraryid, b.source, b.status,
      b.condition, coalesce(s.name,b.collectionarea) as collectionarea, b.mrtstationid,
      case when s.id is null then null else jsonb_build_object('id',s.id,'name',s.name,'codes',s.codes,'lat',s.lat,'lng',s.lng,'selectable',s.selectable) end as mrtstation,
      case when u.id is null then null else jsonb_build_object('name',u.name) end as owner,
      row_number() over (order by
        case when sort_by = 'nearest' then array_position(station_ids,b.mrtstationid) end,
        case when sort_by = 'title' then lower(b.title) end,
        case when sort_by = 'author' then nullif(lower(b.authors[1]),'') end nulls last,
        case when sort_by = 'newest' then b.createdat end desc,
        b.id) as position
    from pagebooks b left join public.users u on u.id = b.ownerid left join public.mrtstations s on s.id = b.mrtstationid
  )
  select jsonb_build_object(
    'books', coalesce((select jsonb_agg(to_jsonb(p) - 'sortcreatedat' - 'position' order by position) from paged p),'[]'::jsonb),
    'total', (select count(*) from filtered)
  ) into result;
  return result;
end;
$$;
revoke all on function public.browse_books(text,text,text,text,bigint,integer,uuid[]) from public, anon, authenticated;
grant execute on function public.browse_books(text,text,text,text,bigint,integer,uuid[]) to service_role;

create or replace function public.browse_admin_books(
  search_term text default '', book_status text default null, book_subject text default null,
  book_author text default null, book_isbn text default null,
  page_number bigint default 1, page_size integer default 24
) returns jsonb language plpgsql stable set search_path = '' as $$
declare result jsonb;
begin
  if page_number is null or page_number < 1 or page_number > 9007199254740991
     or page_size is null or page_size not between 1 and 100
     or (book_status is not null and book_status not in ('available','reserved','adopted')) then
    raise exception 'invalid inventory filters' using errcode = 'PT422';
  end if;
  with filtered as not materialized (
    select b.id, b.title, b.authors, b.isbn, b.subjects, b.status, b.coverurl, b.mrtstationid,
      (b.mrtstationid is null) as "needsLocationUpdate",
      (select jsonb_build_object('id',s.id,'name',s.name,'codes',s.codes,'lat',s.lat,'lng',s.lng,'selectable',s.selectable) from public.mrtstations s where s.id = b.mrtstationid) as mrtstation
    from public.books b
    where (book_status is null or b.status = book_status)
      and (book_subject is null or b.subjects @> array[book_subject])
      and (book_author is null or b.authors @> array[book_author])
      and (book_isbn is null or b.isbn = book_isbn)
      and (coalesce(trim(search_term),'') = ''
        or strpos(lower(b.title),lower(trim(search_term))) > 0
        or strpos(lower(coalesce(b.isbn,'')),lower(trim(search_term))) > 0
        or exists (select 1 from unnest(b.authors) author
          where strpos(lower(author),lower(trim(search_term))) > 0))
  ), paged as (
    select * from filtered order by lower(title), id
    limit page_size offset ((page_number - 1) * page_size)
  )
  select jsonb_build_object(
    'books', coalesce((select jsonb_agg(to_jsonb(p) order by lower(p.title), p.id) from paged p),'[]'::jsonb),
    'total', (select count(*) from filtered),
    'counts', (select jsonb_build_object(
      'all', count(*),
      'available', count(*) filter (where status = 'available'),
      'reserved', count(*) filter (where status = 'reserved'),
      'adopted', count(*) filter (where status = 'adopted')
    ) from public.books),
    'genres', coalesce((select jsonb_agg(subject order by subject) from (
      select distinct unnest(subjects) as subject from public.books
    ) genres where subject <> ''), '[]'::jsonb)
  ) into result;
  return result;
end;
$$;
revoke all on function public.browse_admin_books(text,text,text,text,text,bigint,integer) from public, anon, authenticated;
grant execute on function public.browse_admin_books(text,text,text,text,text,bigint,integer) to service_role;

alter table public.adoptionapplications drop constraint if exists adoptionapplications_bookid_fkey;
alter table public.adoptionapplications add constraint adoptionapplications_bookid_fkey
  foreign key (bookid) references public.books(id) on delete restrict;
alter table public.appointments drop constraint if exists appointments_bookid_fkey;
alter table public.appointments add constraint appointments_bookid_fkey
  foreign key (bookid) references public.books(id) on delete restrict;


drop function if exists public.delete_books(uuid[],uuid);
create function public.delete_books(book_ids uuid[], actor_id uuid)
returns jsonb language plpgsql set search_path = '' as $$
declare
  selectedbook public.books;
  affected integer := 0;
  deleted_ids uuid[] := '{}';
  is_admin boolean;
begin
  select role = 'admin' into is_admin from public.users where id = actor_id and role in ('admin','customer');
  if not found then raise exception 'authorised account required' using errcode = 'PT403'; end if;
  if book_ids is null or cardinality(book_ids) not between 1 and 100 or
     cardinality(book_ids) <> (select count(distinct id) from unnest(book_ids) id) then
    raise exception 'provide 1 to 100 distinct book ids' using errcode = 'PT400';
  end if;
  for selectedbook in select * from public.books where id = any(book_ids) order by id for update loop
    affected := affected + 1;
    if not is_admin and selectedbook.ownerid is distinct from actor_id then
      raise exception 'listing not found' using errcode = 'PT404';
    end if;
    deleted_ids := array_append(deleted_ids, selectedbook.id);
  end loop;
  if affected <> cardinality(book_ids) then raise exception 'book not found' using errcode = 'PT404'; end if;
  delete from public.watchlist where bookid = any(book_ids);
  delete from public.appointments where bookid = any(book_ids);
  delete from public.adoptionapplications where bookid = any(book_ids);
  delete from public.books where id = any(deleted_ids);
  return jsonb_build_object('deletedids', deleted_ids);
end;
$$;
revoke all on function public.delete_books(uuid[],uuid) from public, anon, authenticated;
grant execute on function public.delete_books(uuid[],uuid) to service_role;
notify pgrst, 'reload schema';


create or replace function public.browse_drives(station_ids uuid[] default null, sort_by text default 'date', customer_id uuid default null)
returns jsonb language plpgsql stable set search_path = '' as $$
declare result jsonb;
begin
  if sort_by is null or sort_by not in ('date','nearest') or (sort_by = 'nearest' and station_ids is null)
     or cardinality(station_ids) > 500
     or cardinality(station_ids) <> (select count(distinct id) from unnest(station_ids) id)
     or exists (select 1 from unnest(station_ids) f(id) where not exists (select 1 from public.mrtstations s where s.id = f.id)) then
    raise exception 'invalid drive filters' using errcode = 'PT422';
  end if;
  if customer_id is not null and not exists (select 1 from public.users where id = customer_id and role = 'customer') then
    raise exception 'customer account required' using errcode = 'PT403';
  end if;
  select coalesce(jsonb_agg(
    jsonb_build_object('id',d.id,'title',d.title,'location',d.location,'eventdate',d.eventdate,
      'description',d.description,'maxcapacity',d.maxcapacity,'status',d.status,'mrtstationid',d.mrtstationid,
      'mrtstation',case when s.id is null then null else jsonb_build_object('id',s.id,'name',s.name,'codes',s.codes,'lat',s.lat,'lng',s.lng,'selectable',s.selectable) end)
    || case when customer_id is null then '{}'::jsonb else jsonb_build_object(
      'registered',customer_id=any(d.userids),'attendees',cardinality(d.userids),'createdat',d.createdat,'updatedat',d.updatedat) end
    order by case when sort_by='nearest' then array_position(station_ids,d.mrtstationid) end, d.eventdate,d.id
  ),'[]'::jsonb) into result
  from public.adoptiondrives d left join public.mrtstations s on s.id=d.mrtstationid
  where station_ids is null or d.mrtstationid=any(station_ids);
  return result;
end;
$$;
revoke all on function public.browse_drives(uuid[],text,uuid) from public, anon, authenticated;
grant execute on function public.browse_drives(uuid[],text,uuid) to service_role;

create or replace function public.check_watchlist_book()
returns trigger language plpgsql set search_path = '' as $$
declare selectedbook public.books;
begin
  select * into selectedbook from public.books where id=new.bookid for update;
  if not found then raise exception 'book not found' using errcode='PT404'; end if;
  if selectedbook.status <> 'available' then raise exception 'book is no longer available' using errcode='PT409'; end if;
  if not exists(select 1 from public.users where id=new.userid and role='customer') then
    raise exception 'customer account required' using errcode='PT403';
  end if;
  new.bookname := selectedbook.title;
  return new;
end;
$$;
drop trigger if exists check_watchlist_book on public.watchlist;
create trigger check_watchlist_book before insert on public.watchlist for each row execute function public.check_watchlist_book();
revoke all on function public.check_watchlist_book() from public, anon, authenticated;
grant execute on function public.check_watchlist_book() to service_role;

drop function if exists public.seed_demo_data(uuid);

notify pgrst, 'reload schema';
