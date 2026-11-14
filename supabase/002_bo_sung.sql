-- Chạy file này trong SQL Editor SAU file 001.
create view v_cau_thu_thang with(security_invoker=on) as
select mp.player_id,date_trunc('month',m.ngay_thi_dau)::date thang,count(distinct mp.match_id)::int so_tran,count(distinct g.id)::int ban_thang,count(distinct a.id)::int kien_tao
from match_players mp join matches m on m.id=mp.match_id and m.trang_thai='da_thi_dau'
left join goals g on g.match_id=mp.match_id and g.player_id=mp.player_id
left join assists a on a.match_id=mp.match_id and a.player_id=mp.player_id group by 1,2;
-- Phong độ = 3*bàn thắng + 2*kiến tạo + 3*xuất sắc nhất trận, tính trên 5 trận gần nhất. Đổi hệ số ngay trong view này.
create view v_phong_do with(security_invoker=on) as
select player_id,sum(diem)::int diem from(
 select mp.player_id,row_number() over(partition by mp.player_id order by m.ngay_thi_dau desc,m.id desc) rn,
 3*(select count(*) from goals g where g.match_id=mp.match_id and g.player_id=mp.player_id)+2*(select count(*) from assists a where a.match_id=mp.match_id and a.player_id=mp.player_id)+3*mp.la_xuat_sac_nhat::int diem
 from match_players mp join matches m on m.id=mp.match_id where m.trang_thai='da_thi_dau') t where rn<=5 group by 1;
