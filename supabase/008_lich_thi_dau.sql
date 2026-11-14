-- Chay sau cac migration hien co de dung quan ly diem danh va chuyen sang lich thi dau.
alter table match_players add column if not exists attendance_status text not null default 'co_mat';

do $$ begin
 if not exists(select 1 from pg_constraint where conname='match_players_attendance_status_check') then
  alter table match_players add constraint match_players_attendance_status_check
   check(attendance_status in('chua_ghi_nhan','co_mat','vang_mat','co_phep'));
 end if;
end $$;

alter table matches add column if not exists ban_thang int not null default 0 check(ban_thang>=0);
update matches m set ban_thang=(select count(*)::int from goals g where g.match_id=m.id);

do $$
declare constraint_row record;
begin
 for constraint_row in
  select conrelid::regclass relation,conname
  from pg_constraint
  where conrelid in('public.goals'::regclass,'public.assists'::regclass)
   and confrelid='public.match_players'::regclass
 loop
  execute format('alter table %s drop constraint %I',constraint_row.relation,constraint_row.conname);
 end loop;
end $$;

alter table goals add constraint goals_match_id_schedule_fkey foreign key(match_id) references matches(id) on delete cascade;
alter table goals add constraint goals_player_id_schedule_fkey foreign key(player_id) references players(id) on delete restrict;
alter table assists add constraint assists_match_id_schedule_fkey foreign key(match_id) references matches(id) on delete cascade;
alter table assists add constraint assists_player_id_schedule_fkey foreign key(player_id) references players(id) on delete restrict;

drop view if exists v_thong_ke_thang;
drop view if exists v_ket_qua_tran;
create view v_ket_qua_tran with(security_invoker=on) as
select m.id match_id,m.season_id,m.ngay_thi_dau,m.doi_thu,m.dia_diem,m.ban_thua,m.ban_thang,
 case when m.trang_thai<>'da_thi_dau' then null when m.ban_thang>m.ban_thua then 'Thắng' when m.ban_thang=m.ban_thua then 'Hòa' else 'Thua' end ket_qua,m.trang_thai
from matches m;
create view v_thong_ke_thang with(security_invoker=on) as
select date_trunc('month',ngay_thi_dau)::date thang,count(*)::int so_tran,sum(ban_thang)::int ban_thang,sum(ban_thua)::int ban_thua,
 (count(*) filter(where ket_qua='Thắng'))::int thang_,(count(*) filter(where ket_qua='Hòa'))::int hoa,(count(*) filter(where ket_qua='Thua'))::int thua
from v_ket_qua_tran where trang_thai='da_thi_dau' group by 1 order by 1;

drop view if exists v_cau_thu_thang;
create view v_cau_thu_thang with(security_invoker=on) as
select e.player_id,date_trunc('month',m.ngay_thi_dau)::date thang,
 count(distinct e.match_id)::int so_tran,count(*) filter(where e.loai='ban_thang')::int ban_thang,
 count(*) filter(where e.loai='kien_tao')::int kien_tao
from(
 select g.player_id,g.match_id,'ban_thang'::text loai from goals g
 union all
 select a.player_id,a.match_id,'kien_tao'::text loai from assists a
) e join matches m on m.id=e.match_id
where public.trang_thai_tran_theo_ngay(m.ngay_thi_dau,m.trang_thai_thu_cong,m.ngay_chinh_trang_thai)='da_thi_dau'
group by e.player_id,date_trunc('month',m.ngay_thi_dau)::date;

drop view if exists v_thong_ke_cau_thu;
create view v_thong_ke_cau_thu with(security_invoker=on) as
select p.id player_id,p.ho_ten,p.so_ao,p.vi_tri,p.anh_url,p.dang_hoat_dong,
 (select count(distinct x.match_id) from(
  select mp.match_id from match_players mp where mp.player_id=p.id and mp.attendance_status='co_mat'
  union select g.match_id from goals g where g.player_id=p.id
  union select a.match_id from assists a where a.player_id=p.id
 ) x join matches m on m.id=x.match_id
 where public.trang_thai_tran_theo_ngay(m.ngay_thi_dau,m.trang_thai_thu_cong,m.ngay_chinh_trang_thai)='da_thi_dau')::int so_tran,
 (select count(*) from goals g join matches m on m.id=g.match_id where g.player_id=p.id and public.trang_thai_tran_theo_ngay(m.ngay_thi_dau,m.trang_thai_thu_cong,m.ngay_chinh_trang_thai)='da_thi_dau')::int ban_thang,
 (select count(*) from assists a join matches m on m.id=a.match_id where a.player_id=p.id and public.trang_thai_tran_theo_ngay(m.ngay_thi_dau,m.trang_thai_thu_cong,m.ngay_chinh_trang_thai)='da_thi_dau')::int kien_tao,
 (select count(*) from match_players mp join matches m on m.id=mp.match_id where mp.player_id=p.id and mp.attendance_status='vang_mat' and public.trang_thai_tran_theo_ngay(m.ngay_thi_dau,m.trang_thai_thu_cong,m.ngay_chinh_trang_thai)='da_thi_dau')::int so_buoi_vang,
 (select count(*) from match_players mp join matches m on m.id=mp.match_id where mp.player_id=p.id and mp.attendance_status='co_phep' and public.trang_thai_tran_theo_ngay(m.ngay_thi_dau,m.trang_thai_thu_cong,m.ngay_chinh_trang_thai)='da_thi_dau')::int so_buoi_co_phep,
 (select count(*) from match_players mp join matches m on m.id=mp.match_id where mp.player_id=p.id and mp.attendance_status='chua_ghi_nhan' and public.trang_thai_tran_theo_ngay(m.ngay_thi_dau,m.trang_thai_thu_cong,m.ngay_chinh_trang_thai)='da_thi_dau')::int so_buoi_chua_ghi_nhan,
 (select count(*) from match_players mp join matches m on m.id=mp.match_id where mp.player_id=p.id and mp.la_xuat_sac_nhat and public.trang_thai_tran_theo_ngay(m.ngay_thi_dau,m.trang_thai_thu_cong,m.ngay_chinh_trang_thai)='da_thi_dau')::int xuat_sac
from players p;

drop view if exists v_buoi_bong;
create view v_buoi_bong with(security_invoker=on) as
select m.id match_id,m.season_id,m.ngay_thi_dau,m.doi_thu,m.logo_doi_thu_url,m.dia_diem,
 public.trang_thai_tran_theo_ngay(m.ngay_thi_dau,m.trang_thai_thu_cong,m.ngay_chinh_trang_thai) trang_thai,
 m.trang_thai_thu_cong,m.ban_thang,m.ban_thua,
 (select count(*) from match_players mp where mp.match_id=m.id and mp.attendance_status='co_mat')::int so_co_mat,
 m.ban_thang so_ban_thang
from matches m;

create or replace function save_match(p jsonb) returns bigint language plpgsql set search_path=public as $$
declare mid bigint;x jsonb;gid bigint;match_date date;status_value text;override_value text;override_date date;player_id_value bigint;
begin
 if not is_admin() then raise exception 'Bạn không có quyền thực hiện thao tác này';end if;
 match_date:=(p->>'ngay_thi_dau')::date;
 status_value:=coalesce(p->>'trang_thai','chua_thi_dau');
 override_value:=nullif(p->>'trang_thai_thu_cong','');
 override_date:=case when override_value is not null then coalesce((p->>'ngay_chinh_trang_thai')::date,(now() at time zone 'Asia/Ho_Chi_Minh')::date) else null end;
 if p->>'id' is null then
  insert into matches(season_id,ngay_thi_dau,doi_thu,dia_diem,ban_thang,ban_thua,trang_thai,trang_thai_thu_cong,ngay_chinh_trang_thai)
  values((p->>'season_id')::bigint,match_date,nullif(p->>'doi_thu',''),p->>'dia_diem',coalesce((p->>'ban_thang')::int,0),coalesce((p->>'ban_thua')::int,0),status_value,override_value,override_date) returning id into mid;
 else
  mid:=(p->>'id')::bigint;
  update matches set season_id=(p->>'season_id')::bigint,ngay_thi_dau=match_date,doi_thu=nullif(p->>'doi_thu',''),
   dia_diem=p->>'dia_diem',ban_thang=coalesce((p->>'ban_thang')::int,0),ban_thua=coalesce((p->>'ban_thua')::int,0),
   trang_thai=status_value,trang_thai_thu_cong=override_value,ngay_chinh_trang_thai=override_date where id=mid;
  delete from goals where match_id=mid;
 end if;
 if p ? 'cau_thu' then
  for x in select * from jsonb_array_elements(coalesce(p->'cau_thu','[]'::jsonb)) loop
   insert into match_players(match_id,player_id,attendance_status)
   values(mid,(x->>'player_id')::bigint,coalesce(nullif(x->>'tinh_trang',''),'chua_ghi_nhan'))
   on conflict(match_id,player_id) do update set attendance_status=excluded.attendance_status;
  end loop;
  delete from match_players mp where mp.match_id=mid and not exists(
   select 1 from jsonb_array_elements(coalesce(p->'cau_thu','[]'::jsonb)) c
   where (c->>'player_id')::bigint=mp.player_id
  );
 end if;
 for x in select * from jsonb_array_elements(coalesce(p->'ban_thang_ca_nhan','[]')) loop
  player_id_value:=(x->>'player_id')::bigint;
  if not exists(select 1 from match_players mp where mp.match_id=mid and mp.player_id=player_id_value and mp.attendance_status='co_mat') then
   raise exception 'Cầu thủ ghi bàn phải được điểm danh có mặt';
  end if;
  insert into goals(match_id,player_id,phut) values(mid,player_id_value,(x->>'phut')::int) returning id into gid;
  if nullif(x->>'kien_tao','') is not null then
   insert into assists(goal_id,match_id,player_id) values(gid,mid,(x->>'kien_tao')::bigint);
  end if;
 end loop;
 return mid;
end$$;

grant select on v_buoi_bong,v_ket_qua_tran,v_thong_ke_thang,v_thong_ke_cau_thu,v_cau_thu_thang to anon,authenticated;
notify pgrst,'reload schema';
