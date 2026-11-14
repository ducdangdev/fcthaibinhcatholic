begin;

alter table public.players
 drop constraint if exists players_vi_tri_check;

update public.players
 set vi_tri='Trung vệ thòng'
 where vi_tri='Trung vệ';

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

commit;
