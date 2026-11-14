begin;

drop view if exists public.v_cau_thu_thang;
create view public.v_cau_thu_thang with(security_invoker=on) as
select mp.player_id,date_trunc('month',m.ngay_thi_dau)::date thang,
 count(*) filter(where mp.attendance_status='co_mat')::int so_tran,
 count(*) filter(where mp.attendance_status='vang_mat')::int so_buoi_vang,
 count(*) filter(where mp.attendance_status='co_phep')::int so_buoi_co_phep,
 count(distinct g.id)::int ban_thang
from public.match_players mp
join public.matches m on m.id=mp.match_id
left join public.goals g on g.match_id=mp.match_id and g.player_id=mp.player_id
where public.trang_thai_tran_theo_ngay(m.ngay_thi_dau,m.trang_thai_thu_cong,m.ngay_chinh_trang_thai)='da_thi_dau'
group by mp.player_id,date_trunc('month',m.ngay_thi_dau)::date;

drop view if exists public.v_thong_ke_cau_thu;
create view public.v_thong_ke_cau_thu with(security_invoker=on) as
select p.id player_id,p.ho_ten,p.so_ao,p.vi_tri,p.anh_url,p.dang_hoat_dong,
 (select count(*) from public.match_players mp join public.matches m on m.id=mp.match_id
  where mp.player_id=p.id and mp.attendance_status='co_mat'
   and public.trang_thai_tran_theo_ngay(m.ngay_thi_dau,m.trang_thai_thu_cong,m.ngay_chinh_trang_thai)='da_thi_dau')::int so_tran,
 (select count(*) from public.goals g join public.matches m on m.id=g.match_id
  where g.player_id=p.id and public.trang_thai_tran_theo_ngay(m.ngay_thi_dau,m.trang_thai_thu_cong,m.ngay_chinh_trang_thai)='da_thi_dau')::int ban_thang,
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
   and public.trang_thai_tran_theo_ngay(m.ngay_thi_dau,m.trang_thai_thu_cong,m.ngay_chinh_trang_thai)='da_thi_dau')::int xuat_sac
from public.players p;

create or replace view public.v_phong_do with(security_invoker=on) as
select player_id,sum(diem)::int diem from(
 select mp.player_id,row_number() over(partition by mp.player_id order by m.ngay_thi_dau desc,m.id desc) rn,
  3*(select count(*) from public.goals g where g.match_id=mp.match_id and g.player_id=mp.player_id)
  +3*mp.la_xuat_sac_nhat::int diem
 from public.match_players mp
 join public.matches m on m.id=mp.match_id
 where mp.attendance_status='co_mat'
  and public.trang_thai_tran_theo_ngay(m.ngay_thi_dau,m.trang_thai_thu_cong,m.ngay_chinh_trang_thai)='da_thi_dau'
) t where rn<=5 group by 1;

grant select on public.v_thong_ke_cau_thu,public.v_cau_thu_thang,public.v_phong_do to anon,authenticated;
notify pgrst,'reload schema';
commit;
