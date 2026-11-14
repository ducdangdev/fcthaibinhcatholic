-- Chạy trong SQL Editor. Cho phép người chưa đăng nhập xem dữ liệu; chỉ quản trị viên mới sửa được.
do $$ declare t text; begin
foreach t in array array['players','matches','match_players','goals','assists','seasons','awards','voting_periods'] loop
 execute format('create policy xem_cong_khai on %I for select to anon using(true)',t);
 execute format('grant select on %I to anon',t);
end loop; end $$;
grant select on v_ket_qua_tran,v_thong_ke_cau_thu,v_thong_ke_thang,v_cau_thu_thang,v_phong_do to anon;
grant execute on function get_voting_results(bigint) to anon,authenticated;
-- Khách vào web được đăng nhập ẩn danh để bình chọn (mỗi thiết bị 1 phiếu/kỳ); không tạo hồ sơ cho khách.
create or replace function handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin if coalesce(new.is_anonymous,false) then return new; end if;
insert into profiles(id,ho_ten) values(new.id,new.raw_user_meta_data->>'ho_ten'); return new; end$$;
