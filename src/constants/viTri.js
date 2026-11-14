export const VI_TRI=[
 {ten:'Thủ môn',ma:'GK'},
 {ten:'Hậu vệ',ma:'DF'},
 {ten:'Trung vệ thòng',ma:'CB'},
 {ten:'Hậu vệ cánh phải',ma:'RB'},
 {ten:'Hậu vệ cánh trái',ma:'LB'},
 {ten:'Tiền vệ',ma:'MF'},
 {ten:'Tiền vệ phòng ngự',ma:'DM'},
 {ten:'Tiền vệ trung tâm',ma:'CM'},
 {ten:'Tiền vệ tấn công',ma:'AM'},
 {ten:'Tiền vệ cánh phải',ma:'RM'},
 {ten:'Tiền vệ cánh trái',ma:'LM'},
 {ten:'Tiền đạo',ma:'FW'},
 {ten:'Tiền đạo cánh phải',ma:'RW'},
 {ten:'Tiền đạo cánh trái',ma:'LW'},
 {ten:'Tiền đạo lùi',ma:'SS'},
 {ten:'Tiền đạo cắm',ma:'ST'},
 {ten:'Đa năng',ma:'UT'}
];

export function maViTri(viTri){
 if(viTri==='Trung vệ')return 'CB';
 return VI_TRI.find(v=>v.ten===viTri)?.ma||'';
}

export function chuanHoaViTri(viTri){
 return viTri==='Trung vệ'?'Trung vệ thòng':viTri;
}
