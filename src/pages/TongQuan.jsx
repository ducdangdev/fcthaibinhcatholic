import {useEffect,useMemo,useState} from 'react';
import {Link} from 'react-router-dom';
import {ArrowRight,BarChart3,CalendarDays,MapPin,Medal,Star,Trophy,Users} from 'lucide-react';
import {supabase,ngay} from '../lib/supabase';
import Hero from '../components/Hero';
import CupIcon from '../components/CupIcon';
import {DOI} from '../constants/doiBong';
import {maViTri} from '../constants/viTri';
import {hienDiaDiem} from '../lib/diaDiem';

const BANNER_TRAN_MAC_DINH={ganNhat:'/san-van-tran-gan-nhat.jpg',sapToi:'/san-van-tran-sap-toi.jpg'};

export default function TongQuan(){
 const [buoi,setBuoi]=useState([]);
 const [ct,setCt]=useState([]);
 const [giai,setGiai]=useState([]);
 const [bannerTran,setBannerTran]=useState(BANNER_TRAN_MAC_DINH);
 const [loi,setLoi]=useState('');

 useEffect(()=>{
  let dangHien=true;
  async function tai(){
   const [a,b,d,banners]=await Promise.all([
    supabase.from('v_buoi_bong').select('*').order('ngay_thi_dau',{ascending:false}),
    supabase.from('v_thong_ke_cau_thu').select('*').eq('dang_hoat_dong',true),
    supabase.from('awards').select('*').order('nam',{ascending:false}).order('id',{ascending:false}),
    supabase.from('site_settings').select('setting_key,setting_value').in('setting_key',['match_banner_recent','match_banner_upcoming'])
   ]);
   if(!dangHien)return;
   const errors=[a.error,b.error,d.error].filter(Boolean);
   if(errors.length){const canLoaiThanhVien=errors.some(error=>error.message.includes('loai_thanh_vien'));setLoi(`Không tải được dữ liệu: ${errors.map(error=>error.message).join('; ')}. ${canLoaiThanhVien?'Hãy chạy migration 014_loai_thanh_vien_co_vu.sql trong Supabase SQL Editor.':'Hãy kiểm tra Supabase và chạy migration 008_lich_thi_dau.sql.'}`)}
   if(banners.error)setLoi(`Không tải được ảnh banner trận đấu: ${banners.error.message}. Hãy chạy migration 013_quan_ly_banner_tran_dau.sql trong Supabase SQL Editor.`);
   setBuoi(a.data||[]);
   setCt(b.data||[]);
   setGiai(d.data||[]);
   if(!banners.error){
    const saved=Object.fromEntries((banners.data||[]).map(item=>[item.setting_key,item.setting_value]));
    setBannerTran({
     ganNhat:saved.match_banner_recent||BANNER_TRAN_MAC_DINH.ganNhat,
     sapToi:saved.match_banner_upcoming||BANNER_TRAN_MAC_DINH.sapToi
    });
   }
  }
  tai();
  window.addEventListener('doi-bong:stats-updated',tai);
  const interval=setInterval(tai,60000);
  return ()=>{dangHien=false;clearInterval(interval);window.removeEventListener('doi-bong:stats-updated',tai)};
 },[]);

 const buoiDaKetThuc=useMemo(()=>buoi.filter(t=>t.trang_thai==='da_thi_dau'),[buoi]);
 const ganNhat=useMemo(()=>buoiDaKetThuc.slice().sort((a,b)=>b.ngay_thi_dau.localeCompare(a.ngay_thi_dau))[0],[buoiDaKetThuc]);
 const sapToi=useMemo(()=>buoi.filter(t=>t.trang_thai==='dang_thi_dau'||t.trang_thai==='chua_thi_dau').sort((a,b)=>a.trang_thai===b.trang_thai?a.ngay_thi_dau.localeCompare(b.ngay_thi_dau):a.trang_thai==='dang_thi_dau'?-1:1)[0],[buoi]);
 const buoiMua=buoiDaKetThuc;
 const tongBanThang=buoiMua.reduce((sum,t)=>sum+(Number(t.ban_thang)||0),0);
 const soTranThangMua=buoiMua.filter(t=>Number(t.ban_thang)>Number(t.ban_thua)).length;
 const soTranHoaMua=buoiMua.filter(t=>Number(t.ban_thang)===Number(t.ban_thua)).length;
 const soTranThuaMua=buoiMua.filter(t=>Number(t.ban_thang)<Number(t.ban_thua)).length;
 const vuaPhat=ct.slice().sort((a,b)=>b.ban_thang-a.ban_thang)[0];
 const dsVuaPhat=vuaPhat?.ban_thang>0?ct.filter(c=>Number(c.ban_thang)===Number(vuaPhat.ban_thang)).sort((a,b)=>a.ho_ten.localeCompare(b.ho_ten)):[];
 const danhHieu=giai[0];
 const dsThanhTich=ct.slice().sort((a,b)=>b.ban_thang-a.ban_thang||b.so_tran-a.so_tran||a.ho_ten.localeCompare(b.ho_ten));
 const dsThanhTichHienThi=dsThanhTich.slice(0,4);
 const dsNoiBat=ct.slice().sort((a,b)=>b.ban_thang-a.ban_thang||b.so_tran-a.so_tran).slice(0,3);

 function BuoiCard({buoi:tr,tuongLai=false,className='',banner=''}){
  const status=tr?.trang_thai==='dang_thi_dau'?'Đang diễn ra':tr?.trang_thai==='da_thi_dau'?'Đã kết thúc':'Sắp diễn ra';
  return <section className={`panel match-card ${className}`}>
   <div className="panel-title"><span><CalendarDays size={19}/>{tuongLai?'Trận tiếp theo':'Trận gần nhất'}</span><Link to="/tran-dau">{tuongLai?'Lịch thi đấu':'Chi tiết'} <ArrowRight size={14}/></Link></div>
   <img className="match-banner-image" src={banner} alt="" aria-hidden="true"/>
   {tr?<><div className={`session-feature${tuongLai?' is-upcoming':''}`}>
    <div className="session-team-mark"><img src="/logo.jpg" alt={DOI.ten}/><b>THÁI BÌNH</b></div>
   <div className={`session-feature-center${tuongLai?' is-upcoming':''}`}>{tuongLai?<><strong>{ngay(tr.ngay_thi_dau)}</strong><span>TRẬN TIẾP THEO</span><b className="match-vs">VS</b><small className={`match-status-badge match-status-${tr.trang_thai==='dang_thi_dau'?'live':'upcoming'}`}>{status}</small></>:<>
     <strong>{tr.ban_thang} <i>–</i> {tr.ban_thua}</strong><span>KẾT QUẢ TRẬN ĐẤU</span>
    </>}</div>
    <div className="session-side-mark">{tr.logo_doi_thu_url?<img src={tr.logo_doi_thu_url} alt={tr.doi_thu}/>:<span className="opponent-fc">FC</span>}<b title={tr.doi_thu}>{tr.doi_thu?.toUpperCase()}</b></div>
   </div><div className={`session-meta${tuongLai?' has-location':''}`}>
    {tuongLai?<>{tr.dia_diem&&<span><MapPin size={14}/>{hienDiaDiem(tr.dia_diem)}</span>}</>:<span><CalendarDays size={14}/>{ngay(tr.ngay_thi_dau)}</span>}
   </div></>:<div className="session-empty">{tuongLai?'Chưa có trận đấu sắp tới':'Chưa có dữ liệu trận đấu'}</div>}
  </section>
 }

 return <div className="page dashboard">
  <Hero soTran={buoiDaKetThuc.length} banThang={buoiDaKetThuc.reduce((sum,t)=>sum+t.ban_thang,0)}/>
  <section className="panel team-info-card" aria-labelledby="team-info-title">
   <div className="team-info-logo-wrap"><img className="team-info-logo" src="/logo.jpg" alt={`Logo ${DOI.ten} ${DOI.tenPhu}`}/></div>
   <div className="team-info-details">
    <div className="team-info-heading"><CupIcon size={22}/><h2 id="team-info-title">Thông tin đội bóng</h2></div>
    <h3>{DOI.ten} {DOI.tenPhu}</h3>
    <div className="team-info-stats">
     <span><Users size={16}/>Số cầu thủ: <b>{ct.length}</b></span>
     <span><CalendarDays size={16}/>Số trận đã đấu: <b>{buoiDaKetThuc.length}</b></span>
     <span><Trophy size={16}/>Tổng số bàn thắng: <b>{buoiDaKetThuc.reduce((sum,t)=>sum+t.ban_thang,0)}</b></span>
    </div>
   </div>
  </section>
  {loi&&<div className="loi">{loi}</div>}
  <div className="dashboard-layout">
   <div className="dashboard-main">
    <div className="match-grid"><BuoiCard buoi={ganNhat} className="recent-match" banner={bannerTran.ganNhat}/><BuoiCard buoi={sapToi} tuongLai className="upcoming-match" banner={bannerTran.sapToi}/></div>
    <div className="lower-grid">
     <section className="panel season-card">
      <div className="panel-title"><span><BarChart3 size={19}/>Tổng kết mùa giải</span><span className="season-name">Toàn thời gian</span></div>
      <div className="season-summary">
       <div className="season-record-ring" role="img" aria-label={`${buoiMua.length} trận: ${soTranThangMua} thắng, ${soTranHoaMua} hòa, ${soTranThuaMua} thua`}>
        <svg className="season-record-chart" viewBox="0 0 120 120" aria-hidden="true">
         {buoiMua.length?(()=>{const circumference=2*Math.PI*50;let offset=0;return [[soTranThangMua,'#2e7d4f'],[soTranHoaMua,'#bec1c9'],[soTranThuaMua,'#c0392b']].filter(([count])=>count>0).map(([count,color])=>{const length=circumference*count/buoiMua.length;const dashoffset=-offset;offset+=length;return <circle key={color} cx="60" cy="60" r="50" fill="none" stroke={color} strokeWidth="12" strokeDasharray={`${length} ${circumference}`} strokeDashoffset={dashoffset}/>})})():<circle cx="60" cy="60" r="50" fill="none" stroke="#e8e9ed" strokeWidth="12"/>}
        </svg>
        <div><b>{buoiMua.length}</b><small>Trận đấu</small></div>
       </div>
       <div className="season-results">
        <div><i className="result-dot win"/>Thắng <b>{soTranThangMua}</b></div>
        <div><i className="result-dot draw"/>Hòa <b>{soTranHoaMua}</b></div>
        <div><i className="result-dot loss"/>Thua <b>{soTranThuaMua}</b></div>
        <div><i className="result-dot goals"/>Bàn thắng <b>{tongBanThang}</b></div>
       </div>
      </div>
      <div className="season-foot"><span><CalendarDays size={17}/><b>{buoiDaKetThuc.length}</b> trận đã đấu</span><span><Users size={17}/><b>{ct.length}</b> thành viên</span></div>
     </section>
     <section className="panel squad-card">
      <div className="panel-title"><span><Users size={19}/>Thành viên nổi bật</span><Link to="/cau-thu">Xem tất cả <ArrowRight size={14}/></Link></div>
      <div className="featured-players">{dsNoiBat.map(c=><Link className="player-tile" to="/cau-thu" key={c.player_id}>
       <div className="player-photo">{c.anh_url?<img src={c.anh_url} alt={c.ho_ten}/>:<div className="player-initial">{c.ho_ten?.[0]}</div>}</div>
       <b>{c.ho_ten}</b><small>{c.vi_tri?`${maViTri(c.vi_tri)||''} · ${c.vi_tri}`:(c.loai_thanh_vien==='co_vu'?'Cổ động viên':'Thành viên')}</small><div className="player-stat"><Star size={13}/>{c.loai_thanh_vien==='co_vu'?`${c.so_tran} trận`:`${c.ban_thang} bàn`}</div>
      </Link>)}
      {!dsNoiBat.length&&<div className="empty-match">Chưa có dữ liệu thành viên</div>}</div>
     </section>
    </div>
   </div>
   <section className="panel ranking-card home-personal-ranking">
    <div className="panel-title"><span><CupIcon size={20}/>Thành tích cá nhân</span><Link to="/bang-xep-hang">Xem tất cả <ArrowRight size={14}/></Link></div>
    <div className="home-ranking-total">Tổng số trận đã đấu: <b>{buoiDaKetThuc.length}</b></div>
    <div className="home-ranking-table">
     <div className="home-ranking-head"><span>Xếp hạng</span><span>Tên thành viên</span><span>Số trận có mặt</span><span>Bàn thắng</span></div>
     {dsThanhTichHienThi.map((c,i)=><div className={`home-ranking-row${i===0?' is-top':''}`} key={c.player_id}>
      <span className={`home-ranking-number${i<3?` top-${i+1}`:''}`}>{i+1}</span>
      <span className="home-ranking-player">{c.anh_url?<img src={c.anh_url} alt="" loading="lazy"/>:<span className="home-ranking-avatar">{c.ho_ten?.[0]||'?'}</span>}<b>{c.ho_ten}</b></span>
      <b className="home-ranking-stat appearances" aria-label={`${c.so_tran} trận có mặt`}>{c.so_tran}</b><b className="home-ranking-stat goals">{c.ban_thang}</b>
     </div>)}
     {!dsThanhTich.length&&<div className="empty-match">Chưa có thống kê</div>}
    </div>
   </section>
   <aside className="dashboard-side">
    <section className="panel attendance-highlight">
     <div className="panel-title"><span><img className="top-scorer-shoe" src="/top-scorer-shoe-cutout.png" alt="" aria-hidden="true"/>Vua phá lưới</span><Link to="/bang-xep-hang">Thành tích <ArrowRight size={14}/></Link></div>
     {dsVuaPhat.length?<div className="attendance-highlight-list">{dsVuaPhat.map(c=><div className="attendance-highlight-body" key={c.player_id}>
      {c.anh_url?<img src={c.anh_url} alt={c.ho_ten}/>:<span className="attendance-highlight-avatar">{c.ho_ten?.[0]}</span>}
      <div><b>{c.ho_ten}</b><small>{c.ban_thang} bàn thắng</small></div>
     </div>)}</div>:<div className="empty-match">Chưa có dữ liệu bàn thắng.</div>}
    </section>
    <section className={`panel award-card${danhHieu?.ten_giai==='Quả bóng vàng đội bóng'?' award-card-golden':''}`}>
     <div className="panel-title"><span><img className="award-heading-icon" src="/danh-hieu-tieu-bieu.png" alt="" aria-hidden="true"/>Danh hiệu tiêu biểu</span><Link to="/danh-hieu">Tất cả <ArrowRight size={14}/></Link></div>
     {danhHieu?<div className="award-detail"><div className={`award-icon${danhHieu.ten_giai==='Quả bóng vàng đội bóng'?' award-icon-photo':''}`}>{danhHieu.ten_giai==='Quả bóng vàng đội bóng'?<img src="/qua-bong-vang.png" alt="Cầu thủ nâng cúp vàng"/>:<Trophy size={38}/>}</div><div><b>{danhHieu.ten_giai}</b><small>{danhHieu.nam} · {danhHieu.thanh_tich||danhHieu.player_id}</small></div></div>
     :<div className="award-detail"><div className="award-icon"><Medal size={38}/></div><div><b>{vuaPhat?.ho_ten||'Cùng tạo nên dấu ấn'}</b><small>{vuaPhat?`${vuaPhat.ban_thang} bàn thắng`:'Danh hiệu cuối năm sẽ được cập nhật tại đây'}</small></div></div>}
    </section>
   </aside>
  </div>
 </div>
}
