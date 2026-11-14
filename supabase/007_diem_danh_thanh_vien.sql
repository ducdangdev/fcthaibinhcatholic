-- Chay mot lan trong Supabase SQL Editor sau cac migration hien co.
alter table matches alter column doi_thu drop not null;
alter table match_players add column if not exists attendance_status text not null default 'co_mat';

do $$ begin
 if not exists(select 1 from pg_constraint where conname='match_players_attendance_status_check') then
  alter table match_players add constraint match_players_attendance_status_check
   check(attendance_status in('chua_ghi_nhan','co_mat','vang_mat','co_phep'));
 end if;
end $$;

drop view if exists v_cau_thu_thang;
drop view if exists v_phong_do;
drop view if exists v_thong_ke_cau_thu;

create view v_thong_ke_cau_thu with(security_invoker=on) as
select p.id player_id,p.ho_ten,p.so_ao,p.vi_tri,p.anh_url,p.dang_hoat_dong,
 (select count(*) from match_players mp join matches m on m.id=mp.match_id
  where mp.player_id=p.id and mp.attendance_status='co_mat'
   and public.trang_thai_tran_theo_ngay(m.ngay_thi_dau,m.trang_thai_thu_cong,m.ngay_chinh_trang_thai)='da_thi_dau')::int so_tran,
 (select count(*) from goals g join matches m on m.id=g.match_id
  where g.player_id=p.id and public.trang_thai_tran_theo_ngay(m.ngay_thi_dau,m.trang_thai_thu_cong,m.ngay_chinh_trang_thai)='da_thi_dau')::int ban_thang,
 (select count(*) from assists a join matches m on m.id=a.match_id
  where a.player_id=p.id and public.trang_thai_tran_theo_ngay(m.ngay_thi_dau,m.trang_thai_thu_cong,m.ngay_chinh_trang_thai)='da_thi_dau')::int kien_tao,
 (select count(*) from match_players mp join matches m on m.id=mp.match_id
  where mp.player_id=p.id and mp.attendance_status='vang_mat'
   and public.trang_thai_tran_theo_ngay(m.ngay_thi_dau,m.trang_thai_thu_cong,m.ngay_chinh_trang_thai)='da_thi_dau')::int so_buoi_vang,
 (select count(*) from match_players mp join matches m on m.id=mp.match_id
  where mp.player_id=p.id and mp.attendance_status='co_phep'
   and public.trang_thai_tran_theo_ngay(m.ngay_thi_dau,m.trang_thai_thu_cong,m.ngay_chinh_trang_thai)='da_thi_dau')::int so_buoi_co_phep,
 (select count(*) from match_players mp join matches m on m.id=mp.match_id
  where mp.player_id=p.id and mp.attendance_status='chua_ghi_nhan'
   and public.trang_thai_tran_theo_ngay(m.ngay_thi_dau,m.trang_thai_thu_cong,m.ngay_chinh_trang_thai)='da_thi_dau')::int so_buoi_chua_ghi_nhan,
 (select count(*) from match_players mp join matches m on m.id=mp.match_id
  where mp.player_id=p.id and mp.la_xuat_sac_nhat
   and public.trang_thai_tran_theo_ngay(m.ngay_thi_dau,m.trang_thai_thu_cong,m.ngay_chinh_trang_thai)='da_thi_dau')::int xuat_sac
from players p;

create view v_cau_thu_thang with(security_invoker=on) as
select mp.player_id,date_trunc('month',m.ngay_thi_dau)::date thang,
 count(*) filter(where mp.attendance_status='co_mat')::int so_tran,
 count(*) filter(where mp.attendance_status='vang_mat')::int so_buoi_vang,
 count(*) filter(where mp.attendance_status='co_phep')::int so_buoi_co_phep,
 count(distinct g.id)::int ban_thang,count(distinct a.id)::int kien_tao
from match_players mp join matches m on m.id=mp.match_id
left join goals g on g.match_id=mp.match_id and g.player_id=mp.player_id
left join assists a on a.match_id=mp.match_id and a.player_id=mp.player_id
where public.trang_thai_tran_theo_ngay(m.ngay_thi_dau,m.trang_thai_thu_cong,m.ngay_chinh_trang_thai)='da_thi_dau'
group by 1,2;

create view v_phong_do with(security_invoker=on) as
select player_id,sum(diem)::int diem from(
 select mp.player_id,row_number() over(partition by mp.player_id order by m.ngay_thi_dau desc,m.id desc) rn,
  3*(select count(*) from goals g where g.match_id=mp.match_id and g.player_id=mp.player_id)
  +2*(select count(*) from assists a where a.match_id=mp.match_id and a.player_id=mp.player_id)
  +3*mp.la_xuat_sac_nhat::int diem
 from match_players mp join matches m on m.id=mp.match_id
 where mp.attendance_status='co_mat'
  and public.trang_thai_tran_theo_ngay(m.ngay_thi_dau,m.trang_thai_thu_cong,m.ngay_chinh_trang_thai)='da_thi_dau'
) t where rn<=5 group by 1;

create view v_buoi_bong with(security_invoker=on) as
select m.id match_id,m.season_id,m.ngay_thi_dau,m.dia_diem,
 public.trang_thai_tran_theo_ngay(m.ngay_thi_dau,m.trang_thai_thu_cong,m.ngay_chinh_trang_thai) trang_thai,
 m.trang_thai_thu_cong,
 (select count(*) from match_players mp where mp.match_id=m.id and mp.attendance_status='co_mat')::int so_co_mat,
 (select count(*) from goals g where g.match_id=m.id)::int so_ban_thang
from matches m;

grant select on v_buoi_bong,v_thong_ke_cau_thu,v_cau_thu_thang,v_phong_do to anon,authenticated;

create or replace function save_match(p jsonb) returns bigint language plpgsql set search_path=public as $$
declare mid bigint;x jsonb;gid bigint;match_date date;status_value text;override_value text;override_date date;player_id_value bigint;
begin
 if not is_admin() then raise exception 'Bạn không có quyền thực hiện thao tác này';end if;
 match_date:=(p->>'ngay_thi_dau')::date;
 status_value:=coalesce(p->>'trang_thai','chua_thi_dau');
 override_value:=nullif(p->>'trang_thai_thu_cong','');
 override_date:=case when override_value is not null then coalesce((p->>'ngay_chinh_trang_thai')::date,(now() at time zone 'Asia/Ho_Chi_Minh')::date) else null end;
 if p->>'id' is null then
  insert into matches(season_id,ngay_thi_dau,doi_thu,dia_diem,ban_thua,trang_thai,trang_thai_thu_cong,ngay_chinh_trang_thai)
  values((p->>'season_id')::bigint,match_date,nullif(p->>'doi_thu',''),p->>'dia_diem',coalesce((p->>'ban_thua')::int,0),status_value,override_value,override_date) returning id into mid;
 else
  mid:=(p->>'id')::bigint;
  update matches set season_id=(p->>'season_id')::bigint,ngay_thi_dau=match_date,
   doi_thu=coalesce(nullif(p->>'doi_thu',''),doi_thu),dia_diem=p->>'dia_diem',
   ban_thua=case when p ? 'ban_thua' then coalesce((p->>'ban_thua')::int,0) else ban_thua end,
   trang_thai=status_value,trang_thai_thu_cong=override_value,ngay_chinh_trang_thai=override_date where id=mid;
  delete from match_players where match_id=mid;
 end if;
 for x in select * from jsonb_array_elements(coalesce(p->'cau_thu','[]')) loop
  insert into match_players(match_id,player_id,la_xuat_sac_nhat,attendance_status)
  values(mid,(x->>'player_id')::bigint,coalesce((x->>'xuat_sac')::boolean,false),coalesce(x->>'tinh_trang','chua_ghi_nhan'));
 end loop;
 for x in select * from jsonb_array_elements(coalesce(p->'ban_thang','[]')) loop
  player_id_value:=(x->>'player_id')::bigint;
  if not exists(select 1 from match_players mp where mp.match_id=mid and mp.player_id=player_id_value and mp.attendance_status='co_mat') then
   raise exception 'Cầu thủ ghi bàn phải được điểm danh có mặt';
  end if;
  gid:=null;
  insert into goals(match_id,player_id,phut) values(mid,player_id_value,(x->>'phut')::int) returning id into gid;
  if nullif(x->>'kien_tao','') is not null then
   if not exists(select 1 from match_players mp where mp.match_id=mid and mp.player_id=(x->>'kien_tao')::bigint and mp.attendance_status='co_mat') then
    raise exception 'Cầu thủ kiến tạo phải được điểm danh có mặt';
   end if;
   insert into assists(goal_id,match_id,player_id) values(gid,mid,(x->>'kien_tao')::bigint);
  end if;
 end loop;
 return mid;
end$$;

notify pgrst,'reload schema';
