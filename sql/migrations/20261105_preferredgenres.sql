alter table public.users add column if not exists preferredgenres text[] not null default '{}';
notify pgrst, 'reload schema';
