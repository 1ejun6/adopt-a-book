-- Apply after the existing base schema. This migration preserves book history.
begin;

create or replace function public.pickup_start(collection_date date, slot text)
returns timestamp language plpgsql immutable set search_path = '' as $$
declare parts text[]; start_time time; end_time time;
begin
  parts := regexp_match(slot, '^([0-9]{2}:[0-9]{2})[[:space:]]*[–-][[:space:]]*([0-9]{2}:[0-9]{2})$');
  if collection_date is null or parts is null then return null; end if;
  start_time := parts[1]::time; end_time := parts[2]::time;
  if end_time <= start_time or start_time >= '24:00'::time or end_time >= '24:00'::time then return null; end if;
  return collection_date + start_time;
exception when invalid_datetime_format or datetime_field_overflow then return null;
end;
$$;

revoke all on function public.pickup_start(date,text) from public,anon,authenticated;
grant execute on function public.pickup_start(date,text) to service_role;

create or replace function public.pending_pickup_state(collection_date date, slot text, options jsonb)
returns text language plpgsql stable set search_path = '' as $$
declare option jsonb; starts timestamp; incomplete boolean := false;
begin
  if jsonb_typeof(options) = 'array' and jsonb_array_length(options) > 0 then
    for option in select value from jsonb_array_elements(options) loop
      begin
        starts := public.pickup_start((option->>'appointmentdate')::date, option->>'timeslot');
      exception when invalid_datetime_format or datetime_field_overflow then starts := null;
      end;
      if starts > (now() at time zone 'Asia/Singapore') then return 'awaiting'; end if;
      incomplete := incomplete or starts is null;
    end loop;
    return case when incomplete then 'attention' else 'overdue' end;
  end if;
  starts := public.pickup_start(collection_date, slot);
  return case when starts is null then 'attention' when starts > (now() at time zone 'Asia/Singapore') then 'awaiting' else 'overdue' end;
end;
$$;

revoke all on function public.pending_pickup_state(date,text,jsonb) from public,anon,authenticated;
grant execute on function public.pending_pickup_state(date,text,jsonb) to service_role;

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
    raise exception 'application is no longer pending for an available book' using errcode = 'PT409';
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

revoke all on function public.decide_book_application(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.decide_book_application(uuid,uuid,text) to service_role;

create or replace function public.change_collection(appointment_id uuid, actor_id uuid, changes jsonb)
returns public.appointments language plpgsql set search_path = '' as $$
declare selectedbook public.books; booking public.appointments; book_id uuid; next_status text; choice jsonb;
begin
  select bookid into book_id from public.appointments where id = appointment_id;
  select * into selectedbook from public.books where id = book_id for update;
  select * into booking from public.appointments where id = appointment_id for update;
  if not found then raise exception 'appointment not found' using errcode = 'PT404'; end if;
  if selectedbook.status <> 'reserved' or booking.status not in ('pending confirmation','appointment confirmed') then
    raise exception 'collection is no longer active' using errcode = 'PT409';
  end if;
  if not exists (select 1 from public.adoptionapplications where bookid = book_id and userid = booking.userid and status = 'approved') then
    raise exception 'approved application required' using errcode = 'PT409';
  end if;
  if booking.userid = actor_id then
    if changes - array['location','appointmentdate','pickupoptions'] <> '{}'::jsonb or
       not (changes ?& array['location','appointmentdate','pickupoptions']) then
      raise exception 'Provide a location, one date and three available times.' using errcode = 'PT422';
    end if;
    perform public.validate_pickup_options(changes->'pickupoptions', (changes->>'appointmentdate')::date);
    booking.location := changes->>'location';
    booking.appointmentdate := (changes->>'appointmentdate')::date;
    booking.pickupoptions := changes->'pickupoptions';
    booking.timeslot := booking.pickupoptions->0->>'timeslot';
    booking.proposalversion := gen_random_uuid();
    booking.optionsby := 'customer';
    booking.status := 'pending confirmation';
  else
    if not public.can_manage_book(actor_id, selectedbook.ownerid) then
      raise exception 'appointment not found' using errcode = 'PT404';
    end if;
    if changes ? 'proposalversion' then
      if changes - array['proposalversion','slot'] <> '{}'::jsonb or
         booking.optionsby is distinct from 'customer' or booking.status <> 'pending confirmation' or
         booking.proposalversion is distinct from (changes->>'proposalversion')::uuid or
         jsonb_array_length(booking.pickupoptions) <> 3 or coalesce(changes->>'slot','') not in ('0','1','2') then
        raise exception 'These pickup times changed. Refresh before choosing.' using errcode = 'PT409';
      end if;
      choice := booking.pickupoptions->((changes->>'slot')::integer);
      if not coalesce(public.pickup_start((choice->>'appointmentdate')::date, choice->>'timeslot') > (clock_timestamp() at time zone 'Asia/Singapore'), false) then
        raise exception 'That pickup time has passed. Choose another time or ask for new availability.' using errcode = 'PT422';
      end if;
      booking.appointmentdate := (choice->>'appointmentdate')::date;
      booking.timeslot := choice->>'timeslot';
      booking.status := 'appointment confirmed';
    else
      next_status := changes->>'status';
      if changes - 'status' <> '{}'::jsonb or next_status is null or
         not ((next_status = 'appointment confirmed' and booking.status = 'pending confirmation' and booking.appointmentdate >= (now() at time zone 'Asia/Singapore')::date)
           or (next_status = 'rejected' and booking.status = 'pending confirmation')
           or (next_status = 'collected' and booking.status = 'appointment confirmed')) then
        raise exception 'invalid collection transition' using errcode = 'PT409';
      end if;
      if next_status = 'appointment confirmed' and jsonb_array_length(booking.pickupoptions) > 0 then
        raise exception 'Select one of the customer’s three pickup times.' using errcode = 'PT422';
      end if;
      if next_status = 'appointment confirmed' and
         coalesce(public.pickup_start(booking.appointmentdate, booking.timeslot) > (clock_timestamp() at time zone 'Asia/Singapore'), false) = false then
        raise exception 'The pickup time has passed or is incomplete. Ask the customer for new availability.' using errcode = 'PT422';
      end if;
      booking.status := next_status;
      if next_status = 'collected' then update public.books set status = 'adopted', updatedat = now() where id = book_id; end if;
    end if;
  end if;
  update public.appointments set status = booking.status, location = booking.location,
    appointmentdate = booking.appointmentdate, timeslot = booking.timeslot,
    pickupoptions = booking.pickupoptions, proposalversion = booking.proposalversion, optionsby = booking.optionsby, updatedat = now()
    where id = appointment_id returning * into booking;
  return booking;
end;
$$;

revoke all on function public.change_collection(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.change_collection(uuid,uuid,jsonb) to service_role;

create or replace function public.delete_books(book_ids uuid[], actor_id uuid)
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
    if selectedbook.status <> 'available' or
       exists(select 1 from public.adoptionapplications where bookid = selectedbook.id) or
       exists(select 1 from public.appointments where bookid = selectedbook.id) then
      raise exception 'Only available copies without adoption applications or appointments can be deleted. No books were deleted.' using errcode = 'PT409';
    end if;
    deleted_ids := array_append(deleted_ids, selectedbook.id);
  end loop;
  if affected <> cardinality(book_ids) then raise exception 'book not found' using errcode = 'PT404'; end if;
  delete from public.watchlist where bookid = any(book_ids);
  delete from public.books where id = any(deleted_ids);
  return jsonb_build_object('deletedids', deleted_ids);
end;
$$;

revoke all on function public.delete_books(uuid[],uuid) from public,anon,authenticated;
grant execute on function public.delete_books(uuid[],uuid) to service_role;

create or replace function public.admin_appointment_view(status text, collection_date date, selected_view text, slot text, options jsonb)
returns boolean language sql stable security invoker set search_path = '' as $$
  select case selected_view
    when 'awaiting' then status='pending confirmation' and public.pending_pickup_state(collection_date,slot,options)='awaiting'
    when 'today' then status='appointment confirmed' and collection_date=(now() at time zone 'Asia/Singapore')::date
    when 'upcoming' then collection_date > (now() at time zone 'Asia/Singapore')::date and
      (status='appointment confirmed' or (status='pending confirmation' and public.pending_pickup_state(collection_date,slot,options)='awaiting'))
    when 'overdue' then (status='pending confirmation' and public.pending_pickup_state(collection_date,slot,options)<>'awaiting') or
      (status='appointment confirmed' and (collection_date is null or collection_date < (now() at time zone 'Asia/Singapore')::date))
    when 'history' then status not in ('pending confirmation','appointment confirmed')
    else false end;
$$;

revoke all on function public.admin_appointment_view(text,date,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.admin_appointment_view(text,date,text,text,jsonb) to service_role;

create or replace function public.browse_admin_appointments(search_term text default '', selected_status text default 'all', selected_view text default 'all', selected_date date default null, page_number bigint default 1, page_size integer default 15)
returns jsonb language sql stable security invoker set search_path = '' as $$
  with eligible as not materialized (
    select a.* from public.appointments a join public.books b on b.id=a.bookid where b.ownerid is null
  ), filtered as not materialized (
    select a.* from eligible a join public.users u on u.id=a.userid join public.books b on b.id=a.bookid
    where (selected_view='all' or public.admin_appointment_view(a.status,a.appointmentdate,selected_view,a.timeslot,a.pickupoptions))
      and (selected_status='all' or a.status=selected_status)
      and (selected_date is null or a.appointmentdate=selected_date)
      and (search_term='' or strpos(lower(concat_ws(' ',u.name,u.email,a.booktitle,b.title,array_to_string(b.authors,' '),a.location)),lower(search_term))>0)
  ), page_rows as (
    select *,row_number() over(order by appointmentdate,timeslot,id) as seq from filtered
    order by appointmentdate,timeslot,id
    limit greatest(1,least(page_size,100)) offset (greatest(1,page_number)-1)*greatest(1,least(page_size,100))
  )
  select jsonb_build_object(
    'appointments',coalesce((select jsonb_agg((to_jsonb(p)-'seq') || jsonb_build_object('_id',p.id,'customer',u.name,'email',u.email,'book',to_jsonb(b) || jsonb_build_object('collectionarea',coalesce(s.name,b.collectionarea),'mrtstation',CASE WHEN s.id IS NULL THEN NULL ELSE jsonb_build_object('id',s.id,'name',s.name,'codes',s.codes,'lat',s.lat,'lng',s.lng,'selectable',s.selectable) END)) order by p.seq) from page_rows p join public.users u on u.id=p.userid join public.books b on b.id=p.bookid left join public.mrtstations s on s.id=b.mrtstationid), '[]'::jsonb),
    'total',(select count(*) from filtered),
    'counts',(select jsonb_build_object('awaiting',count(*) filter(where public.admin_appointment_view(status,appointmentdate,'awaiting',timeslot,pickupoptions)),'today',count(*) filter(where public.admin_appointment_view(status,appointmentdate,'today',timeslot,pickupoptions)),'upcoming',count(*) filter(where public.admin_appointment_view(status,appointmentdate,'upcoming',timeslot,pickupoptions)),'overdue',count(*) filter(where public.admin_appointment_view(status,appointmentdate,'overdue',timeslot,pickupoptions)),'history',count(*) filter(where public.admin_appointment_view(status,appointmentdate,'history',timeslot,pickupoptions))) from eligible),
    'today',(now() at time zone 'Asia/Singapore')::date
  );
$$;

revoke all on function public.browse_admin_appointments(text,text,text,date,bigint,integer) from public,anon,authenticated;
grant execute on function public.browse_admin_appointments(text,text,text,date,bigint,integer) to service_role;

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
    return jsonb_build_object('result', 'registered', 'registered', true, 'drive', jsonb_build_object('status',drive.status,'spotsleft',greatest(drive.maxcapacity-cardinality(drive.userids),0)));
  end if;
  if drive.status = 'closed' or drive.eventdate < (now() at time zone 'Asia/Singapore')::date
     or cardinality(drive.userids) >= drive.maxcapacity then
    return jsonb_build_object('result', 'closed', 'title', drive.title);
  end if;
  update public.adoptiondrives
  set userids = array_append(userids, customer_id),
      updatedat = now()
  where id = drive_id returning * into drive;
  return jsonb_build_object('result', 'success', 'registered', true, 'drive', jsonb_build_object('status',drive.status,'spotsleft',greatest(drive.maxcapacity-cardinality(drive.userids),0)));
end;
$$;

revoke all on function public.rsvp_adoption_drive(uuid,uuid) from public,anon,authenticated;
grant execute on function public.rsvp_adoption_drive(uuid,uuid) to service_role;

drop function if exists public.cancel_drive_rsvp(uuid,uuid);

create or replace function public.cancel_drive_rsvp(drive_id uuid, customer_id uuid)
returns jsonb language plpgsql set search_path = '' as $$
declare drive public.adoptiondrives;
begin
  if not exists (select 1 from public.users where id = customer_id and role = 'customer') then
    raise exception 'authorised account required' using errcode = 'PT403';
  end if;
  select * into drive from public.adoptiondrives where id = drive_id for update;
  if not found then raise exception 'drive not found' using errcode = 'PT404'; end if;
  update public.adoptiondrives set userids = array_remove(userids, customer_id), updatedat = now()
    where id = drive_id returning * into drive;
  return jsonb_build_object('registered', false, 'drive', jsonb_build_object('status',drive.status,'spotsleft',greatest(drive.maxcapacity-cardinality(drive.userids),0)));
end;
$$;

revoke all on function public.cancel_drive_rsvp(uuid,uuid) from public,anon,authenticated;
grant execute on function public.cancel_drive_rsvp(uuid,uuid) to service_role;

notify pgrst, 'reload schema';
commit;
