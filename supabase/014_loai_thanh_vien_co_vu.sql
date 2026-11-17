begin;

alter table public.players
 add column if not exists loai_thanh_vien text not null default 'cau_thu';

do $$ begin
 if not exists(
  select 1 from pg_constraint
  where conname='players_loai_thanh_vien_check'
   and conrelid='public.players'::regclass
 ) then
  alter table public.players
   add constraint players_loai_thanh_vien_check
   check(loai_thanh_vien in('cau_thu','co_vu'));
 end if;
end $$;

do $$
declare
 co_kien_tao boolean;
 cau_lenh text;
begin
 select exists(
  select 1 from pg_attribute
  where attrelid='public.v_thong_ke_cau_thu'::regclass
   and attname='kien_tao' and attnum>0 and not attisdropped
 ) into co_kien_tao;

 cau_lenh := $query$
select p.id player_id,p.ho_ten,p.so_ao,p.vi_tri,p.anh_url,p.dang_hoat_dong,
 (select count(*) from public.match_players mp join public.matches m on m.id=mp.match_id
  where mp.player_id=p.id and mp.attendance_status='co_mat'
   and public.trang_thai_tran_theo_ngay(m.ngay_thi_dau,m.trang_thai_thu_cong,m.ngay_chinh_trang_thai)='da_thi_dau')::int so_tran,
 (select count(*) from public.goals g join public.matches m on m.id=g.match_id
  where g.player_id=p.id and public.trang_thai_tran_theo_ngay(m.ngay_thi_dau,m.trang_thai_thu_cong,m.ngay_chinh_trang_thai)='da_thi_dau')::int ban_thang,
$query$;
 if co_kien_tao then
  cau_lenh := cau_lenh || $query$
 (select count(*) from public.assists a join public.matches m on m.id=a.match_id
  where a.player_id=p.id and public.trang_thai_tran_theo_ngay(m.ngay_thi_dau,m.trang_thai_thu_cong,m.ngay_chinh_trang_thai)='da_thi_dau')::int kien_tao,
$query$;
 end if;
 cau_lenh := cau_lenh || $query$
 (select count(*) from public.match_players mp join public.matches m on m.id=mp.match_id
  where mp.player_id=p.id and mp.attendance_status='vang_mat'
   and public.trang_thai_tran_theo_ngay(m.ngay_thi_dau,m.trang_thai_thu_cong,m.ngay_chinh_trang_thai)='da_thi_dau')::int so_buoi_vang,
 (select count(*) from public.match_players mp join public.matches m on m.id=mp.match_id
  where mp.player_id=p.id and mp.attendance_status='co_phep'
   and public.trang_thai_tran_theo_ngay(m.ngay_thi_dau,m.trang_thai_thu_cong,m.ngay_chinh_trang_thai)='da_thi_dau')::int so_buoi_co_phep,
 (select count(*) from public.match_players mp join public.matches m on m.id=mp.match_id
  where mp.player_id=p.id and mp.attendance_status='chua_ghi_nhan'
   and public.trang_thai_tran_theo_ngay(m.ngay_thi_dau,m.trang_thai_thu_cong,m.ngay_chinh_trang_thai)='da_thi_dau')::int so_buoi_chua_ghi_nhan,
 (select count(*) from public.match_players mp join public.matches m on m.id=mp.match_id
  where mp.player_id=p.id and mp.la_xuat_sac_nhat
   and public.trang_thai_tran_theo_ngay(m.ngay_thi_dau,m.trang_thai_thu_cong,m.ngay_chinh_trang_thai)='da_thi_dau')::int xuat_sac,
 p.loai_thanh_vien
from public.players p
$query$;

 execute 'create or replace view public.v_thong_ke_cau_thu with(security_invoker=on) as ' || cau_lenh;
end $$;

grant select on public.v_thong_ke_cau_thu to anon,authenticated;
notify pgrst,'reload schema';
commit;
