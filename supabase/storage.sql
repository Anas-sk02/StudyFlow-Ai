insert into storage.buckets (id, name, public)
values ('notes', 'notes', false)
on conflict (id) do nothing;

create policy "notes bucket read own objects"
on storage.objects for select
using (bucket_id = 'notes' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "notes bucket upload own objects"
on storage.objects for insert
with check (bucket_id = 'notes' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "notes bucket delete own objects"
on storage.objects for delete
using (bucket_id = 'notes' and auth.uid()::text = (storage.foldername(name))[1]);
