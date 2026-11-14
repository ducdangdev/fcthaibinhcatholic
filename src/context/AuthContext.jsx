import {createContext,useContext,useEffect,useState} from 'react';import {supabase} from '../lib/supabase';
const Ctx=createContext();export const useAuth=()=>useContext(Ctx);
const khachMoi=()=>supabase.auth.signInAnonymously().then(r=>r.data?.user??null).catch(()=>null);
export function AuthProvider({children}){
 const [user,setUser]=useState(undefined),[vaiTro,setVaiTro]=useState(null);
 useEffect(()=>{
  supabase.auth.getSession().then(async({data})=>setUser(data.session?data.session.user:await khachMoi()));
  const {data:l}=supabase.auth.onAuthStateChange((ev,s)=>{if(s)setUser(s.user);else if(ev==='SIGNED_OUT'){setUser(null);setTimeout(()=>khachMoi().then(setUser),0)}});
  return()=>l.subscription.unsubscribe()},[]);
 useEffect(()=>{if(user===undefined)return;
  if(!user||user.is_anonymous){setVaiTro('member');return}
  setVaiTro(null);supabase.from('profiles').select('vai_tro').eq('id',user.id).single().then(({data})=>setVaiTro(data?.vai_tro??'member'))},[user]);
 const khach=!user||!!user.is_anonymous;
 return <Ctx.Provider value={{user,khach,vaiTro,dangTai:user===undefined||vaiTro===null,laAdmin:!khach&&['admin','super_admin'].includes(vaiTro)}}>{children}</Ctx.Provider>}
