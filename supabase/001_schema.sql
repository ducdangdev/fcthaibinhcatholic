-- Chạy toàn bộ file này trong Supabase > SQL Editor.
create table seasons(id bigint generated always as identity primary key,ten text not null,ngay_bat_dau date,ngay_ket_thuc date,dang_dien_ra boolean default false);
create unique index mot_mua_dien_ra on seasons(dang_dien_ra) where dang_dien_ra;
create table profiles(id uuid primary key references auth.users on delete cascade,ho_ten text,vai_tro text not null default 'member' check(vai_tro in('member','admin','super_admin')));
create table players(id bigint generated always as identity primary key,ho_ten text not null,so_ao int,vi_tri text check(vi_tri in('Thủ môn','Hậu vệ','Trung vệ thòng','Hậu vệ cánh phải','Hậu vệ cánh trái','Tiền vệ','Tiền vệ phòng ngự','Tiền vệ trung tâm','Tiền vệ tấn công','Tiền vệ cánh phải','Tiền vệ cánh trái','Tiền đạo','Tiền đạo cánh phải','Tiền đạo cánh trái','Tiền đạo lùi','Tiền đạo cắm','Đa năng')),anh_url text,dang_hoat_dong boolean default true);
create table matches(id bigint generated always as identity primary key,season_id bigint references seasons on delete set null,ngay_thi_dau date not null,doi_thu text not null,logo_doi_thu_url text,dia_diem text,ban_thua int not null default 0 check(ban_thua>=0),trang_thai text not null default 'chua_thi_dau' check(trang_thai in('chua_thi_dau','dang_thi_dau','da_thi_dau')));
create table match_players(match_id bigint references matches on delete cascade,player_id bigint references players on delete restrict,la_xuat_sac_nhat boolean not null default false,primary key(match_id,player_id));
create unique index mot_xuat_sac_moi_tran on match_players(match_id) where la_xuat_sac_nhat;
create table goals(id bigint generated always as identity primary key,match_id bigint not null,player_id bigint not null,phut int,foreign key(match_id,player_id) references match_players(match_id,player_id) on delete cascade);
create table assists(id bigint generated always as identity primary key,goal_id bigint unique not null references goals on delete cascade,match_id bigint not null,player_id bigint not null,foreign key(match_id,player_id) references match_players(match_id,player_id) on delete cascade);
create table voting_periods(id bigint generated always as identity primary key,hang_muc text not null check(hang_muc in('thang','nam','yeu_thich')),ten text not null,bat_dau timestamptz not null,ket_thuc timestamptz not null,dang_mo boolean not null default true);
create table votes(id bigint generated always as identity primary key,period_id bigint not null references voting_periods on delete cascade,voter_id uuid not null default auth.uid() references auth.users on delete cascade,player_id bigint not null references players,tao_luc timestamptz default now(),unique(period_id,voter_id));
create table awards(id bigint generated always as identity primary key,player_id bigint not null references players,season_id bigint references seasons on delete set null,ten_giai text not null,nam int not null,thanh_tich text);

create function vai_tro_hien_tai() returns text language sql security definer stable set search_path=public as $$select vai_tro from profiles where id=auth.uid()$$;
create function is_admin() returns boolean language sql security definer stable set search_path=public as $$select coalesce(vai_tro_hien_tai() in('admin','super_admin'),false)$$;
create function is_super_admin() returns boolean language sql security definer stable set search_path=public as $$select coalesce(vai_tro_hien_tai()='super_admin',false)$$;
create function handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$begin insert into profiles(id,ho_ten) values(new.id,new.raw_user_meta_data->>'ho_ten');return new;end$$;
create trigger khi_tao_tai_khoan after insert on auth.users for each row execute function handle_new_user();

do $$ declare t text; begin
foreach t in array array['players','matches','match_players','goals','assists'] loop
 execute format('alter table %I enable row level security',t);
 execute format('create policy xem on %I for select to authenticated using(true)',t);
 execute format('create policy ghi on %I for all to authenticated using(is_admin()) with check(is_admin())',t);
end loop;
foreach t in array array['seasons','awards','voting_periods'] loop
 execute format('alter table %I enable row level security',t);
 execute format('create policy xem on %I for select to authenticated using(true)',t);
 execute format('create policy ghi on %I for all to authenticated using(is_super_admin()) with check(is_super_admin())',t);
end loop; end $$;
alter table profiles enable row level security;
create policy xem on profiles for select to authenticated using(id=auth.uid() or is_admin());
create policy sua_cua_minh on profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid() and vai_tro=vai_tro_hien_tai());
create policy cap_cao on profiles for all to authenticated using(is_super_admin()) with check(is_super_admin());
alter table votes enable row level security;
create policy xem_phieu_cua_minh on votes for select to authenticated using(voter_id=auth.uid());
create policy bo_phieu on votes for insert to authenticated with check(voter_id=auth.uid() and exists(select 1 from voting_periods v where v.id=period_id and v.dang_mo and now() between v.bat_dau and v.ket_thuc));

create view v_ket_qua_tran with(security_invoker=on) as
select m.id match_id,m.season_id,m.ngay_thi_dau,m.doi_thu,m.dia_diem,m.ban_thua,count(g.id)::int ban_thang,
 case when m.trang_thai<>'da_thi_dau' then null when count(g.id)>m.ban_thua then 'Thắng' when count(g.id)=m.ban_thua then 'Hòa' else 'Thua' end ket_qua,m.trang_thai
from matches m left join goals g on g.match_id=m.id group by m.id;
create view v_thong_ke_cau_thu with(security_invoker=on) as
select p.id player_id,p.ho_ten,p.so_ao,p.vi_tri,p.anh_url,p.dang_hoat_dong,
 (select count(*) from match_players mp join matches m on m.id=mp.match_id where mp.player_id=p.id and m.trang_thai='da_thi_dau')::int so_tran,
 (select count(*) from goals g join matches m on m.id=g.match_id where g.player_id=p.id and m.trang_thai='da_thi_dau')::int ban_thang,
 (select count(*) from match_players mp join matches m on m.id=mp.match_id where mp.player_id=p.id and mp.la_xuat_sac_nhat and m.trang_thai='da_thi_dau')::int xuat_sac
from players p;
create view v_thong_ke_thang with(security_invoker=on) as
select date_trunc('month',ngay_thi_dau)::date thang,count(*)::int so_tran,sum(ban_thang)::int ban_thang,sum(ban_thua)::int ban_thua,
 (count(*) filter(where ket_qua='Thắng'))::int thang_,(count(*) filter(where ket_qua='Hòa'))::int hoa,(count(*) filter(where ket_qua='Thua'))::int thua
from v_ket_qua_tran where trang_thai='da_thi_dau' group by 1 order by 1;

create function get_voting_results(pid bigint) returns table(player_id bigint,ho_ten text,so_phieu int,ty_le numeric) language sql security definer set search_path=public as $$
select p.id,p.ho_ten,count(v.id)::int,round(100.0*count(v.id)/nullif(sum(count(v.id)) over(),0),1) from votes v join players p on p.id=v.player_id where v.period_id=pid group by p.id,p.ho_ten order by 3 desc$$;

create function save_match(p jsonb) returns bigint language plpgsql set search_path=public as $$
declare mid bigint;x jsonb;gid bigint;
begin
 if not is_admin() then raise exception 'Bạn không có quyền thực hiện thao tác này';end if;
 if p->>'id' is null then
  insert into matches(season_id,ngay_thi_dau,doi_thu,dia_diem,ban_thua,trang_thai) values((p->>'season_id')::bigint,(p->>'ngay_thi_dau')::date,p->>'doi_thu',p->>'dia_diem',coalesce((p->>'ban_thua')::int,0),coalesce(p->>'trang_thai','chua_thi_dau')) returning id into mid;
 else
  mid:=(p->>'id')::bigint;
  update matches set season_id=(p->>'season_id')::bigint,ngay_thi_dau=(p->>'ngay_thi_dau')::date,doi_thu=p->>'doi_thu',dia_diem=p->>'dia_diem',ban_thua=coalesce((p->>'ban_thua')::int,0),trang_thai=coalesce(p->>'trang_thai','chua_thi_dau') where id=mid;
  delete from match_players where match_id=mid;
 end if;
 for x in select * from jsonb_array_elements(coalesce(p->'cau_thu','[]')) loop
  insert into match_players values(mid,(x->>'player_id')::bigint,coalesce((x->>'xuat_sac')::boolean,false));end loop;
 for x in select * from jsonb_array_elements(coalesce(p->'ban_thang','[]')) loop
  insert into goals(match_id,player_id,phut) values(mid,(x->>'player_id')::bigint,(x->>'phut')::int) returning id into gid;
 end loop;
 return mid;
end$$;
-- Nâng quyền Quản trị viên cấp cao (làm 1 lần, thay email của bạn):
-- update profiles set vai_tro='super_admin' where id=(select id from auth.users where email='email-cua-ban@gmail.com');
