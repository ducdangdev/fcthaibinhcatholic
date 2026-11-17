import {useEffect,useMemo,useState} from 'react';
import {supabase} from '../lib/supabase';

export default function BangXepHang(){
 const [ds,setDs]=useState([]),[tongSoTran,setTongSoTran]=useState(0),[loi,setLoi]=useState('');
 useEffect(()=>{
  let dangHien=true;
  async function tai(){
   const [cauThu,tranDau]=await Promise.all([
    supabase.from('v_thong_ke_cau_thu').select('*').eq('dang_hoat_dong',true),
    supabase.from('v_buoi_bong').select('match_id',{count:'exact',head:true}).eq('trang_thai','da_thi_dau')
   ]);
   if(!dangHien)return;
   const loiTai=[];
   if(cauThu.error)loiTai.push(`thành tích cá nhân: ${cauThu.error.message}`);
   if(tranDau.error)loiTai.push(`tổng số trận: ${tranDau.error.message}`);
   setLoi(loiTai.length?`Không tải được ${loiTai.join('; ')}.${cauThu.error?.message.includes('loai_thanh_vien')?' Hãy chạy migration 014_loai_thanh_vien_co_vu.sql trong Supabase SQL Editor.':''}`:'');
   setDs(cauThu.data||[]);
   setTongSoTran(tranDau.count||0);
  }
  tai();
  window.addEventListener('doi-bong:stats-updated',tai);
  return()=>{dangHien=false;window.removeEventListener('doi-bong:stats-updated',tai)};
 },[]);
 const xepHang=useMemo(()=>ds.slice().sort((a,b)=>
  b.ban_thang-a.ban_thang||b.so_tran-a.so_tran||a.ho_ten.localeCompare(b.ho_ten)
 ),[ds]);

 return <div className="page">
  <h1>Thành tích cá nhân</h1>
  {loi&&<div className="loi">{loi}</div>}
  <div className="personal-ranking-summary">Tổng số trận đấu: <b>{tongSoTran}</b></div>
  <section className="the personal-ranking">
   <div className="personal-ranking-title"><span>Xếp hạng</span><span>Tên thành viên</span><span>Số trận có mặt</span><span>Bàn thắng</span></div>
   <div className="personal-ranking-list">
    {xepHang.map((c,i)=><div className={`personal-ranking-row${i===0?' is-top':''}`} key={c.player_id}>
     <span className={`personal-ranking-number${i<3?` top-${i+1}`:''}`}>{i+1}</span>
     <span className="personal-ranking-player">
      {c.anh_url?<img src={c.anh_url} alt="" loading="lazy"/>:<span className="personal-ranking-avatar">{c.ho_ten?.[0]||'?'}</span>}
      <b>{c.ho_ten}</b>
     </span>
     <b className="personal-ranking-stat">{c.so_tran}</b>
     <b className="personal-ranking-stat goals">{c.ban_thang}</b>
    </div>)}
    {!xepHang.length&&!loi&&<div className="personal-ranking-empty">Chưa có dữ liệu thành tích.</div>}
   </div>
  </section>
 </div>;
}
