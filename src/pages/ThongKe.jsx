import {useEffect,useMemo,useState} from 'react';
import {Area,Bar,CartesianGrid,ComposedChart,Legend,ResponsiveContainer,Tooltip,XAxis,YAxis} from 'recharts';
import {CalendarDays,Target,Users} from 'lucide-react';
import {supabase,ngay} from '../lib/supabase';

const THANG=[['01','Tháng 1'],['02','Tháng 2'],['03','Tháng 3'],['04','Tháng 4'],['05','Tháng 5'],['06','Tháng 6'],['07','Tháng 7'],['08','Tháng 8'],['09','Tháng 9'],['10','Tháng 10'],['11','Tháng 11'],['12','Tháng 12']];
const so=(value)=>Number(value)||0;

function TooltipTran({active,payload}){
 if(!active||!payload?.length)return null;
 const tran=payload[0].payload;
 return <div className="stats-chart-tooltip">
  <b>{ngay(tran.ngay_thi_dau)} · {tran.doi_thu}</b>
  {payload.map(item=><div key={item.dataKey}><i style={{background:item.color}}/>{item.name}: <strong>{item.value}</strong></div>)}
  {!tran.la_cau_thu&&<small>Tỷ số: {tran.ban_thang} – {tran.ban_thua}</small>}
 </div>;
}

export default function ThongKe(){
 const [ds,setDs]=useState([]),[tranDau,setTranDau]=useState([]),[diemDanh,setDiemDanh]=useState([]),[banThang,setBanThang]=useState([]);
 const [id,setId]=useState(''),[nam,setNam]=useState(''),[thang,setThang]=useState(''),[loi,setLoi]=useState(''),[dangTai,setDangTai]=useState(true);

 useEffect(()=>{
  let dangHien=true;
  async function tai(){
   const [cauThu,tran]=await Promise.all([
    supabase.from('v_thong_ke_cau_thu').select('player_id,ho_ten,anh_url,loai_thanh_vien').order('ho_ten'),
    supabase.from('v_buoi_bong').select('match_id,ngay_thi_dau,doi_thu,trang_thai,ban_thang,ban_thua,so_co_mat').order('ngay_thi_dau')
   ]);
   if(!dangHien)return;
   const loiTai=[];
   if(cauThu.error)loiTai.push(`danh sách thành viên: ${cauThu.error.message}`);
   if(tran.error)loiTai.push(`danh sách trận đấu: ${tran.error.message}`);
   if(cauThu.error?.message.includes('loai_thanh_vien'))loiTai.push('Hãy chạy migration 014_loai_thanh_vien_co_vu.sql trong Supabase SQL Editor.');
   if(tran.error?.message.includes('v_buoi_bong'))loiTai.push('Hãy chạy migration 008_lich_thi_dau.sql trong Supabase SQL Editor.');
   setLoi(loiTai.length?`Không tải được dữ liệu thống kê: ${loiTai.join('; ')}.`:'');
   setDs(cauThu.data||[]);
   setTranDau(tran.data||[]);
   setDangTai(false);
  }
  tai();
  return()=>{dangHien=false};
 },[]);

 useEffect(()=>{
  let dangHien=true;
  async function taiThongKeCaNhan(){
   if(!id){setDiemDanh([]);setBanThang([]);return}
   const playerId=Number(id);
   const [diemDanhRes,banThangRes]=await Promise.all([
    supabase.from('match_players').select('match_id,attendance_status').eq('player_id',playerId),
    supabase.from('goals').select('match_id').eq('player_id',playerId)
   ]);
   if(!dangHien)return;
   const loiTai=[];
   if(diemDanhRes.error)loiTai.push(`điểm danh: ${diemDanhRes.error.message}`);
   if(banThangRes.error)loiTai.push(`bàn thắng: ${banThangRes.error.message}`);
   setLoi(loiTai.length?`Không tải được thống kê thành viên: ${loiTai.join('; ')}.`:'');
   setDiemDanh(diemDanhRes.data||[]);
   setBanThang(banThangRes.data||[]);
  }
  taiThongKeCaNhan();
  return()=>{dangHien=false};
 },[id]);

 const tranDaDau=useMemo(()=>tranDau.filter(tr=>tr.trang_thai==='da_thi_dau'),[tranDau]);
 const cacNam=useMemo(()=>[...new Set(tranDaDau.map(tr=>tr.ngay_thi_dau.slice(0,4)))].sort((a,b)=>b.localeCompare(a)),[tranDaDau]);
 const tranTrongKy=useMemo(()=>tranDaDau.filter(tr=>
  (!nam||tr.ngay_thi_dau.startsWith(nam))&&(!thang||tr.ngay_thi_dau.slice(5,7)===thang)
 ),[tranDaDau,nam,thang]);
 const danhSachTran=useMemo(()=>{
  const soCoMat=new Map(diemDanh.filter(row=>row.attendance_status==='co_mat').map(row=>[Number(row.match_id),1]));
  const banTheoTran=new Map();
  banThang.forEach(row=>{const matchId=Number(row.match_id);banTheoTran.set(matchId,(banTheoTran.get(matchId)||0)+1)});
  return tranTrongKy.map(tr=>{
   const matchId=Number(tr.match_id);
   return {...tr,so_co_mat_ca_nhan:soCoMat.get(matchId)||0,ban_thang_ca_nhan:banTheoTran.get(matchId)||0,la_cau_thu:Boolean(id)};
  });
 },[tranTrongKy,diemDanh,banThang,id]);
 const bieuDo=useMemo(()=>danhSachTran.slice().reverse().map(tr=>({
  ...tr,nhan:tr.ngay_thi_dau.slice(5).replace('-','/'),
  so_co_mat_bieu_do:id?tr.so_co_mat_ca_nhan:so(tr.so_co_mat),
  ban_thang_bieu_do:id?tr.ban_thang_ca_nhan:so(tr.ban_thang)
 })),[danhSachTran,id]);
 const cauThuChon=ds.find(x=>x.player_id===Number(id));
 const soTranCoMat=id?danhSachTran.filter(tr=>tr.so_co_mat_ca_nhan).length:tranTrongKy.length;
 const tongLuotCoMat=id?soTranCoMat:tranTrongKy.reduce((sum,tr)=>sum+so(tr.so_co_mat),0);
 const tongBanThang=id?danhSachTran.reduce((sum,tr)=>sum+tr.ban_thang_ca_nhan,0):tranTrongKy.reduce((sum,tr)=>sum+so(tr.ban_thang),0);
 const tyLeCoMat=tranTrongKy.length?Math.round(tongLuotCoMat/tranTrongKy.length*100):0;
 const nhanKy=thang?`Tháng ${Number(thang)}${nam?`/${nam}`:' (mọi năm)'}`:nam?`Năm ${nam}`:'Toàn thời gian';
 const khoangTruc= bieuDo.length>10?Math.ceil(bieuDo.length/10):0;

 return <div className="page stats-page">
  <h1>Thống kê thi đấu &amp; bàn thắng</h1>
  {loi&&<div className="loi">{loi}</div>}
  <section className="the stats-filter">
   <label>Năm<select value={nam} onChange={e=>setNam(e.target.value)}><option value="">Tất cả năm</option>{cacNam.map(n=><option key={n} value={n}>{n}</option>)}</select></label>
   <label>Tháng<select value={thang} onChange={e=>setThang(e.target.value)}><option value="">Cả năm</option>{THANG.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label>
   <label>Thành viên<select value={id} onChange={e=>setId(e.target.value)}><option value="">Toàn đội</option>{ds.map(x=><option key={x.player_id} value={x.player_id}>{x.ho_ten}{x.loai_thanh_vien==='co_vu'?' (CĐV)':''}</option>)}</select></label>
  </section>
  <section className="stats-summary">
   <div className="the stats-kpi matches"><span className="stats-kpi-icon"><CalendarDays size={20}/></span><div><div className="nhan">{cauThuChon?'Trận có mặt':'Trận đã đấu'}</div><div className="so">{soTranCoMat}</div><small>{nhanKy}</small></div></div>
   <div className="the stats-kpi attendance"><span className="stats-kpi-icon"><Users size={20}/></span><div><div className="nhan">{cauThuChon?'Tỷ lệ có mặt':'Lượt cầu thủ có mặt'}</div><div className="so">{cauThuChon?`${tyLeCoMat}%`:tongLuotCoMat}</div><small>{cauThuChon?`${soTranCoMat}/${tranTrongKy.length} trận`:nhanKy}</small></div></div>
   <div className="the stats-kpi goals"><span className="stats-kpi-icon"><Target size={20}/></span><div><div className="nhan">Bàn thắng {cauThuChon?'cá nhân':'toàn đội'}</div><div className="so vang">{tongBanThang}</div><small>{nhanKy}</small></div></div>
  </section>
  <section className="the stats-chart">
   <div className="stats-section-heading"><div><h2>Phong độ qua từng trận</h2><span className="nhan">{cauThuChon?cauThuChon.ho_ten:'Toàn đội'} · {nhanKy}</span></div><span className="stats-chart-count">{bieuDo.length} trận</span></div>
   {dangTai?<div className="empty-match">Đang tải thống kê...</div>:bieuDo.length?<ResponsiveContainer height={340}>
    <ComposedChart data={bieuDo} margin={{top:16,right:8,bottom:8,left:-16}}>
     <defs><linearGradient id="attendanceGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#315f9e" stopOpacity=".28"/><stop offset="95%" stopColor="#315f9e" stopOpacity=".02"/></linearGradient></defs>
     <CartesianGrid stroke="#e9edf3" strokeDasharray="4 5" vertical={false}/>
     <XAxis dataKey="nhan" axisLine={false} tickLine={false} tick={{fill:'#687386',fontSize:11,fontWeight:600}} interval={khoangTruc} tickMargin={12}/>
     <YAxis yAxisId="attendance" axisLine={false} tickLine={false} tick={{fill:'#687386',fontSize:11}} allowDecimals={false} width={42}/>
     <YAxis yAxisId="goals" orientation="right" axisLine={false} tickLine={false} tick={{fill:'#687386',fontSize:11}} allowDecimals={false} width={32}/>
     <Tooltip content={<TooltipTran/>} cursor={{fill:'#f3f6fa'}}/>
     <Legend verticalAlign="top" align="right" height={34} iconType="circle" wrapperStyle={{fontSize:12,fontWeight:700}}/>
     <Area yAxisId="attendance" type="monotone" dataKey="so_co_mat_bieu_do" name={cauThuChon?'Có mặt':'Cầu thủ có mặt'} stroke="#315f9e" strokeWidth={3} fill="url(#attendanceGradient)" activeDot={{r:6,strokeWidth:0}}/>
     <Bar yAxisId="goals" dataKey="ban_thang_bieu_do" name="Bàn thắng" fill="#ff8a1e" radius={[6,6,0,0]} maxBarSize={24}/>
    </ComposedChart>
   </ResponsiveContainer>:<div className="empty-match">Chưa có trận đấu trong khoảng thời gian này.</div>}
   <div className="stats-chart-hint">Di chuột vào từng điểm hoặc cột để xem chi tiết trận đấu.</div>
  </section>
  <section className="the stats-list">
   <div className="stats-list-heading"><div><h2>Kết quả theo từng trận</h2><span className="nhan">{nhanKy} · {danhSachTran.length} trận</span></div></div>
   <div className="stats-table-wrap"><table className="stats-table"><thead><tr><th>Ngày thi đấu</th><th>Đối thủ</th><th>Tỷ số</th><th>{cauThuChon?'Điểm danh':'Số cầu thủ có mặt'}</th><th>Bàn thắng</th></tr></thead><tbody>
    {danhSachTran.slice().reverse().map(tr=><tr key={tr.match_id}><td>{ngay(tr.ngay_thi_dau)}</td><td>{tr.doi_thu}</td><td><span className="stats-score">{tr.ban_thang} – {tr.ban_thua}</span></td><td>{id?(tr.so_co_mat_ca_nhan?'Có':'—'):so(tr.so_co_mat)}</td><td className="stats-table-goals">{id?tr.ban_thang_ca_nhan:so(tr.ban_thang)}</td></tr>)}
    {!danhSachTran.length&&<tr><td colSpan="5">Chưa có dữ liệu trận đấu.</td></tr>}
   </tbody></table></div>
  </section>
 </div>;
}
