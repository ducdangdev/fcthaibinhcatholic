import {Fragment,useEffect,useState} from 'react';
import {CalendarDays,ChevronDown,ChevronUp,MapPin} from 'lucide-react';
import {supabase,ngay,ngayHienTai,trangThaiTheoNgay} from '../lib/supabase';
import {ghepDiaDiem,hienDiaDiem,tachDiaDiem} from '../lib/diaDiem';
import {useAuth} from '../context/AuthContext';

const TRANG_THAI=[['chua_thi_dau','Sắp diễn ra'],['dang_thi_dau','Đang diễn ra'],['da_thi_dau','Đã kết thúc']];
const NHAN_TRANG_THAI=Object.fromEntries(TRANG_THAI);
const rong=()=>({season_id:'',ngay_thi_dau:ngayHienTai(),doi_thu:'',dia_diem:'',ban_thang:0,ban_thua:0,trang_thai:trangThaiTheoNgay(ngayHienTai()),tu_dong:true,diemDanh:{},goals:[]});
const KEY_SAN_NHANH='doi-bong.san-nhanh';

export default function TranDau(){
 const {laAdmin}=useAuth();
 const [ds,setDs]=useState([]),[cts,setCts]=useState([]),[mua,setMua]=useState([]),[f,setF]=useState(null),[ct,setCt]=useState(null),[loi,setLoi]=useState(''),[thanhCong,setThanhCong]=useState(''),[dangLuu,setDangLuu]=useState(false),[thang,setThang]=useState(''),[trangThaiLoc,setTrangThaiLoc]=useState(''),[dsSan,setDsSan]=useState([]),[hienDsSan,setHienDsSan]=useState(false);
 const tai=async()=>{const {data,error}=await supabase.from('v_buoi_bong').select('*').order('ngay_thi_dau',{ascending:false});if(error)setLoi('Không tải được lịch thi đấu: '+error.message);else setDs(data||[])};
 useEffect(()=>{try{const saved=JSON.parse(localStorage.getItem(KEY_SAN_NHANH)||'[]');if(Array.isArray(saved)&&saved.every(s=>typeof s==='string'))setDsSan(saved)}catch(error){setLoi('Không đọc được danh sách sân đã lưu: '+error.message)}},[]);
 useEffect(()=>{const sanTran=[...new Set(ds.map(t=>tachDiaDiem(t.dia_diem||'').dia_diem.trim()).filter(Boolean))];if(!sanTran.length)return;try{const saved=JSON.parse(localStorage.getItem(KEY_SAN_NHANH)||'[]');if(!Array.isArray(saved)||!saved.every(s=>typeof s==='string'))throw new Error('Dữ liệu danh sách sân không hợp lệ.');const next=[...saved,...sanTran.filter(s=>!saved.includes(s))];if(next.length!==saved.length){localStorage.setItem(KEY_SAN_NHANH,JSON.stringify(next));setDsSan(next)}}catch(error){setLoi('Không cập nhật được danh sách sân đã lưu: '+error.message)}},[ds]);
 useEffect(()=>{tai();supabase.from('players').select('id,ho_ten,loai_thanh_vien').eq('dang_hoat_dong',true).order('ho_ten').then(({data,error})=>{if(error)setLoi(`Không tải được danh sách thành viên: ${error.message}${error.message.includes('loai_thanh_vien')?' Hãy chạy migration 014_loai_thanh_vien_co_vu.sql trong Supabase SQL Editor.':''}`);else setCts(data||[])});supabase.from('seasons').select('*').then(({data,error})=>{if(error)setLoi('Không tải được mùa giải: '+error.message);else setMua(data||[])});const interval=setInterval(tai,60000);return()=>clearInterval(interval)},[]);
 const ten=id=>cts.find(c=>c.id===+id)?.ho_ten||'Thành viên';
 async function lay(id){const {data,error}=await supabase.from('goals').select('*').eq('match_id',id).order('phut');if(error)throw error;return {g:data||[]}}
 async function xem(id){try{setCt(ct?.id===id?null:{id,...await lay(id)})}catch(error){setLoi('Không tải được chi tiết trận: '+error.message)}}
 async function sua(t){try{const [d,diemDanh]=await Promise.all([lay(t.match_id),supabase.from('match_players').select('player_id,attendance_status').eq('match_id',t.match_id)]);if(diemDanh.error)throw diemDanh.error;const trangThaiDiemDanh=Object.fromEntries((diemDanh.data||[]).map(mp=>[Number(mp.player_id),mp.attendance_status]));setLoi('');setThanhCong('');setF({id:t.match_id,season_id:t.season_id||'',ngay_thi_dau:t.ngay_thi_dau,doi_thu:t.doi_thu||'',...tachDiaDiem(t.dia_diem||''),ban_thang:t.ban_thang??0,ban_thua:t.ban_thua??0,trang_thai:t.trang_thai||'chua_thi_dau',tu_dong:!t.trang_thai_thu_cong,diemDanh:trangThaiDiemDanh,goals:d.g.map(g=>({player_id:g.player_id,phut:g.phut??''}))});window.scrollTo(0,0)}catch(error){setLoi('Không tải được dữ liệu trận để chỉnh sửa: '+error.message)}}
 async function xoa(t){if(!confirm(`Xóa trận gặp ${t.doi_thu} ngày ${ngay(t.ngay_thi_dau)}?`))return;const {error}=await supabase.from('matches').delete().eq('id',t.match_id);if(error)setLoi('Không xóa được trận: '+error.message);else{setCt(null);await tai()}}
 async function capNhatTrangThai(t,chon){setLoi('');const tuDong=chon==='tu_dong',trang_thai=tuDong?trangThaiTheoNgay(t.ngay_thi_dau):chon;const {data,error}=await supabase.from('matches').update({trang_thai,trang_thai_thu_cong:tuDong?null:trang_thai,ngay_chinh_trang_thai:tuDong?null:ngayHienTai()}).eq('id',t.match_id).select('id').maybeSingle();if(error)setLoi(`Không lưu được trạng thái trận: ${error.message}. Hãy chạy migration 006_tu_dong_trang_thai_tran.sql.`);else if(!data)setLoi('Trạng thái chưa được lưu. Hãy đăng nhập bằng tài khoản admin rồi thử lại.');else await tai()}
 async function luu(e){e.preventDefault();if(dangLuu)return;setDangLuu(true);setLoi('');setThanhCong('');try{if(!cts.length)return setLoi('Chưa tải được danh sách thành viên, vui lòng tải lại trang rồi thử lại.');if(!f.ngay_thi_dau)return setLoi('Hãy chọn ngày thi đấu.');if(!f.doi_thu.trim())return setLoi('Hãy nhập tên đội đối thủ.');if(f.ban_thang===''||f.ban_thua===''||![f.ban_thang,f.ban_thua].every(score=>Number.isInteger(Number(score))&&Number(score)>=0&&Number(score)<=99))return setLoi('Tỷ số phải là số nguyên từ 0 đến 99.');if(f.goals.length!==Number(f.ban_thang))return setLoi(`Tổng bàn thắng cầu thủ ghi (${f.goals.length}) phải khớp tỷ số Thái Bình (${Number(f.ban_thang)}).`);if(f.goals.some(g=>!g.player_id))return setLoi('Hãy chọn cầu thủ ghi bàn hoặc xóa dòng bàn thắng chưa hoàn tất.');if(f.goals.some(g=>!cts.some(c=>Number(c.id)===Number(g.player_id)&&c.loai_thanh_vien==='cau_thu')))return setLoi('Chỉ cầu thủ mới được ghi bàn.');if(f.goals.some(g=>(f.diemDanh?.[Number(g.player_id)]||'vang_mat')!=='co_mat'))return setLoi('Hãy tích có mặt cho tất cả cầu thủ ghi bàn.');
  const coTiSo=Number(f.ban_thang)>0||Number(f.ban_thua)>0;
  const tuDongChotKetQua=f.tu_dong&&f.ngay_thi_dau<=ngayHienTai()&&coTiSo;
  const trangThaiLuu=tuDongChotKetQua?'da_thi_dau':f.trang_thai;
  const ghiDeTrangThai=tuDongChotKetQua?'da_thi_dau':f.tu_dong?null:f.trang_thai;
  const p={id:f.id,season_id:f.season_id||null,ngay_thi_dau:f.ngay_thi_dau,doi_thu:f.doi_thu.trim(),dia_diem:ghepDiaDiem(f.dia_diem,f.so_san),ban_thang:Number(f.ban_thang)||0,ban_thua:Number(f.ban_thua)||0,trang_thai:trangThaiLuu,trang_thai_thu_cong:ghiDeTrangThai,ngay_chinh_trang_thai:ghiDeTrangThai?ngayHienTai():null,cau_thu:cts.map(c=>({player_id:c.id,tinh_trang:f.diemDanh?.[c.id]||'vang_mat'})),ban_thang_ca_nhan:f.goals.map(g=>({player_id:+g.player_id,phut:g.phut===''?null:+g.phut}))};
  const {data:matchId,error}=await supabase.rpc('save_match',{p});
  if(error){setLoi(`Không lưu được lịch thi đấu: ${error.message}. Hãy chạy migration 011_diem_danh_va_nguoi_ghi_ban.sql trong Supabase SQL Editor.`);return}
  if(!matchId){setLoi('Không nhận được mã trận đấu sau khi lưu, điểm danh chưa được xác nhận. Hãy thử lưu lại.');return}
  const {data:diemDanhDaLuu,error:loiXacNhan}=await supabase.from('match_players').select('player_id,attendance_status').eq('match_id',matchId);
  if(loiXacNhan){setLoi(`Trận đã lưu nhưng không xác nhận được điểm danh: ${loiXacNhan.message}. Form vẫn được giữ lại; hãy tải lại trận để kiểm tra.`);return}
  const trangThaiMongMuon=c=>f.diemDanh?.[Number(c.id)]==='co_mat'?'co_mat':'vang_mat';
  const timChuaLuu=rows=>{const trangThai=new Map(rows.map(row=>[Number(row.player_id),row.attendance_status]));return cts.filter(c=>trangThai.get(Number(c.id))!==trangThaiMongMuon(c))};
  let diemDanhDaXacNhan=diemDanhDaLuu||[];
  let chuaLuu=timChuaLuu(diemDanhDaXacNhan);
  if(chuaLuu.length){
   const {error:loiSuaDiemDanh}=await supabase.from('match_players').upsert(
    chuaLuu.map(c=>({match_id:matchId,player_id:c.id,attendance_status:trangThaiMongMuon(c)})),
    {onConflict:'match_id,player_id'}
   );
   if(loiSuaDiemDanh){setLoi(`Trận đã lưu nhưng chưa sửa được điểm danh cho ${chuaLuu.map(c=>c.ho_ten).join(', ')}: ${loiSuaDiemDanh.message}. Đây là lỗi cập nhật bảng điểm danh, không phải lỗi quyền lưu trận.`);return}
   const {data:diemDanhSauKhiSua,error:loiDocLai}=await supabase.from('match_players').select('player_id,attendance_status').eq('match_id',matchId);
   if(loiDocLai){setLoi(`Đã gửi cập nhật điểm danh nhưng không xác nhận lại được: ${loiDocLai.message}. Hãy tải lại trận để kiểm tra.`);return}
   diemDanhDaXacNhan=diemDanhSauKhiSua||[];
   chuaLuu=timChuaLuu(diemDanhDaXacNhan);
   if(chuaLuu.length){const trangThaiThucTe=new Map((diemDanhSauKhiSua||[]).map(row=>[Number(row.player_id),row.attendance_status||'không có bản ghi']));setLoi(`Trận đã lưu nhưng điểm danh vẫn chưa khớp: ${chuaLuu.map(c=>`${c.ho_ten} (cần ${trangThaiMongMuon(c)}, hiện ${trangThaiThucTe.get(Number(c.id))||'không có bản ghi'})`).join('; ')}. Vui lòng kiểm tra migration 011 và quyền ghi bảng match_players.`);return}
  }
  const san=f.dia_diem.trim();if(san&&!dsSan.includes(san)){const next=[...dsSan,san];try{localStorage.setItem(KEY_SAN_NHANH,JSON.stringify(next));setDsSan(next)}catch(storageError){setLoi('Đã lưu trận đấu nhưng không lưu được sân chọn nhanh: '+storageError.message)}}const diemDanhMoi=Object.fromEntries(diemDanhDaXacNhan.map(row=>[Number(row.player_id),row.attendance_status]));setF({...f,id:matchId,diemDanh:diemDanhMoi});setHienDsSan(false);setCt(null);setThanhCong('Đã lưu thay đổi. Bạn có thể tiếp tục thêm hoặc bỏ tích thành viên rồi lưu lại.');window.dispatchEvent(new Event('doi-bong:stats-updated'));await tai()}catch(error){setLoi(`Không lưu được thay đổi: ${error.message}`)}finally{setDangLuu(false)}}
 const capNhatGoal=(i,k,v)=>setF({...f,goals:f.goals.map((g,j)=>j===i?{...g,[k]:v}:g)});
 const tangTiSo=(k,delta)=>setF(prev=>({...prev,[k]:Math.max(0,Math.min(99,(Number(prev[k])||0)+delta))}));
 const capNhatDiemDanh=(id,coMat)=>{const daGhiBan=f?.goals?.some(g=>Number(g.player_id)===Number(id));setThanhCong(!coMat&&daGhiBan?'Đã bỏ thành viên này khỏi danh sách ghi bàn vì đã bỏ tích có mặt; tỷ số trận không đổi.':'');setF(prev=>({...prev,diemDanh:{...prev.diemDanh,[id]:coMat?'co_mat':prev.diemDanh?.[id]==='co_mat'?'vang_mat':prev.diemDanh?.[id]||'vang_mat'},goals:coMat?prev.goals:prev.goals.filter(g=>Number(g.player_id)!==Number(id))}))};
 const chonNguoiGhiBan=(playerId,checked)=>{if(checked&&f.goals.length>=Number(f.ban_thang)){setLoi(`Đã nhập đủ ${Number(f.ban_thang)} bàn theo tỷ số Thái Bình.`);return}setLoi('');setF(prev=>({...prev,diemDanh:checked?{...prev.diemDanh,[playerId]:'co_mat'}:prev.diemDanh,goals:checked?[...prev.goals,{player_id:playerId,phut:''}]:prev.goals.filter(g=>Number(g.player_id)!==Number(playerId))}))};
 const tenCoMat=id=>cts.find(c=>c.id===Number(id))?.ho_ten||'Thành viên';
 const danhSachGhiBan=cts.filter(c=>c.loai_thanh_vien==='cau_thu'&&(f?.diemDanh?.[c.id]==='co_mat'||f?.goals?.some(g=>Number(g.player_id)===Number(c.id)))).map(c=>c.id);
 const tongBanCaNhan=f?.goals?.length||0;
 const soThanhVienCoMat=cts.reduce((so,c)=>so+(f?.diemDanh?.[Number(c.id)]==='co_mat'?1:0),0);
 const hien=ds.filter(t=>(!thang||t.ngay_thi_dau.startsWith(thang))&&(!trangThaiLoc||t.trang_thai===trangThaiLoc));
 return <div className="page"><h1>Lịch thi đấu</h1>
  <div className="hang"><input type="month" aria-label="Lọc theo tháng" value={thang} onChange={e=>setThang(e.target.value)}/>{thang&&<button className="phu" onClick={()=>setThang('')}>Bỏ lọc</button>}{laAdmin&&!f&&<button onClick={()=>{setLoi('');setThanhCong('');setF({...rong(),season_id:mua.find(m=>m.dang_dien_ra)?.id||''})}}>Thêm trận đấu</button>}</div>
  <div className="nhan">Theo dõi lịch, đối thủ, tỷ số và thành tích ghi bàn của đội.</div>
  <div className="match-status-filters" aria-label="Lọc trạng thái trận đấu"><button type="button" className={!trangThaiLoc?'selected':''} onClick={()=>setTrangThaiLoc('')}>Tất cả</button>{TRANG_THAI.map(([value,label])=><button type="button" key={value} className={trangThaiLoc===value?'selected':''} onClick={()=>setTrangThaiLoc(value)}>{label}</button>)}</div>
  {loi&&<div className="loi">{loi}</div>}
  {f&&<form className="the attendance-form" noValidate onSubmit={luu}>
   <b className="vang">{f.id?'Chỉnh sửa trận đấu':'Thêm trận đấu'}</b>
   <div className="hang" style={{margin:0}}>
    <label>Ngày thi đấu<input type="date" value={f.ngay_thi_dau} onChange={e=>setF({...f,ngay_thi_dau:e.target.value,trang_thai:f.tu_dong?trangThaiTheoNgay(e.target.value):f.trang_thai})} required/></label>
    <label>Đội đối thủ<input placeholder="Tên đội đối thủ" value={f.doi_thu} onChange={e=>setF({...f,doi_thu:e.target.value})} required/></label>
    <div className="pitch-name-field" onMouseEnter={()=>setHienDsSan(true)} onMouseLeave={()=>setHienDsSan(false)} onBlur={e=>{if(!e.currentTarget.contains(e.relatedTarget))setHienDsSan(false)}}>
     <label htmlFor="match-pitch-name">Sân bóng</label>
     <div className="pitch-name-input">
      <input id="match-pitch-name" placeholder="Nhập tên sân lần đầu" value={f.dia_diem} onFocus={()=>setHienDsSan(true)} onChange={e=>setF({...f,dia_diem:e.target.value})}/>
      {hienDsSan&&<div className="pitch-picker-list">{dsSan.length?dsSan.map(s=><button type="button" key={s} onClick={()=>{setF({...f,dia_diem:s});setHienDsSan(false)}}>{s}</button>):<span>Chưa có sân đã lưu</span>}</div>}
     </div>
    </div>
    <label>Số sân<input type="number" min="1" placeholder="Ví dụ: 2" value={f.so_san||''} onChange={e=>setF({...f,so_san:e.target.value})}/></label>
    <label>Mùa giải<select value={f.season_id} onChange={e=>setF({...f,season_id:e.target.value})}><option value="">Chọn mùa giải</option>{mua.map(m=><option key={m.id} value={m.id}>{m.ten}</option>)}</select></label>
   </div>
   <div className="match-score-row">
    <div className="match-score-pair">
     <label className="match-score-control">Tỷ số Thái Bình<div className="match-score-input"><input type="number" min="0" max="99" value={f.ban_thang} onChange={e=>setF({...f,ban_thang:e.target.value})} required/><span className="match-score-stepper"><button type="button" aria-label="Tăng tỷ số Thái Bình" onClick={()=>tangTiSo('ban_thang',1)}><ChevronUp size={15}/></button><button type="button" aria-label="Giảm tỷ số Thái Bình" onClick={()=>tangTiSo('ban_thang',-1)}><ChevronDown size={15}/></button></span></div></label>
     <b className="match-score-separator" aria-hidden="true">—</b>
     <label className="match-score-control">Tỷ số đối thủ<div className="match-score-input"><input type="number" min="0" max="99" value={f.ban_thua} onChange={e=>setF({...f,ban_thua:e.target.value})} required/><span className="match-score-stepper"><button type="button" aria-label="Tăng tỷ số đối thủ" onClick={()=>tangTiSo('ban_thua',1)}><ChevronUp size={15}/></button><button type="button" aria-label="Giảm tỷ số đối thủ" onClick={()=>tangTiSo('ban_thua',-1)}><ChevronDown size={15}/></button></span></div></label>
    </div>
    <label className="match-score-status">Trạng thái<select value={f.tu_dong?'tu_dong':f.trang_thai} onChange={e=>{const tuDong=e.target.value==='tu_dong';setF({...f,tu_dong:tuDong,trang_thai:tuDong?trangThaiTheoNgay(f.ngay_thi_dau):e.target.value})}}><option value="tu_dong">Tự động theo ngày</option>{TRANG_THAI.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
   </div>
   <section className="attendance-section"><div className="attendance-heading"><b>Điểm danh thành viên</b><span>{soThanhVienCoMat}/{cts.length} có mặt</span></div>
    <span className="nhan">Tích chọn các thành viên có mặt; người không tích sẽ được tính là vắng.</span>
    <div className="attendance-picker"><div className="attendance-roster-list">{cts.map(c=><label className="attendance-roster-option" key={c.id}><input type="checkbox" checked={f.diemDanh?.[c.id]==='co_mat'} onChange={e=>capNhatDiemDanh(c.id,e.target.checked)}/><span>{c.ho_ten}{c.loai_thanh_vien==='co_vu'?' · Cổ động viên':''}</span></label>)}</div>{!cts.length&&<span className="nhan">Đang tải danh sách thành viên...</span>}</div>
    {(Number(f.ban_thang)>0||f.goals.length>0)&&<div className="goal-scorer-picker"><div className="goal-scorer-heading"><b>Người ghi bàn cho Thái Bình — tích chọn tên thành viên</b><span className={tongBanCaNhan>Number(f.ban_thang)?'is-over':''}>{tongBanCaNhan}/{Number(f.ban_thang)} bàn</span></div>{danhSachGhiBan.length?<div className="goal-scorer-list">{danhSachGhiBan.map(id=>{const soBan=f.goals.filter(g=>Number(g.player_id)===id).length;return <div className="goal-scorer-option" key={id}><label><input type="checkbox" checked={soBan>0} disabled={!soBan&&tongBanCaNhan>=Number(f.ban_thang)} onChange={e=>chonNguoiGhiBan(id,e.target.checked)}/><span>{tenCoMat(id)}</span></label>{soBan>0&&<><small>{soBan} bàn</small><button type="button" aria-label={`Thêm bàn cho ${tenCoMat(id)}`} disabled={tongBanCaNhan>=Number(f.ban_thang)} onClick={()=>chonNguoiGhiBan(id,true)}>+</button></>}</div>})}</div>:<span className="nhan">Tích có mặt thành viên phía trên để chọn người ghi bàn.</span>}</div>}
    {f.goals.map((g,i)=><div className="hang attendance-goal-row" key={i}><label>Cầu thủ ghi bàn<select value={g.player_id} onChange={e=>capNhatGoal(i,'player_id',e.target.value)}><option value="">Chọn cầu thủ</option>{cts.filter(c=>c.loai_thanh_vien==='cau_thu'&&(f.diemDanh?.[c.id]==='co_mat'||Number(g.player_id)===Number(c.id))).map(c=><option key={c.id} value={c.id}>{c.ho_ten}</option>)}</select></label><label>Phút<input type="number" min="0" max="150" value={g.phut} onChange={e=>capNhatGoal(i,'phut',e.target.value)}/></label><button type="button" className="nguy" onClick={()=>setF({...f,goals:f.goals.filter((_,j)=>j!==i)})}>Xóa</button></div>)}
   </section>
   <div className="hang" style={{margin:0}}><button type="submit" disabled={dangLuu}>{dangLuu?'Đang lưu...':f.id?'Lưu thay đổi':'Lưu trận đấu'}</button><button type="button" className="phu" disabled={dangLuu} onClick={()=>{setF(null);setThanhCong('');setLoi('')}}>Đóng</button></div>
   {thanhCong&&<div className="thanh-cong attendance-save-success" role="status">{thanhCong}</div>}
  </form>}
  <div className="the" style={{overflowX:'auto'}}><table><thead><tr><th>Ngày</th><th>Trận đấu</th><th>Tỷ số</th><th>Trạng thái</th><th>Địa điểm</th>{laAdmin&&<th>Quản lý</th>}</tr></thead>
   <tbody>{hien.map(t=><Fragment key={t.match_id}><tr onClick={()=>xem(t.match_id)} style={{cursor:'pointer'}}><td>{ngay(t.ngay_thi_dau)}</td><td>THÁI BÌNH – {t.doi_thu}</td><td><b>{t.ban_thang} – {t.ban_thua}</b></td><td><span className={`match-status-badge match-status-${t.trang_thai==='dang_thi_dau'?'live':t.trang_thai==='da_thi_dau'?'played':'upcoming'}`}>{NHAN_TRANG_THAI[t.trang_thai]||'Sắp diễn ra'}</span></td><td>{t.dia_diem?hienDiaDiem(t.dia_diem):'—'}</td>
    {laAdmin&&<td onClick={e=>e.stopPropagation()} style={{whiteSpace:'nowrap'}}><select className="match-admin-status" aria-label={`Trạng thái trận ngày ${ngay(t.ngay_thi_dau)}`} value={t.trang_thai_thu_cong||'tu_dong'} onChange={e=>capNhatTrangThai(t,e.target.value)}><option value="tu_dong">Tự động ({NHAN_TRANG_THAI[trangThaiTheoNgay(t.ngay_thi_dau)]})</option>{TRANG_THAI.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select><div className="hang" style={{margin:'6px 0 0'}}><button type="button" className="phu" onClick={()=>sua(t)}>Chỉnh sửa</button> <button type="button" className="nguy" onClick={()=>xoa(t)}>Xóa</button></div></td>}</tr>
    {ct?.id===t.match_id&&<tr><td colSpan={laAdmin?6:5} className="attendance-details"><b>Người ghi bàn</b>{ct.g.map(g=><div key={g.id}>{g.phut!==null&&g.phut!==''?`${g.phut}' `:''}<b>{ten(g.player_id)}</b></div>)}{!ct.g.length&&<div>Chưa cập nhật người ghi bàn</div>}</td></tr>}</Fragment>)}</tbody>
  </table>{!hien.length&&<div className="nhan" style={{padding:12}}>Chưa có trận đấu nào trong khoảng thời gian này.</div>}</div>
 </div>;
}
