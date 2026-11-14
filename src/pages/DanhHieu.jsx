import {useEffect,useState} from 'react';import {supabase} from '../lib/supabase';import {useAuth} from '../context/AuthContext';
const GIAI=['Quả bóng vàng đội bóng','Vua phá lưới','Cầu thủ thi đấu nổi bật','Cầu thủ tiến bộ nhất','Cầu thủ cống hiến nhất'];
export default function DanhHieu(){
 const {vaiTro,khach}=useAuth();const cao=!khach&&vaiTro==='super_admin';const [ds,setDs]=useState([]),[cts,setCts]=useState([]),[mua,setMua]=useState([]),[loi,setLoi]=useState('');
 const [f,setF]=useState({player_id:'',ten_giai:GIAI[0],nam:new Date().getFullYear(),season_id:'',thanh_tich:''});
 const tai=()=>supabase.from('awards').select('*,player:players(ho_ten,anh_url),season:seasons(ten)').order('nam',{ascending:false}).then(({data})=>setDs(data||[]));
 useEffect(()=>{tai();supabase.from('players').select('id,ho_ten').then(({data})=>setCts(data||[]));supabase.from('seasons').select('*').then(({data})=>setMua(data||[]))},[]);
 async function them(e){e.preventDefault();setLoi('');const {error}=await supabase.from('awards').insert({...f,player_id:+f.player_id,nam:+f.nam,season_id:f.season_id||null});if(error)setLoi('Không thêm được: '+error.message);else{setF({...f,thanh_tich:''});tai()}}
 const xoa=async a=>{if(confirm('Xóa danh hiệu này?')){await supabase.from('awards').delete().eq('id',a.id);tai()}};
 return <div className="page"><h1>Danh hiệu</h1>{loi&&<div className="loi">{loi}</div>}
  {cao&&<form className="the hang" onSubmit={them}><select value={f.player_id} onChange={e=>setF({...f,player_id:e.target.value})} required><option value="">Chọn thành viên</option>{cts.map(c=><option key={c.id} value={c.id}>{c.ho_ten}</option>)}</select>
   <select value={f.ten_giai} onChange={e=>setF({...f,ten_giai:e.target.value})}>{GIAI.map(g=><option key={g}>{g}</option>)}</select><input type="number" style={{width:100}} value={f.nam} onChange={e=>setF({...f,nam:e.target.value})} required/>
   <select value={f.season_id} onChange={e=>setF({...f,season_id:e.target.value})}><option value="">Mùa giải</option>{mua.map(m=><option key={m.id} value={m.id}>{m.ten}</option>)}</select>
   <input placeholder="Thành tích nổi bật" value={f.thanh_tich} onChange={e=>setF({...f,thanh_tich:e.target.value})}/><button>Trao danh hiệu</button></form>}
  <div className="grid award-list">{ds.map(a=><div className="the award-list-card" key={a.id}>
   {a.player?.anh_url?<img src={a.player.anh_url} className="award-player-photo" alt={`Ảnh ${a.player?.ho_ten||'thành viên'}`}/>:<div className="award-player-photo award-player-placeholder">{a.player?.ho_ten?.[0]||'?'}</div>}
   <div className="vang award-name">{a.ten_giai}</div><div className="award-player-name">{a.player?.ho_ten}</div><div className="nhan">{a.season?.ten?a.season.ten+' · ':''}Năm {a.nam}</div>{a.thanh_tich&&<div className="award-achievement">{a.thanh_tich}</div>}
   {cao&&<button className="nguy" style={{marginTop:10}} onClick={()=>xoa(a)}>Xóa</button>}</div>)}</div>{!ds.length&&<div className="nhan">Chưa có danh hiệu nào.</div>}</div>}
