import {DOI} from '../constants/doiBong';
import {Link} from 'react-router-dom';
import {ArrowRight} from 'lucide-react';
export default function Hero({soTran,banThang}){
 return <section className="hero"><div className="hero-chu"><h1>{DOI.ten}</h1><p>{DOI.tenPhu}</p>
  <span className="hero-tagline">Đoàn kết&nbsp; · &nbsp;Thể thao&nbsp; · &nbsp;Vươn xa</span>
  <Link to="/tran-dau" className="hero-button">Xem lịch thi đấu <ArrowRight size={16}/></Link>
  <div className="hero-so"><div><b>{soTran}</b><span>Trận đã đấu</span></div><div><b>{banThang}</b><span>Bàn thắng</span></div></div></div>
  <img className="hero-anh" src="/banner-doi.jpg" alt="Đội bóng Thái Bình trong ngày hội thể dục thể thao 2026"/></section>}
