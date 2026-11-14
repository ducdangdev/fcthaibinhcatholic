-- Chay sau cac file Supabase hien co trong SQL Editor.
alter table matches add column if not exists trang_thai text not null default 'chua_thi_dau';
alter table matches add column if not exists trang_thai_thu_cong text;
alter table matches add column if not exists ngay_chinh_trang_thai date;

do $$ begin
 if not exists(select 1 from pg_constraint where conname='matches_trang_thai_check') then
  alter table matches add constraint matches_trang_thai_check
   check(trang_thai in('chua_thi_dau','dang_thi_dau','da_thi_dau'));
 end if;
 if not exists(select 1 from pg_constraint where conname='matches_trang_thai_thu_cong_check') then
  alter table matches add constraint matches_trang_thai_thu_cong_check
   check(trang_thai_thu_cong is null or trang_thai_thu_cong in('chua_thi_dau','dang_thi_dau','da_thi_dau'));
 end if;
end $$;

create or replace function trang_thai_tran_theo_ngay(p_ngay date,p_thu_cong text,p_ngay_thu_cong date)
returns text language sql stable set search_path=public as $$
 select case
  when p_thu_cong is not null and p_ngay_thu_cong=(now() at time zone 'Asia/Ho_Chi_Minh')::date then p_thu_cong
  when p_ngay<(now() at time zone 'Asia/Ho_Chi_Minh')::date then 'da_thi_dau'
  when p_ngay>(now() at time zone 'Asia/Ho_Chi_Minh')::date then 'chua_thi_dau'
  else 'dang_thi_dau'
 end
$$;

drop view if exists v_thong_ke_thang;
drop view if exists v_ket_qua_tran;
drop view if exists v_thong_ke_cau_thu;
drop view if exists v_cau_thu_thang;
drop view if exists v_phong_do;

create view v_ket_qua_tran with(security_invoker=on) as
select m.id match_id,m.season_id,m.ngay_thi_dau,m.doi_thu,m.dia_diem,m.ban_thua,count(g.id)::int ban_thang,
 case when public.trang_thai_tran_theo_ngay(m.ngay_thi_dau,m.trang_thai_thu_cong,m.ngay_chinh_trang_thai)<>'da_thi_dau' then null
      when count(g.id)>m.ban_thua then 'Thắng'
      when count(g.id)=m.ban_thua then 'Hòa'
      else 'Thua' end ket_qua,
 public.trang_thai_tran_theo_ngay(m.ngay_thi_dau,m.trang_thai_thu_cong,m.ngay_chinh_trang_thai) trang_thai
from matches m left join goals g on g.match_id=m.id group by m.id;

create view v_thong_ke_cau_thu with(security_invoker=on) as
select p.id player_id,p.ho_ten,p.so_ao,p.vi_tri,p.anh_url,p.dang_hoat_dong,
 (select count(*) from match_players mp join matches m on m.id=mp.match_id where mp.player_id=p.id and public.trang_thai_tran_theo_ngay(m.ngay_thi_dau,m.trang_thai_thu_cong,m.ngay_chinh_trang_thai)='da_thi_dau')::int so_tran,
 (select count(*) from goals g join matches m on m.id=g.match_id where g.player_id=p.id and public.trang_thai_tran_theo_ngay(m.ngay_thi_dau,m.trang_thai_thu_cong,m.ngay_chinh_trang_thai)='da_thi_dau')::int ban_thang,
 (select count(*) from assists a join matches m on m.id=a.match_id where a.player_id=p.id and public.trang_thai_tran_theo_ngay(m.ngay_thi_dau,m.trang_thai_thu_cong,m.ngay_chinh_trang_thai)='da_thi_dau')::int kien_tao,
 (select count(*) from match_players mp join matches m on m.id=mp.match_id where mp.player_id=p.id and mp.la_xuat_sac_nhat and public.trang_thai_tran_theo_ngay(m.ngay_thi_dau,m.trang_thai_thu_cong,m.ngay_chinh_trang_thai)='da_thi_dau')::int xuat_sac
from players p;

create view v_thong_ke_thang with(security_invoker=on) as
select date_trunc('month',ngay_thi_dau)::date thang,count(*)::int so_tran,sum(ban_thang)::int ban_thang,sum(ban_thua)::int ban_thua,
 (count(*) filter(where ket_qua='Thắng'))::int thang_,(count(*) filter(where ket_qua='Hòa'))::int hoa,(count(*) filter(where ket_qua='Thua'))::int thua
from v_ket_qua_tran where trang_thai='da_thi_dau' group by 1 order by 1;

create view v_cau_thu_thang with(security_invoker=on) as
select mp.player_id,date_trunc('month',m.ngay_thi_dau)::date thang,count(distinct mp.match_id)::int so_tran,count(distinct g.id)::int ban_thang,count(distinct a.id)::int kien_tao
from match_players mp join matches m on m.id=mp.match_id
left join goals g on g.match_id=mp.match_id and g.player_id=mp.player_id
left join assists a on a.match_id=mp.match_id and a.player_id=mp.player_id
where public.trang_thai_tran_theo_ngay(m.ngay_thi_dau,m.trang_thai_thu_cong,m.ngay_chinh_trang_thai)='da_thi_dau'
group by 1,2;

create view v_phong_do with(security_invoker=on) as
select player_id,sum(diem)::int diem from(
 select mp.player_id,row_number() over(partition by mp.player_id order by m.ngay_thi_dau desc,m.id desc) rn,
 3*(select count(*) from goals g where g.match_id=mp.match_id and g.player_id=mp.player_id)+2*(select count(*) from assists a where a.match_id=mp.match_id and a.player_id=mp.player_id)+3*mp.la_xuat_sac_nhat::int diem
 from match_players mp join matches m on m.id=mp.match_id
 where public.trang_thai_tran_theo_ngay(m.ngay_thi_dau,m.trang_thai_thu_cong,m.ngay_chinh_trang_thai)='da_thi_dau'
) t where rn<=5 group by 1;

grant select on v_ket_qua_tran,v_thong_ke_thang,v_thong_ke_cau_thu,v_cau_thu_thang,v_phong_do to anon,authenticated;
grant execute on function trang_thai_tran_theo_ngay(date,text,date) to anon,authenticated;

create or replace function save_match(p jsonb) returns bigint language plpgsql set search_path=public as $$
declare mid bigint;x jsonb;gid bigint;match_date date;status_value text;override_value text;override_date date;
begin
 if not is_admin() then raise exception 'Bạn không có quyền thực hiện thao tác này';end if;
 match_date:=(p->>'ngay_thi_dau')::date;
 status_value:=coalesce(p->>'trang_thai','chua_thi_dau');
 override_value:=nullif(p->>'trang_thai_thu_cong','');
 override_date:=case when override_value is not null then coalesce((p->>'ngay_chinh_trang_thai')::date,(now() at time zone 'Asia/Ho_Chi_Minh')::date) else null end;
 if p->>'id' is null then
  insert into matches(season_id,ngay_thi_dau,doi_thu,dia_diem,ban_thua,trang_thai,trang_thai_thu_cong,ngay_chinh_trang_thai)
  values((p->>'season_id')::bigint,match_date,p->>'doi_thu',p->>'dia_diem',coalesce((p->>'ban_thua')::int,0),status_value,override_value,override_date) returning id into mid;
 else
  mid:=(p->>'id')::bigint;
  update matches set season_id=(p->>'season_id')::bigint,ngay_thi_dau=match_date,doi_thu=p->>'doi_thu',dia_diem=p->>'dia_diem',
   ban_thua=coalesce((p->>'ban_thua')::int,0),trang_thai=status_value,trang_thai_thu_cong=override_value,ngay_chinh_trang_thai=override_date where id=mid;
  delete from match_players where match_id=mid;
 end if;
 for x in select * from jsonb_array_elements(coalesce(p->'cau_thu','[]')) loop
  insert into match_players values(mid,(x->>'player_id')::bigint,coalesce((x->>'xuat_sac')::boolean,false));end loop;
 for x in select * from jsonb_array_elements(coalesce(p->'ban_thang','[]')) loop
  insert into goals(match_id,player_id,phut) values(mid,(x->>'player_id')::bigint,(x->>'phut')::int) returning id into gid;
  if x->>'kien_tao' is not null then insert into assists(goal_id,match_id,player_id) values(gid,mid,(x->>'kien_tao')::bigint);end if;
 end loop;
 return mid;
end$$;

insert into storage.buckets(id,name,public,file_size_limit)
values('player-photos','player-photos',true,20971520)
on conflict(id) do update set public=true,file_size_limit=20971520;
drop policy if exists "Admin upload player photos" on storage.objects;
create policy "Admin upload player photos" on storage.objects for insert to authenticated
 with check(bucket_id='player-photos' and public.is_admin());
drop policy if exists "Admin delete player photos" on storage.objects;
create policy "Admin delete player photos" on storage.objects for delete to authenticated
 using(bucket_id='player-photos' and public.is_admin());
