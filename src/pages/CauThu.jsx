import {useEffect,useState} from 'react';
import {supabase} from '../lib/supabase';
import {useAuth} from '../context/AuthContext';
import {chuanHoaViTri,maViTri,VI_TRI} from '../constants/viTri';

const VT=VI_TRI.map(v=>v.ten);
const BUCKET='player-photos';
const MAX_SOURCE_IMAGE_SIZE=50*1024*1024;
const MAX_STORED_IMAGE_SIZE=20*1024*1024;
const IMAGE_EXTENSION=/\.(jpe?g|png|webp|gif|bmp|avif)$/i;
const rong=()=>({ho_ten:'',so_ao:'',vi_tri:'Tiền vệ trung tâm',anh_url:'',loai_thanh_vien:'cau_thu'});

function taiAnh(file){
 return new Promise((resolve,reject)=>{
  const url=URL.createObjectURL(file),image=new Image();
  image.onload=()=>{URL.revokeObjectURL(url);resolve(image)};
  image.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('Trình duyệt không đọc được ảnh này. Nếu ảnh tải từ Drive có đuôi .CR2, hãy chuyển hoặc xuất ảnh sang JPG/PNG rồi tải lên lại.'))};
  image.src=url;
 });
}

async function toiUuAnh(file){
 let bitmap,loiBitmap;
 if(typeof createImageBitmap==='function'){
  try{bitmap=await createImageBitmap(file)}catch(error){loiBitmap=error}
 }
 let image=bitmap;
 if(!image){
  try{image=await taiAnh(file)}catch(error){
   if(loiBitmap)throw new Error(`${error.message} (${loiBitmap.message})`);
   throw error;
  }
 }
 const scale=Math.min(1,1600/Math.max(image.width,image.height));
 const canvas=document.createElement('canvas');
 canvas.width=Math.max(1,Math.round(image.width*scale));
 canvas.height=Math.max(1,Math.round(image.height*scale));
 const context=canvas.getContext('2d');
 if(!context){bitmap?.close();throw new Error('Không thể xử lý ảnh trên trình duyệt này.')}
 context.drawImage(image,0,0,canvas.width,canvas.height);
 bitmap?.close();
 return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('Không thể nén ảnh.')),'image/jpeg',0.82));
}

function docAnh(blob){
 return new Promise((resolve,reject)=>{
  const reader=new FileReader();
  reader.onload=()=>resolve(reader.result);
  reader.onerror=()=>reject(reader.error||new Error('Không thể đọc ảnh.'));
  reader.readAsDataURL(blob);
 });
}

export default function CauThu(){
 const {laAdmin}=useAuth();
 const [ds,setDs]=useState([]),[q,setQ]=useState(''),[vt,setVt]=useState(''),[f,setF]=useState(null),[anh,setAnh]=useState(null),[xemAnh,setXemAnh]=useState(''),[loi,setLoi]=useState(''),[dangLuu,setDangLuu]=useState(false);
 const tai=async()=>{const {data,error}=await supabase.from('v_thong_ke_cau_thu').select('player_id,ho_ten,so_ao,vi_tri,anh_url,so_tran,ban_thang,loai_thanh_vien').order('so_ao');if(error)setLoi(`Không tải được danh sách thành viên: ${error.message}${error.message.includes('loai_thanh_vien')?' Hãy chạy migration 014_loai_thanh_vien_co_vu.sql trong Supabase SQL Editor.':''}`);else setDs(data||[])};
 useEffect(()=>{tai()},[]);
 useEffect(()=>{if(!anh){setXemAnh(f?.anh_url||'');return}const url=URL.createObjectURL(anh);setXemAnh(url);return()=>URL.revokeObjectURL(url)},[anh,f?.anh_url]);

 function moThem(){setLoi('');setF(rong());setAnh(null)}
 function moSua(c){setLoi('');setF({id:c.player_id,ho_ten:c.ho_ten,so_ao:c.so_ao??'',vi_tri:chuanHoaViTri(c.vi_tri)||'Tiền vệ trung tâm',anh_url:c.anh_url||'',loai_thanh_vien:c.loai_thanh_vien||'cau_thu'});setAnh(null)}
 async function luu(e){
  e.preventDefault();if(!f)return;setLoi('');
  if(anh&&anh.size>MAX_SOURCE_IMAGE_SIZE){setLoi('Ảnh gốc không được lớn hơn 50 MB. Hãy giảm dung lượng ảnh rồi tải lên lại.');return}
  if(anh&&!(anh.type.startsWith('image/')||IMAGE_EXTENSION.test(anh.name))){setLoi('Vui lòng chọn ảnh JPG, PNG, WebP hoặc định dạng ảnh phổ biến khác. Ảnh RAW như .CR2 cần chuyển sang JPG/PNG trước.');return}
  setDangLuu(true);let duongDan='',daTaiLen=false;
  try{
   let anhUrl=f.anh_url||null;
   if(anh){
    const anhDaNen=await toiUuAnh(anh);
    if(anhDaNen.size>MAX_STORED_IMAGE_SIZE)throw new Error('Ảnh sau khi nén vẫn lớn hơn 20 MB. Hãy chọn ảnh khác hoặc giảm kích thước ảnh gốc.');
    duongDan=`players/${crypto.randomUUID()}.jpg`;
    const {error}=await supabase.storage.from(BUCKET).upload(duongDan,anhDaNen,{cacheControl:'3600',upsert:false,contentType:'image/jpeg'});
    if(error?.message?.toLowerCase().includes('bucket not found')){
     duongDan='';
     anhUrl=await docAnh(anhDaNen);
    }else if(error)throw new Error(`Không tải được ảnh lên kho Supabase: ${error.message}. Kiểm tra quyền quản trị và chạy migration 005 trong thư mục supabase.`);
    else{
     daTaiLen=true;
     anhUrl=supabase.storage.from(BUCKET).getPublicUrl(duongDan).data.publicUrl;
    }
   }
   const laCauThu=f.loai_thanh_vien==='cau_thu';
   const banGhi={ho_ten:f.ho_ten.trim(),so_ao:laCauThu&&f.so_ao?+f.so_ao:null,vi_tri:laCauThu?f.vi_tri:null,anh_url:anhUrl,loai_thanh_vien:f.loai_thanh_vien};
   const ketQua=f.id
    ?await supabase.from('players').update(banGhi).eq('id',f.id).select('id').maybeSingle()
    :await supabase.from('players').insert(banGhi).select('id').single();
   if(ketQua.error?.constraint==='players_vi_tri_check')throw new Error('Cơ sở dữ liệu chưa cho phép vị trí mới. Hãy chạy supabase/009_sua_vi_tri_va_xoa_mua_giai.sql trong Supabase SQL Editor rồi thử lại.');
   if(ketQua.error?.message?.includes('loai_thanh_vien'))throw new Error('Cơ sở dữ liệu chưa có loại thành viên. Hãy chạy supabase/014_loai_thanh_vien_co_vu.sql trong Supabase SQL Editor rồi thử lại.');
   if(ketQua.error)throw ketQua.error;
   if(!ketQua.data)throw new Error('Không có thành viên nào được cập nhật. Hãy đăng nhập bằng tài khoản quản trị rồi thử lại.');
   setF(null);setAnh(null);await tai();
  }catch(error){
   let thongBao='Không lưu được thành viên: '+error.message;
   if(daTaiLen){const {error:xoaLoi}=await supabase.storage.from(BUCKET).remove([duongDan]);if(xoaLoi)thongBao+='; đồng thời không xóa được ảnh tạm: '+xoaLoi.message}
   setLoi(thongBao);
  }finally{setDangLuu(false)}
 }
 async function xoa(c){if(!confirm(`Xóa thành viên ${c.ho_ten}?`))return;const {error}=await supabase.from('players').delete().eq('id',c.player_id);
  if(error)setLoi(error.code==='23503'?'Thành viên đã có lịch sử thi đấu nên không thể xóa.':'Không xóa được: '+error.message);else tai()}
 const loc=ds.filter(c=>c.ho_ten.toLowerCase().includes(q.toLowerCase())&&(!vt||(vt==='cau_thu'||vt==='co_vu'?c.loai_thanh_vien===vt:c.vi_tri===vt)));
 return <div className="page"><h1>Thành viên đội bóng</h1>
  <div className="hang"><input placeholder="Tìm kiếm thành viên" value={q} onChange={e=>setQ(e.target.value)}/><select value={vt} onChange={e=>setVt(e.target.value)}><option value="">Tất cả thành viên</option><option value="cau_thu">Cầu thủ</option><option value="co_vu">Cổ vũ</option><optgroup label="Lọc theo vị trí">{VT.map(v=><option key={v} value={v}>{v}</option>)}</optgroup></select>{laAdmin&&!f&&<button type="button" onClick={moThem}>Thêm thành viên</button>}</div>
  {f&&<form className="the player-form" onSubmit={luu}>
   <b className="vang">{f.id?'Chỉnh sửa thành viên':'Thêm thành viên'}</b>
   <div className="hang"><input placeholder="Họ và tên" value={f.ho_ten} onChange={e=>setF({...f,ho_ten:e.target.value})} required/><select value={f.loai_thanh_vien} onChange={e=>setF({...f,loai_thanh_vien:e.target.value})}><option value="cau_thu">Cầu thủ</option><option value="co_vu">Cổ động viên</option></select>{f.loai_thanh_vien==='cau_thu'&&<><input type="number" placeholder="Số áo" style={{width:110}} value={f.so_ao} onChange={e=>setF({...f,so_ao:e.target.value})}/><select value={f.vi_tri} onChange={e=>setF({...f,vi_tri:e.target.value})}>{VI_TRI.map(v=><option key={v.ten} value={v.ten}>{v.ma} · {v.ten}</option>)}</select></>}</div>
   <label className="photo-upload">Ảnh thành viên (ảnh gốc tối đa 50 MB; ảnh sẽ được nén trước khi tải lên; ảnh RAW .CR2 cần chuyển sang JPG/PNG)<input type="file" accept="image/*,.jpg,.jpeg,.png,.webp,.gif,.bmp,.avif" onChange={e=>setAnh(e.target.files?.[0]||null)}/></label>
   {xemAnh&&<img className="player-form-preview" src={xemAnh} alt="Xem trước ảnh thành viên"/>}
   <div className="hang"><button disabled={dangLuu}>{dangLuu?'Đang lưu...':'Lưu thành viên'}</button><button type="button" className="phu" onClick={()=>{setF(null);setAnh(null)}}>Hủy</button></div>
  </form>}
  {loi&&<div className="loi">{loi}</div>}
  <div className="grid player-grid">{loc.map(c=><div className="the player-card" key={c.player_id}>
   {c.anh_url?<img src={c.anh_url} className="player-card-photo" alt={`Ảnh ${c.ho_ten}`}/>:<div className="player-card-photo player-card-placeholder">{c.ho_ten[0]}</div>}
   <div className="cauthu"><div style={{flex:1}}><b>{c.ho_ten}</b><div className="nhan">{c.loai_thanh_vien==='co_vu'?<span className="badge">Cổ động viên</span>:<>Số áo {c.so_ao??'–'} · <span className="badge" title={c.vi_tri}>{maViTri(c.vi_tri)||c.vi_tri} · {c.vi_tri}</span></>}</div></div></div>
   {c.loai_thanh_vien!=='co_vu'&&<div className="player-card-stats"><span>Số trận có mặt <b>{c.so_tran}</b></span><span>Bàn thắng <b className="vang">{c.ban_thang}</b></span></div>}
   {laAdmin&&<div className="hang" style={{margin:'12px 0 0'}}><button type="button" className="phu" onClick={()=>moSua(c)}>Chỉnh sửa</button><button type="button" className="nguy" onClick={()=>xoa(c)}>Xóa</button></div>}</div>)}
   {!loc.length&&<div className="nhan">Chưa có thành viên nào.</div>}</div></div>
}
