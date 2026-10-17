with incoming as (
  select * from jsonb_to_recordset(current_setting('app.seed_books')::jsonb)
    as book(mrtstationid uuid, id uuid, title text, authors text[], isbn text, subjects text[],
      publicationyear integer, description text, coverurl text, openlibraryid text)
), inserted as (
  insert into public.books
    (id, title, authors, isbn, subjects, publicationyear, description,
     coverurl, openlibraryid, source, status, mrtstationid)
  select id, title, authors, isbn, subjects, publicationyear, description,
         coverurl, openlibraryid, 'open_library', 'available', mrtstationid
  from incoming
  where not exists (
    select 1 from public.books existing where existing.openlibraryid = incoming.openlibraryid
  )
  on conflict (id) do nothing
  returning id
)
select (select count(*)::integer from inserted) as inserted,
       (select count(*)::integer from incoming) - (select count(*)::integer from inserted) as skipped;
