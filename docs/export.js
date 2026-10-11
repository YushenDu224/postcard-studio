import {renderCard} from './render.js';
import {dimensions} from './model.js';
function canvasBlob(canvas,type,quality){return new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(Error('导出失败，请降低尺寸或精度。')),type,quality));}
export function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);}
function crc32(bytes){let c=0xffffffff;for(const b of bytes){c^=b;for(let j=0;j<8;j++)c=(c>>>1)^((c&1)?0xedb88320:0);}return (c^0xffffffff)>>>0;}
// Canvas defaults to screen-density metadata. Insert the requested print density.
export function addPngDensity(bytes,dpi){
  const ppm=Math.round(dpi/0.0254),chunk=new Uint8Array(21),v=new DataView(chunk.buffer);
  v.setUint32(0,9);chunk.set([112,72,89,115],4);v.setUint32(8,ppm);v.setUint32(12,ppm);chunk[16]=1;v.setUint32(17,crc32(chunk.subarray(4,17)));
  const parts=[bytes.subarray(0,8)];let pos=8,inserted=false;
  while(pos+12<=bytes.length){const len=new DataView(bytes.buffer,bytes.byteOffset+pos,4).getUint32(0),end=pos+len+12;if(end>bytes.length)throw Error('PNG 数据不完整。');const type=String.fromCharCode(...bytes.subarray(pos+4,pos+8));if(type!=='pHYs')parts.push(bytes.subarray(pos,end));if(type==='IHDR'&&!inserted){parts.push(chunk);inserted=true;}pos=end;}
  return new Blob(parts,{type:'image/png'});
}
export async function exportPng(p,image,side){const c=document.createElement('canvas');renderCard(c,p,image,side);const blob=await canvasBlob(c,'image/png');const out=addPngDensity(new Uint8Array(await blob.arrayBuffer()),p.dpi);c.width=1;c.height=1;return out;}
const enc=new TextEncoder();
// Image-based PDF: exact physical dimensions and TrimBox; no screen capture.
export function makePdf(jpegs,d,p){
  const parts=[],offsets=[0];let size=0;
  const add=(value)=>{const b=typeof value==='string'?enc.encode(value):value;parts.push(b);size+=b.length;};
  const object=(id,body)=>{offsets[id]=size;add(`${id} 0 obj\n`);add(body);add('\nendobj\n');};
  const pt=v=>(v*72/25.4).toFixed(5),w=pt(d.ow),h=pt(d.oh);
  add('%PDF-1.4\n%PostcardStudio\n');object(1,'<< /Type /Catalog /Pages 2 0 R >>');object(2,'<< /Type /Pages /Count 2 /Kids [3 0 R 6 0 R] >>');
  jpegs.forEach((jpeg,i)=>{
    const page=3+i*3,img=page+1,content=page+2;
    object(page,`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w} ${h}] /BleedBox [0 0 ${w} ${h}] /TrimBox [${pt(p.bleed.left)} ${pt(p.bleed.bottom)} ${pt(p.bleed.left+d.w)} ${pt(p.bleed.bottom+d.h)}] /Resources << /XObject << /Im0 ${img} 0 R >> >> /Contents ${content} 0 R >>`);
    offsets[img]=size;add(`${img} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${d.pw} /Height ${d.ph} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`);add(jpeg);add('\nendstream\nendobj\n');
    const commands=`q\n${w} 0 0 ${h} 0 0 cm\n/Im0 Do\nQ\n`;object(content,`<< /Length ${enc.encode(commands).length} >>\nstream\n${commands}endstream`);
  });
  const xref=size;add('xref\n0 9\n0000000000 65535 f \n');for(let i=1;i<9;i++)add(`${String(offsets[i]).padStart(10,'0')} 00000 n \n`);add(`trailer\n<< /Size 9 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  return new Blob(parts,{type:'application/pdf'});
}
export async function exportPdf(p,image){const d=dimensions(p),images=[];for(const side of ['front','back']){const c=document.createElement('canvas');renderCard(c,p,image,side);const b=await canvasBlob(c,'image/jpeg',1);images.push(new Uint8Array(await b.arrayBuffer()));c.width=1;c.height=1;}return makePdf(images,d,p);}
