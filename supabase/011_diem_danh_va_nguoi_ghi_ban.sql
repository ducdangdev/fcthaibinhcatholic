begin;

create or replace view public.v_thong_ke_cau_thu with(security_invoker=on) as
select p.id player_id,p.ho_ten,p.so_ao,p.vi_tri,p.anh_url,p.dang_hoat_dong,
 (select count(distinct x.match_id) from(
  select mp.match_id from public.match_players mp where mp.player_id=p.id and mp.attendance_status='co_mat'
  union select g.match_id from public.goals g where g.player_id=p.id
  union select a.match_id from public.assists a where a.player_id=p.id
 ) x join public.matches m on m.id=x.match_id
 where public.trang_thai_tran_theo_ngay(m.ngay_thi_dau,m.trang_thai_thu_cong,m.ngay_chinh_trang_thai)='da_thi_dau')::int so_tran,
 (select count(*) from public.goals g join public.matches m on m.id=g.match_id where g.player_id=p.id and public.trang_thai_tran_theo_ngay(m.ngay_thi_dau,m.trang_thai_thu_cong,m.ngay_chinh_trang_thai)='da_thi_dau')::int ban_thang,
 (select count(*) from public.assists a join public.matches m on m.id=a.match_id where a.player_id=p.id and public.trang_thai_tran_theo_ngay(m.ngay_thi_dau,m.trang_thai_thu_cong,m.ngay_chinh_trang_thai)='da_thi_dau')::int kien_tao,
 (select count(*) from public.match_players mp join public.matches m on m.id=mp.match_id where mp.player_id=p.id and mp.attendance_status='vang_mat' and public.trang_thai_tran_theo_ngay(m.ngay_thi_dau,m.trang_thai_thu_cong,m.ngay_chinh_trang_thai)='da_thi_dau')::int so_buoi_vang,
 (select count(*) from public.match_players mp join public.matches m on m.id=mp.match_id where mp.player_id=p.id and mp.attendance_status='co_phep' and public.trang_thai_tran_theo_ngay(m.ngay_thi_dau,m.trang_thai_thu_cong,m.ngay_chinh_trang_thai)='da_thi_dau')::int so_buoi_co_phep,
 (select count(*) from public.match_players mp join public.matches m on m.id=mp.match_id where mp.player_id=p.id and mp.attendance_status='chua_ghi_nhan' and public.trang_thai_tran_theo_ngay(m.ngay_thi_dau,m.trang_thai_thu_cong,m.ngay_chinh_trang_thai)='da_thi_dau')::int so_buoi_chua_ghi_nhan,
 (select count(*) from public.match_players mp join public.matches m on m.id=mp.match_id where mp.player_id=p.id and mp.la_xuat_sac_nhat and public.trang_thai_tran_theo_ngay(m.ngay_thi_dau,m.trang_thai_thu_cong,m.ngay_chinh_trang_thai)='da_thi_dau')::int xuat_sac
from public.players p;

create or replace function public.save_match(p jsonb) returns bigint language plpgsql set search_path=public as $$
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
 for x in select * from jsonb_array_elements(coalesce(p->'ban_thang_ca_nhan','[]'::jsonb)) loop
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

notify pgrst,'reload schema';
commit;
