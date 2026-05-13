-- 1. Update study_tasks table for advanced features
do $$ 
begin
  if not exists (select 1 from information_schema.columns where table_name='study_tasks' and column_name='due_time') then
    alter table public.study_tasks add column due_time time;
  end if;

  if not exists (select 1 from information_schema.columns where table_name='study_tasks' and column_name='reminder_sent') then
    alter table public.study_tasks add column reminder_sent boolean default false;
  end if;
end $$;

-- 2. Add subject list and metadata to profiles if needed
do $$ 
begin
  if not exists (select 1 from information_schema.columns where table_name='profiles' and column_name='timezone') then
    alter table public.profiles add column timezone text default 'UTC';
  end if;
end $$;
