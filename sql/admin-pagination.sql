-- @lee-hlmilk > admin list queries filter/count in SQL > only page rows are sent to the browser.
-- Apply after base.sql; safe to rerun on an existing database.
create or replace function public.admin_appointment_view(status text, collection_date date, selected_view text)
returns boolean language sql stable security invoker set search_path = '' as $$
  select case selected_view
    when 'awaiting' then status='pending confirmation' and collection_date > (now() at time zone 'Asia/Singapore')::date
    when 'today' then status='appointment confirmed' and collection_date = (now() at time zone 'Asia/Singapore')::date
    when 'upcoming' then status in ('pending confirmation','appointment confirmed') and collection_date > (now() at time zone 'Asia/Singapore')::date
    when 'overdue' then status in ('pending confirmation','appointment confirmed') and
      (collection_date < (now() at time zone 'Asia/Singapore')::date or (status='pending confirmation' and collection_date=(now() at time zone 'Asia/Singapore')::date))
    when 'history' then status not in ('pending confirmation','appointment confirmed')
    else false end;
$$;
revoke all on function public.admin_appointment_view(text,date,text) from public,anon,authenticated;
grant execute on function public.admin_appointment_view(text,date,text) to service_role;

create or replace function public.browse_admin_applications(search_term text default '', selected_status text default 'all', sort_by text default 'oldest', page_number bigint default 1, page_size integer default 15)
returns jsonb language sql stable security invoker set search_path = '' as $$
  with eligible as not materialized (
    select a.* from public.adoptionapplications a join public.books b on b.id=a.bookid where b.ownerid is null
  ), filtered as not materialized (
    select a.* from eligible a join public.users u on u.id=a.userid join public.books b on b.id=a.bookid
    where (selected_status='all' or a.status=selected_status)
      and (search_term='' or strpos(lower(concat_ws(' ',u.name,u.email,b.title,array_to_string(b.authors,' '))),lower(search_term))>0)
  ), page_rows as (
    select *,row_number() over(order by case when sort_by='oldest' then createdat end asc, case when sort_by='newest' then createdat end desc, id) as seq from filtered
    order by case when sort_by='oldest' then createdat end asc, case when sort_by='newest' then createdat end desc, id
    limit greatest(1,least(page_size,100)) offset (greatest(1,page_number)-1)*greatest(1,least(page_size,100))
  )
  select jsonb_build_object(
    'adoptionapplications',coalesce((select jsonb_agg((to_jsonb(p)-'seq') || jsonb_build_object('_id',p.id,'userid',jsonb_build_object('id',u.id,'name',u.name,'email',u.email),'bookid',to_jsonb(b) || jsonb_build_object('collectionarea',coalesce(s.name,b.collectionarea),'mrtstation',CASE WHEN s.id IS NULL THEN NULL ELSE jsonb_build_object('id',s.id,'name',s.name,'codes',s.codes,'lat',s.lat,'lng',s.lng,'selectable',s.selectable) END)) order by p.seq) from page_rows p join public.users u on u.id=p.userid join public.books b on b.id=p.bookid left join public.mrtstations s on s.id=b.mrtstationid), '[]'::jsonb),
    'total',(select count(*) from filtered),
    'counts',(select jsonb_build_object('all',count(*),'pending',count(*) filter(where status='pending'),'approved',count(*) filter(where status='approved'),'rejected',count(*) filter(where status='rejected'),'cancelled',count(*) filter(where status='cancelled')) from eligible),
    'today',(now() at time zone 'Asia/Singapore')::date
  );
$$;
revoke all on function public.browse_admin_applications(text,text,text,bigint,integer) from public,anon,authenticated;
grant execute on function public.browse_admin_applications(text,text,text,bigint,integer) to service_role;

create or replace function public.browse_admin_appointments(search_term text default '', selected_status text default 'all', selected_view text default 'all', selected_date date default null, page_number bigint default 1, page_size integer default 15)
returns jsonb language sql stable security invoker set search_path = '' as $$
  with eligible as not materialized (
    select a.* from public.appointments a join public.books b on b.id=a.bookid where b.ownerid is null
  ), filtered as not materialized (
    select a.* from eligible a join public.users u on u.id=a.userid join public.books b on b.id=a.bookid
    where (selected_view='all' or public.admin_appointment_view(a.status,a.appointmentdate,selected_view))
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
    'counts',(select jsonb_build_object('awaiting',count(*) filter(where public.admin_appointment_view(status,appointmentdate,'awaiting')),'today',count(*) filter(where public.admin_appointment_view(status,appointmentdate,'today')),'upcoming',count(*) filter(where public.admin_appointment_view(status,appointmentdate,'upcoming')),'overdue',count(*) filter(where public.admin_appointment_view(status,appointmentdate,'overdue')),'history',count(*) filter(where public.admin_appointment_view(status,appointmentdate,'history'))) from eligible),
    'today',(now() at time zone 'Asia/Singapore')::date
  );
$$;
revoke all on function public.browse_admin_appointments(text,text,text,date,bigint,integer) from public,anon,authenticated;
grant execute on function public.browse_admin_appointments(text,text,text,date,bigint,integer) to service_role;

create or replace function public.browse_admin_drives(search_term text default '', selected_status text default 'all', selected_view text default 'all', selected_date date default null, page_number bigint default 1, page_size integer default 15)
returns jsonb language sql stable security invoker set search_path = '' as $$
  with eligible as not materialized (
    select d.* from public.adoptiondrives d
  ), filtered as not materialized (
    select d.* from eligible d left join public.mrtstations s on s.id=d.mrtstationid
    where (selected_view='all' or (selected_view='past')=(d.eventdate < (now() at time zone 'Asia/Singapore')::date or d.status='cancelled'))
      and (selected_status='all' or d.status=selected_status)
      and (selected_date is null or d.eventdate=selected_date)
      and (search_term='' or strpos(lower(concat_ws(' ',d.title,d.location,s.name)),lower(search_term))>0)
  ), page_rows as (
    select *,row_number() over(order by case when selected_view='past' then eventdate end desc, case when selected_view<>'past' then eventdate end asc,id) as seq from filtered
    order by case when selected_view='past' then eventdate end desc, case when selected_view<>'past' then eventdate end asc,id
    limit greatest(1,least(page_size,100)) offset (greatest(1,page_number)-1)*greatest(1,least(page_size,100))
  )
  select jsonb_build_object(
    'drives',coalesce((select jsonb_agg((to_jsonb(p)-'seq') || jsonb_build_object('_id',p.id,'needsLocationUpdate',p.mrtstationid is null,'mrtstation',case when s.id is null then null else jsonb_build_object('id',s.id,'name',s.name,'codes',s.codes,'lat',s.lat,'lng',s.lng,'selectable',s.selectable) end) order by p.seq) from page_rows p left join public.mrtstations s on s.id=p.mrtstationid), '[]'::jsonb),
    'total',(select count(*) from filtered),
    'counts',(select jsonb_build_object('upcoming',count(*) filter(where eventdate >= (now() at time zone 'Asia/Singapore')::date and status<>'cancelled'),'past',count(*) filter(where eventdate < (now() at time zone 'Asia/Singapore')::date or status='cancelled')) from eligible),
    'today',(now() at time zone 'Asia/Singapore')::date
  );
$$;
revoke all on function public.browse_admin_drives(text,text,text,date,bigint,integer) from public,anon,authenticated;
grant execute on function public.browse_admin_drives(text,text,text,date,bigint,integer) to service_role;

-- @lee-hlmilk > support status/date ordering > existing foreign-key indexes cover the relation joins.
create index if not exists admin_applications_status_created_id_idx on public.adoptionapplications(status,createdat,id);
create index if not exists admin_appointments_status_date_time_id_idx on public.appointments(status,appointmentdate,timeslot,id);
create index if not exists admin_drives_status_date_id_idx on public.adoptiondrives(status,eventdate,id);
notify pgrst, 'reload schema';
