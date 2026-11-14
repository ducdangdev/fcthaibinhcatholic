import {useState} from 'react';import {Eye,EyeOff} from 'lucide-react';import {Navigate} from 'react-router-dom';import {supabase} from '../lib/supabase';import {useAuth} from '../context/AuthContext';
export default function DangNhap(){
 const {khach}=useAuth();const [email,setEmail]=useState(''),[mk,setMk]=useState(''),[loi,setLoi]=useState(''),[hienMk,setHienMk]=useState(false);
 if(!khach)return <Navigate to="/"/>;
 async function gui(e){e.preventDefault();setLoi('');const {error}=await supabase.auth.signInWithPassword({email,password:mk});
  if(error)setLoi(error.message.includes('Invalid login')?'Email hoặc mật khẩu không đúng':error.message.includes('not confirmed')?'Tài khoản chưa được xác nhận email':'Không đăng nhập được: '+error.message)}
 return <form className="dn" onSubmit={gui}><img src="/logo.jpg" className="avatar" style={{margin:'0 auto',width:84,height:84}} alt=""/><h1 style={{textAlign:'center'}}>Đăng nhập quản trị</h1>
  <input type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} required/>
  <div className="password-field"><input type={hienMk?'text':'password'} placeholder="Mật khẩu" value={mk} onChange={e=>setMk(e.target.value)} required/><button type="button" className="password-toggle" onClick={()=>setHienMk(!hienMk)} aria-label={hienMk?'Ẩn mật khẩu':'Hiện mật khẩu'} aria-pressed={hienMk}>{hienMk?<EyeOff size={18}/>:<Eye size={18}/>}</button></div>
  {loi&&<div className="loi">{loi}</div>}<button>Đăng nhập</button></form>}
