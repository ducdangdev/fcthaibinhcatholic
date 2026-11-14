begin;

create table if not exists public.site_settings(
 setting_key text primary key check(setting_key in('match_banner_recent','match_banner_upcoming')),
 setting_value text not null,
 updated_at timestamptz not null default now()
);

alter table public.site_settings enable row level security;
drop policy if exists "Public can read site settings" on public.site_settings;
create policy "Public can read site settings" on public.site_settings
 for select to anon,authenticated using(true);
drop policy if exists "Admins can manage site settings" on public.site_settings;
create policy "Admins can manage site settings" on public.site_settings
 for all to authenticated using(public.is_admin()) with check(public.is_admin());
grant select on public.site_settings to anon,authenticated;
grant insert,update,delete on public.site_settings to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('match-banners','match-banners',true,20971520,array['image/jpeg','image/png','image/webp','image/avif'])
on conflict(id) do update set public=true,file_size_limit=20971520,
 allowed_mime_types=array['image/jpeg','image/png','image/webp','image/avif'];

drop policy if exists "Public can read match banners" on storage.objects;
create policy "Public can read match banners" on storage.objects
 for select to anon,authenticated using(bucket_id='match-banners');
drop policy if exists "Admins can upload match banners" on storage.objects;
create policy "Admins can upload match banners" on storage.objects
 for insert to authenticated with check(bucket_id='match-banners' and public.is_admin());
drop policy if exists "Admins can delete match banners" on storage.objects;
create policy "Admins can delete match banners" on storage.objects
 for delete to authenticated using(bucket_id='match-banners' and public.is_admin());

notify pgrst,'reload schema';
commit;
