import {createClient} from '@supabase/supabase-js';
export const supabase=createClient(import.meta.env.VITE_SUPABASE_URL||'http://localhost',import.meta.env.VITE_SUPABASE_ANON_KEY||'chua-cau-hinh');
export const ngay=d=>new Date(d).toLocaleDateString('vi-VN');
export function ngayHienTai(){
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
 const lay=type=>parts.find(p=>p.type===type)?.value;
 return `${lay('year')}-${lay('month')}-${lay('day')}`;
}
export function trangThaiTheoNgay(ngayThiDau){
 const homNay=ngayHienTai();
 if(ngayThiDau<homNay)return 'da_thi_dau';
 if(ngayThiDau>homNay)return 'chua_thi_dau';
 return 'dang_thi_dau';
}
