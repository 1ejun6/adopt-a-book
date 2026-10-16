
create or replace function public.seed_demo_data(selected_customer uuid default null)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $seed$
declare
  seed_admin uuid;
begin
  selected_customer := coalesce(selected_customer, (
    select id from public.users where role = 'customer' order by createdat, id limit 1
  ));
  select id into seed_admin from public.users where role = 'admin' order by createdat, id limit 1;
  if selected_customer is null or not exists (
    select 1 from public.users where id = selected_customer and role = 'customer'
  ) then
    raise exception 'an existing customer account is required for demo data';
  end if;
  if seed_admin is null then
    raise exception 'an existing admin account is required for demo data';
  end if;

insert into public.books
  (id, title, authors, isbn, subjects, publicationyear, description,
   coverurl, openlibraryid, createdby, source, status)
select ('10000000-0000-4000-8000-' || lpad(ordinal::text, 12, '0'))::uuid,
       item->>'title',
       array(select jsonb_array_elements_text(item->'authors')),
       item->>'isbn',
       array(select jsonb_array_elements_text(item->'subjects')),
       (item->>'publicationyear')::integer,
       coalesce(item->>'description', ''), item->>'coverurl', item->>'openlibraryid',
       seed_admin, 'open_library', 'available'
from jsonb_array_elements(current_setting('app.seed_books')::jsonb)
  with ordinality as incoming(item, ordinal)
where ordinal <= 5
on conflict (id) do nothing;

insert into public.adoptiondrives as existing
  (id, title, location, eventdate, description, maxcapacity, createdby, status)
values
  ('20000000-0000-4000-8000-000000000001', 'Demo: Community Book Adoption Day',
   'Demo venue: Maple Reading Room, collection desk', current_date + 21,
   'Fiction and classics exchange. Bring a reusable bag. This fictional event is for backend testing.', 30,
   seed_admin, 'open'),
  ('20000000-0000-4000-8000-000000000002', 'Demo: Closed Book Exchange',
   'Demo venue: Cedar Community Hall, room 2', current_date + 14,
   'Registration was closed by the organiser before capacity was reached. Fictional test event.', 20,
   seed_admin, 'closed'),
  ('20000000-0000-4000-8000-000000000003', 'Demo: Cancelled Book Fair',
   'Demo venue: Willow Community Centre, main hall', current_date + 28,
   'Cancelled because the demonstration venue is unavailable. Fictional test event.', 25,
   seed_admin, 'cancelled')
on conflict (id) do update set
  createdby = coalesce(existing.createdby, excluded.createdby);

insert into public.watchlist
  (id, userid, bookid, bookname, comments)
select '30000000-0000-4000-8000-000000000001', u.id, b.id, b.title,
       'Interested in reading this classic.'
from (select id from public.users where id = selected_customer and role = 'customer') u
join public.books b on b.id = '10000000-0000-4000-8000-000000000001'
where b.status = 'available'
on conflict do nothing;

insert into public.adoptionapplications
  (id, userid, bookid, status)
select '40000000-0000-4000-8000-000000000001', u.id, b.id, 'pending'
from (select id from public.users where id = selected_customer and role = 'customer') u
join public.books b on b.id = '10000000-0000-4000-8000-000000000004'
where b.status = 'available'
  and not exists (
    select 1 from public.adoptionapplications a
    where a.userid = u.id and a.bookid = b.id
      and a.status in ('pending', 'approved')
  )
on conflict (id) do nothing;

insert into public.adoptionapplications
  (id, userid, bookid, status)
select '40000000-0000-4000-8000-000000000002', u.id, b.id, 'approved'
from (select id from public.users where id = selected_customer and role = 'customer') u
join public.books b on b.id = '10000000-0000-4000-8000-000000000003'
where b.status = 'available'
  and not exists (
    select 1 from public.adoptionapplications a
    where a.bookid = b.id and a.status in ('pending', 'approved')
  )
on conflict (id) do nothing;

update public.books b
set status = 'reserved', updatedat = now()
where b.id = '10000000-0000-4000-8000-000000000003'
  and b.status = 'available'
  and exists (
    select 1 from public.adoptionapplications a
    where a.id = '40000000-0000-4000-8000-000000000002'
      and a.bookid = b.id and a.status = 'approved'
  );

insert into public.appointments
  (id, userid, bookid, booktitle, location,
   appointmentdate, timeslot, status)
select '50000000-0000-4000-8000-000000000001', a.userid, b.id, b.title,
       'Demo venue: Maple Reading Room, collection desk', current_date + 7, '10:00-10:30',
       'pending confirmation'
from public.adoptionapplications a
join public.books b on b.id = a.bookid
where a.id = '40000000-0000-4000-8000-000000000002'
  and a.status = 'approved' and b.status = 'reserved'
  and not exists (
    select 1 from public.appointments existing
    where existing.bookid = b.id
      and existing.status in ('pending confirmation', 'appointment confirmed')
  )
on conflict (id) do nothing;

insert into public.adoptionapplications
  (id, userid, bookid, status, createdat, updatedat)
select '40000000-0000-4000-8000-000000000003', u.id, b.id, 'rejected',
       now() - interval '10 days', now() - interval '9 days'
from (select id from public.users where id = selected_customer and role = 'customer') u
join public.books b on b.id = '10000000-0000-4000-8000-000000000002'
where b.status = 'available'
  and not exists (select 1 from public.adoptionapplications a where a.bookid = b.id)
on conflict (id) do nothing;

declare
  customer_id uuid;
  book_id uuid := '10000000-0000-4000-8000-000000000005';
begin
  customer_id := selected_customer;
  if customer_id is not null
     and exists (select 1 from public.books where id = book_id and status = 'available')
     and not exists (select 1 from public.adoptionapplications where bookid = book_id)
     and not exists (select 1 from public.appointments where bookid = book_id) then
    insert into public.adoptionapplications
      (id, userid, bookid, status, createdat, updatedat)
    values ('40000000-0000-4000-8000-000000000004', customer_id, book_id,
            'approved', now() - interval '14 days', now() - interval '12 days');
    insert into public.appointments
      (id, userid, bookid, booktitle, location, appointmentdate,
       timeslot, status, createdat, updatedat)
    values ('50000000-0000-4000-8000-000000000002', customer_id, book_id,
            (select title from public.books where id = book_id), 'Demo venue: Maple Reading Room, collection desk',
            current_date - 7, '14:00-14:30', 'collected',
            now() - interval '11 days', now() - interval '7 days');
    update public.books set status = 'adopted',
      createdat = least(createdat, now() - interval '15 days'),
      updatedat = now() - interval '7 days'
    where id = book_id;
  end if;
end;


  return jsonb_build_object(
    'customerid', selected_customer,
    'customeremail', (select email from public.users where id = selected_customer),
    'books', (select count(*) from public.books),
    'drives', (select count(*) from public.adoptiondrives),
    'applications', (select count(*) from public.adoptionapplications),
    'appointments', (select count(*) from public.appointments),
    'watchlist', (select count(*) from public.watchlist)
  );
end;
$seed$;

revoke all on function public.seed_demo_data(uuid) from public, anon, authenticated;
grant execute on function public.seed_demo_data(uuid) to service_role;

select public.seed_demo_data(null::uuid) as seed_result;

