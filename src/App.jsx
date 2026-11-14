import {useEffect,useState} from 'react';
import {Routes,Route,NavLink,Navigate,Link,useLocation} from 'react-router-dom';
import {House,Users,Trophy,BarChart3,Medal,LogOut,LogIn,CalendarDays,Settings,Menu,X} from 'lucide-react';
import {useAuth} from './context/AuthContext';
import {supabase} from './lib/supabase';
import {DOI} from './constants/doiBong';
import DanhHieu from './pages/DanhHieu';
import QuanTri from './pages/QuanTri';
import ThongKe from './pages/ThongKe';
import DangNhap from './pages/DangNhap';
import TongQuan from './pages/TongQuan';
import CauThu from './pages/CauThu';
import TranDau from './pages/TranDau';
import BangXepHang from './pages/BangXepHang';

const menu=[
 ['/','Trang chủ',House],
 ['/cau-thu','Thành viên',Users],
 ['/tran-dau','Lịch thi đấu',CalendarDays],
 ['/thong-ke','Thống kê',BarChart3],
 ['/bang-xep-hang','Thành tích cá nhân',Trophy],
 ['/danh-hieu','Danh hiệu',Medal]
];

export default function App(){
 const {user,khach,vaiTro,dangTai,laAdmin}=useAuth();
 const [menuMo,setMenuMo]=useState(false);
 const location=useLocation();
 useEffect(()=>setMenuMo(false),[location.pathname]);
 if(dangTai)return <div className="page nhan">Đang tải...</div>;
 return <div className="app">
  <header className="site-header">
   <Link to="/" className="thuonghieu"><img src="/logo.jpg" alt=""/><div><b>{DOI.ten}</b><span>{DOI.tenPhu}</span></div></Link>
   <button type="button" className="mobile-menu-toggle" aria-label={menuMo?'Đóng menu':'Mở menu'} aria-expanded={menuMo} aria-controls="primary-navigation" onClick={()=>setMenuMo(open=>!open)}>{menuMo?<X size={23}/>:<Menu size={23}/>}</button>
   <nav id="primary-navigation" className={`site-nav${menuMo?' is-open':''}`} aria-label="Điều hướng chính">
    {menu.map(([to,ten,Icon])=><NavLink key={to} to={to} end={to==='/'} onClick={()=>setMenuMo(false)}><Icon size={16}/><span>{ten}</span></NavLink>)}
    {laAdmin&&<NavLink to="/quan-tri" onClick={()=>setMenuMo(false)}><Settings size={16}/><span>Quản trị</span></NavLink>}
   </nav>
   <div className="account">
    {!khach&&<span className="account-name">{user.email} · {vaiTro==='super_admin'?'Quản trị viên cấp cao':'Quản trị viên'}</span>}
    {khach?<Link to="/dang-nhap" className="nutlink"><LogIn size={14}/> Đăng nhập</Link>:<button className="phu" onClick={()=>supabase.auth.signOut()}><LogOut size={14}/> Đăng xuất</button>}
   </div>
  </header>
  <main className="main">
   <Routes><Route path="/" element={<TongQuan/>}/><Route path="/cau-thu" element={<CauThu/>}/><Route path="/tran-dau" element={<TranDau/>}/><Route path="/bang-xep-hang" element={<BangXepHang/>}/>
    <Route path="/danh-hieu" element={<DanhHieu/>}/><Route path="/thong-ke" element={<ThongKe/>}/><Route path="/quan-tri" element={<QuanTri/>}/><Route path="/dang-nhap" element={<DangNhap/>}/><Route path="*" element={<Navigate to="/"/>}/></Routes>
  </main>
  <footer className="site-footer">
   <Link to="/" className="footer-brand"><img src="/logo.jpg" alt=""/><span><b>{DOI.ten}</b><small>{DOI.tenPhu}</small></span></Link>
   <p>“Cùng nhau viết tiếp hành trình rực rỡ”</p>
   <span className="footer-copy">© {new Date().getFullYear()} {DOI.ten} {DOI.tenPhu}. By ducdang</span>
  </footer>
 </div>
}
