-- Create bucket (run once in Supabase SQL editor)
insert into storage.buckets (id, name, public)
values ('memory-media', 'memory-media', true)
on conflict (id) do nothing;

-- Allow authenticated users to upload to their folder
drop policy if exists "Authenticated users can upload media" on storage.objects;
create policy "Authenticated users can upload media"
  on storage.objects
  for insert
  with check (
    bucket_id = 'memory-media'
    and auth.role() = 'authenticated'
  );

-- Allow owners to read/write their own files and everyone to read public media
drop policy if exists "Public read for memory bucket" on storage.objects;
create policy "Public read for memory bucket"
  on storage.objects
  for select
  using (
    bucket_id = 'memory-media'
  );

drop policy if exists "Owners manage their uploads" on storage.objects;
create policy "Owners manage their uploads"
  on storage.objects
  for update using (
    bucket_id = 'memory-media' and owner = auth.uid()
  )
  with check (bucket_id = 'memory-media' and owner = auth.uid());

