export function tachDiaDiem(value=''){
 const match=value.match(/^(.*?)\s*(?:·|-)\s*Sân số\s+(.+)$/i);
 return match?{dia_diem:match[1],so_san:match[2]}:{dia_diem:value,so_san:''};
}

export function ghepDiaDiem(diaDiem,soSan){
 return `${diaDiem.trim()}${soSan?` - Sân số ${soSan}`:''}`;
}

export function hienDiaDiem(value=''){
 const {dia_diem,so_san}=tachDiaDiem(value);
 return ghepDiaDiem(dia_diem,so_san);
}
