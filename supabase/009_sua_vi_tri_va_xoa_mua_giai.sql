begin;

alter table public.players
 drop constraint if exists players_vi_tri_check;

alter table public.players
 add constraint players_vi_tri_check
 check(vi_tri is null or vi_tri in(
  'Thủ môn',
  'Hậu vệ',
  'Trung vệ thòng',
  'Hậu vệ cánh phải',
  'Hậu vệ cánh trái',
  'Tiền vệ',
  'Tiền vệ phòng ngự',
  'Tiền vệ trung tâm',
  'Tiền vệ tấn công',
  'Tiền vệ cánh phải',
  'Tiền vệ cánh trái',
  'Tiền đạo',
  'Tiền đạo cánh phải',
  'Tiền đạo cánh trái',
  'Tiền đạo lùi',
  'Tiền đạo cắm',
  'Đa năng'
 ));

alter table public.matches
 drop constraint if exists matches_season_id_fkey;

alter table public.matches
 add constraint matches_season_id_fkey
 foreign key(season_id) references public.seasons(id) on delete set null;

alter table public.awards
 drop constraint if exists awards_season_id_fkey;

alter table public.awards
 add constraint awards_season_id_fkey
 foreign key(season_id) references public.seasons(id) on delete set null;

commit;
