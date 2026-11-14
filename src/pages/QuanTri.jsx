import {useEffect,useState} from 'react';import {supabase,ngay} from '../lib/supabase';import {useAuth} from '../context/AuthContext';
const VR={member:'Thành viên',admin:'Quản trị viên',super_admin:'Quản trị viên cấp cao'};
const BANNER_BUCKET='match-banners',GIOI_HAN_BANNER=20*1024*1024;
const BANNER_TRAN=[
 {key:'match_banner_recent',label:'Banner trận gần nhất',fallback:'/san-van-tran-gan-nhat.jpg'},
 {key:'match_banner_upcoming',label:'Banner trận tiếp theo',fallback:'/san-van-tran-sap-toi.jpg'}
];
const DUOI_ANH={ 'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/avif':'avif' };
export default function QuanTri(){
 const {laAdmin,vaiTro,user,khach}=useAuth();const cao=!khach&&vaiTro==='super_admin';
 const [tk,setTk]=useState([]),[mua,setMua]=useState([]),[loi,setLoi]=useState(''),[m,setM]=useState({ten:'',ngay_bat_dau:'',ngay_ket_thuc:''});
 const [bannerUrls,setBannerUrls]=useState({}),[bannerFiles,setBannerFiles]=useState({}),[bannerPreview,setBannerPreview]=useState({}),[bannerLoi,setBannerLoi]=useState(''),[dangLuuBanner,setDangLuuBanner]=useState('');
 const tai=()=>{supabase.from('profiles').select('*').order('ho_ten').then(({data})=>setTk(data||[]));supabase.from('seasons').select('*').order('id',{ascending:false}).then(({data})=>setMua(data||[]))};
 useEffect(()=>{if(laAdmin)tai()},[laAdmin]);
 useEffect(()=>{if(!laAdmin)return;supabase.from('site_settings').select('setting_key,setting_value').in('setting_key',BANNER_TRAN.map(b=>b.key)).then(({data,error})=>{if(error)setBannerLoi('Không tải được cấu hình banner. Hãy chạy migration 013_quan_ly_banner_tran_dau.sql: '+error.message);else setBannerUrls(Object.fromEntries((data||[]).map(row=>[row.setting_key,row.setting_value])))})},[laAdmin]);
 useEffect(()=>{const urls=Object.fromEntries(Object.entries(bannerFiles).filter(([,file])=>file).map(([key,file])=>[key,URL.createObjectURL(file)]));setBannerPreview(urls);return()=>Object.values(urls).forEach(url=>URL.revokeObjectURL(url))},[bannerFiles]);
 if(!laAdmin)return <div className="page"><h1>Quản trị</h1><div className="loi">Bạn không có quyền truy cập khu vực này.</div></div>;
 const chay=async q=>{setLoi('');const {error}=await q;if(error)setLoi(error.code==='23503'?'Không thể xóa mùa giải vì còn dữ liệu liên kết. Hãy chạy supabase/009_sua_vi_tri_va_xoa_mua_giai.sql trong Supabase SQL Editor rồi thử lại.':'Không thực hiện được: '+error.message);else tai()};
 const them=e=>{e.preventDefault();chay(supabase.from('seasons').insert({ten:m.ten,ngay_bat_dau:m.ngay_bat_dau||null,ngay_ket_thuc:m.ngay_ket_thuc||null}));setM({ten:'',ngay_bat_dau:'',ngay_ket_thuc:''})};
 const kichHoat=async id=>{await supabase.from('seasons').update({dang_dien_ra:false}).eq('dang_dien_ra',true);chay(supabase.from('seasons').update({dang_dien_ra:true}).eq('id',id))};
 const chonBanner=(key,file)=>{setBannerLoi('');if(!file){setBannerFiles(prev=>({...prev,[key]:null}));return}if(!DUOI_ANH[file.type]){setBannerLoi('Chỉ nhận ảnh JPG, PNG, WebP hoặc AVIF.');return}if(file.size>GIOI_HAN_BANNER){setBannerLoi('Ảnh banner không được lớn hơn 20 MB.');return}setBannerFiles(prev=>({...prev,[key]:file}))};
 const duongDanBanner=url=>{const marker=`/storage/v1/object/public/${BANNER_BUCKET}/`;const index=url?.indexOf(marker)??-1;if(index<0)return null;try{return decodeURIComponent(url.slice(index+marker.length))}catch{return null}};
 const luuBanner=async key=>{
  const file=bannerFiles[key];if(!file)return setBannerLoi('Hãy chọn ảnh mới trước khi lưu.');
  setDangLuuBanner(key);setBannerLoi('');
  const extension=DUOI_ANH[file.type];
  const path=`${key}/${crypto.randomUUID()}.${extension}`;
  let uploaded=false;
  try{
   const {error:uploadError}=await supabase.storage.from(BANNER_BUCKET).upload(path,file,{cacheControl:'3600',upsert:false,contentType:file.type});
   if(uploadError)throw new Error(`Không tải được ảnh lên Supabase: ${uploadError.message}`);
   uploaded=true;
   const imageUrl=supabase.storage.from(BANNER_BUCKET).getPublicUrl(path).data.publicUrl;
   const {error:saveError}=await supabase.from('site_settings').upsert({setting_key:key,setting_value:imageUrl,updated_at:new Date().toISOString()},{onConflict:'setting_key'});
   if(saveError)throw new Error(`Không lưu được cấu hình ảnh: ${saveError.message}`);
   const oldPath=duongDanBanner(bannerUrls[key]);
   setBannerUrls(prev=>({...prev,[key]:imageUrl}));
   setBannerFiles(prev=>({...prev,[key]:null}));
   if(oldPath){const {error:removeError}=await supabase.storage.from(BANNER_BUCKET).remove([oldPath]);if(removeError)setBannerLoi(`Đã thay banner nhưng không xóa được ảnh cũ: ${removeError.message}`)}
  }catch(error){
   let message=error.message;
   if(uploaded){const {error:removeError}=await supabase.storage.from(BANNER_BUCKET).remove([path]);if(removeError)message+=`; không xóa được ảnh tải lên tạm: ${removeError.message}`}
   setBannerLoi('Không lưu được banner: '+message);
  }finally{setDangLuuBanner('')}
 };
 return <div className="page"><h1>Quản trị</h1>{loi&&<div className="loi">{loi}</div>}
  <section className="the admin-banner-settings"><h2>Ảnh banner trận đấu</h2><p className="nhan">Thay riêng ảnh nền cho thẻ trận gần nhất và trận tiếp theo. Nếu chưa đổi ảnh, hệ thống tiếp tục dùng hai banner gốc.</p>{bannerLoi&&<div className="loi">{bannerLoi}</div>}
   <div className="admin-banner-grid">{BANNER_TRAN.map(b=>{const selected=bannerFiles[b.key];return <div className="admin-banner-item" key={b.key}><b>{b.label}</b><img src={bannerPreview[b.key]||bannerUrls[b.key]||b.fallback} alt={`Xem trước ${b.label}`}/><label>Chọn ảnh (JPG, PNG, WebP, AVIF; tối đa 20 MB)<input key={`${b.key}-${selected?'selected':'empty'}`} type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={e=>chonBanner(b.key,e.target.files?.[0])}/></label><button type="button" disabled={!selected||dangLuuBanner===b.key} onClick={()=>luuBanner(b.key)}>{dangLuuBanner===b.key?'Đang lưu...':'Lưu banner'}</button></div>})}</div>
  </section>
  <div className="the" style={{marginBottom:18,overflowX:'auto'}}><b className="vang">Quản lý tài khoản</b><table><thead><tr><th>Họ tên</th><th>Vai trò</th></tr></thead><tbody>{tk.map(t=><tr key={t.id}><td>{t.ho_ten||'(chưa đặt tên)'}{t.id===user.id&&<span className="nhan"> (bạn)</span>}</td>
   <td>{cao&&t.id!==user.id?<select value={t.vai_tro} onChange={e=>chay(supabase.from('profiles').update({vai_tro:e.target.value}).eq('id',t.id))}>{Object.entries(VR).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select>:VR[t.vai_tro]}</td></tr>)}</tbody></table>
   {!cao&&<div className="nhan">Chỉ Quản trị viên cấp cao mới được đổi vai trò.</div>}</div>
  <div className="the" style={{overflowX:'auto'}}><b className="vang">Quản lý mùa giải</b>
   {cao&&<form className="hang" onSubmit={them} style={{marginTop:12}}><input placeholder="Tên mùa giải (ví dụ: Mùa 2026)" value={m.ten} onChange={e=>setM({...m,ten:e.target.value})} required/><input type="date" value={m.ngay_bat_dau} onChange={e=>setM({...m,ngay_bat_dau:e.target.value})}/><input type="date" value={m.ngay_ket_thuc} onChange={e=>setM({...m,ngay_ket_thuc:e.target.value})}/><button>Thêm mùa giải</button></form>}
   <table><tbody>{mua.map(s=><tr key={s.id}><td>{s.ten}</td><td>{s.ngay_bat_dau?ngay(s.ngay_bat_dau):''} {s.ngay_ket_thuc?'- '+ngay(s.ngay_ket_thuc):''}</td><td>{s.dang_dien_ra?<span className="badge">Đang diễn ra</span>:cao&&<button className="phu" onClick={()=>kichHoat(s.id)}>Đặt làm mùa hiện tại</button>}</td>
    <td>{cao&&<button className="nguy" onClick={()=>confirm('Xóa mùa giải này?')&&chay(supabase.from('seasons').delete().eq('id',s.id))}>Xóa</button>}</td></tr>)}</tbody></table>{!mua.length&&<div className="nhan">Chưa có mùa giải nào.</div>}</div></div>}
