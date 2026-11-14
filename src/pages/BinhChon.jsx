import {useEffect,useState} from 'react';import {supabase} from '../lib/supabase';import {useAuth} from '../context/AuthContext';
const HM={thang:'Cầu thủ xuất sắc nhất tháng',nam:'Cầu thủ xuất sắc nhất năm',yeu_thich:'Cầu thủ được yêu thích nhất'};
const mo=k=>k.dang_mo&&new Date()>=new Date(k.bat_dau)&&new Date()<=new Date(k.ket_thuc);
export default function BinhChon(){
 const {vaiTro,user,khach}=useAuth();const cao=!khach&&vaiTro==='super_admin';
 const [kys,setKys]=useState([]),[cts,setCts]=useState([]),[da,setDa]=useState([]),[kq,setKq]=useState({}),[chon,setChon]=useState({}),[loi,setLoi]=useState(''),[m,setM]=useState({hang_muc:'thang',ten:'',bat_dau:'',ket_thuc:''});
 async function tai(){const [a,b,c]=await Promise.all([supabase.from('voting_periods').select('*').order('id',{ascending:false}),supabase.from('players').select('id,ho_ten').eq('dang_hoat_dong',true),supabase.from('votes').select('period_id')]);
  setKys(a.data||[]);setCts(b.data||[]);setDa((c.data||[]).map(x=>x.period_id));
  const r={};for(const k of a.data||[]){const {data}=await supabase.rpc('get_voting_results',{pid:k.id});r[k.id]=data||[]}setKq(r)}
 useEffect(()=>{tai()},[]);
 async function bo(k){setLoi('');if(!user)return setLoi('Không thể bình chọn lúc này. Hãy tải lại trang.');if(!chon[k.id])return setLoi('Hãy chọn một cầu thủ.');
  const {error}=await supabase.from('votes').insert({period_id:k.id,player_id:+chon[k.id]});
  if(error)setLoi(error.code==='23505'?'Bạn đã bình chọn trong kỳ này rồi.':'Không bình chọn được. Kỳ bình chọn có thể đã đóng hoặc hết hạn.');else tai()}
 async function tao(e){e.preventDefault();setLoi('');const {error}=await supabase.from('voting_periods').insert({...m,bat_dau:new Date(m.bat_dau).toISOString(),ket_thuc:new Date(m.ket_thuc).toISOString()});
  if(error)setLoi('Không tạo được: '+error.message);else{setM({...m,ten:''});tai()}}
 const doi=async k=>{await supabase.from('voting_periods').update({dang_mo:!k.dang_mo}).eq('id',k.id);tai()};
 return <div className="page"><h1>Bình chọn</h1><div className="nhan" style={{marginBottom:14}}>Mỗi thiết bị được bình chọn một lần cho mỗi kỳ.</div>{loi&&<div className="loi">{loi}</div>}
  {cao&&<form className="the hang" onSubmit={tao}><select value={m.hang_muc} onChange={e=>setM({...m,hang_muc:e.target.value})}>{Object.entries(HM).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select>
   <input placeholder="Tên kỳ (ví dụ: Tháng 11/2026)" value={m.ten} onChange={e=>setM({...m,ten:e.target.value})} required/>
   <input type="datetime-local" title="Bắt đầu" value={m.bat_dau} onChange={e=>setM({...m,bat_dau:e.target.value})} required/><input type="datetime-local" title="Kết thúc" value={m.ket_thuc} onChange={e=>setM({...m,ket_thuc:e.target.value})} required/><button>Tạo kỳ bình chọn</button></form>}
  {kys.map(k=><div className="the" key={k.id} style={{marginBottom:14}}><div style={{display:'flex',justifyContent:'space-between',gap:10,flexWrap:'wrap'}}><div><b>{k.ten}</b><div className="nhan">{HM[k.hang_muc]} · {new Date(k.bat_dau).toLocaleString('vi-VN')} đến {new Date(k.ket_thuc).toLocaleString('vi-VN')}</div></div>
   <div><span className="badge" style={mo(k)?{}:{background:'#333',color:'#aaa'}}>{mo(k)?'Đang mở':'Đã đóng'}</span> {cao&&<button className="phu" onClick={()=>doi(k)}>{k.dang_mo?'Đóng bình chọn':'Mở bình chọn'}</button>}</div></div>
   {mo(k)&&!da.includes(k.id)&&<div className="hang" style={{margin:'12px 0 0'}}><select value={chon[k.id]||''} onChange={e=>setChon({...chon,[k.id]:e.target.value})}><option value="">Chọn cầu thủ</option>{cts.map(c=><option key={c.id} value={c.id}>{c.ho_ten}</option>)}</select><button onClick={()=>bo(k)}>Bình chọn</button></div>}
   {da.includes(k.id)&&<div className="co" style={{marginTop:10}}>Bạn đã bình chọn trong kỳ này.</div>}
   <div style={{marginTop:12}}>{(kq[k.id]||[]).map(r=><div key={r.player_id} style={{marginBottom:8}}><div style={{display:'flex',justifyContent:'space-between',fontSize:14}}><span>{r.ho_ten}</span><span>{r.ty_le}% · {r.so_phieu} phiếu</span></div><div style={{height:6,background:'#0E1120',borderRadius:3}}><div style={{width:r.ty_le+'%',height:6,background:'#FF7A1A',borderRadius:3}}/></div></div>)}{!(kq[k.id]||[]).length&&<div className="nhan">Chưa có phiếu bầu.</div>}</div></div>)}
  {!kys.length&&<div className="nhan">Chưa có kỳ bình chọn nào.</div>}</div>}
