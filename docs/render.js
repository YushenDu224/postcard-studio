import {dimensions} from './model.js';
import {engine} from './core-adapter.js';
const font = '"Microsoft YaHei", "PingFang SC", "Segoe UI", sans-serif';
export function imageGeometry(p, image, d) {
  const b=Math.min(p.front.border, Math.min(d.w,d.h)/3);
  const aw=d.w-2*b, ah=d.h-2*b;
  let scale;
  if (p.front.mode==='contain') scale=Math.min(aw/image.naturalWidth,ah/image.naturalHeight);
  else scale=engine.coverScale(image.naturalWidth,image.naturalHeight,aw,ah);
  scale*=p.front.zoom;
  const iw=image.naturalWidth*scale, ih=image.naturalHeight*scale;
  // Position is relative to the finished card; bleed changes never shift the confirmed trim composition.
  return {x:p.bleed.left+b+(aw-iw)*p.front.x, y:p.bleed.top+b+(ah-ih)*p.front.y, w:iw,h:ih,scale,b};
}
export function wrapText(ctx, text, maxWidth) {
  const lines=[];
  for(const paragraph of String(text).split('\n')) {
    let line='';
    for(const ch of paragraph) {
      if(line && ctx.measureText(line+ch).width>maxWidth) {lines.push(line);line=ch;} else line+=ch;
    }
    lines.push(line);
  }
  return lines;
}
function textBlock(ctx,text,x,y,width,height,size,color='#486051') {
  if (!text) return false;
  ctx.font=`${size}px ${font}`;ctx.fillStyle=color;ctx.textBaseline='top';
  const lines=wrapText(ctx,text,width), lineHeight=size*1.65, max=Math.max(0,Math.floor(height/lineHeight));
  ctx.save();ctx.beginPath();ctx.rect(x,y,width,height);ctx.clip();
  lines.slice(0,max).forEach((line,i)=>ctx.fillText(line,x,y+i*lineHeight));ctx.restore();
  return lines.length>max;
}
export function drawBack(ctx,p,d) {
  const warnings=[];
  ctx.save();ctx.translate(p.bleed.left,p.bleed.top);
  const s=Math.max(p.safe,2), xdiv=d.w*.55, leftW=xdiv-2*s-2;
  const color=p.back.template==='airmail'?'#665e58':'#62755c';
  ctx.strokeStyle='#aab39e';ctx.lineWidth=.18;ctx.beginPath();ctx.moveTo(xdiv,s);ctx.lineTo(xdiv,d.h-s);ctx.stroke();
  if(p.back.template==='airmail'){
    ctx.lineWidth=1.1;
    for(let x=3;x<d.w-3;x+=6){ctx.strokeStyle=Math.round(x/6)%2?'#a87965':'#758d9b';ctx.beginPath();ctx.moveTo(x,.9);ctx.lineTo(x+2,2);ctx.moveTo(x,d.h-2);ctx.lineTo(x+2,d.h-.9);ctx.stroke();}
  }
  if(p.back.template==='botanical') {
    ctx.strokeStyle='#819574';ctx.lineWidth=.35;ctx.beginPath();ctx.moveTo(s,s+7);ctx.quadraticCurveTo(s+3,s+4,s+9,s+3);ctx.stroke();
    for(let i=0;i<4;i++){ctx.fillStyle='#a8b69b';ctx.beginPath();ctx.ellipse(s+2+i*2,s+6-i*.75,1.6,.7,-.6,0,Math.PI*2);ctx.fill();}
  }
  const stampW=Math.min(22,(d.w-xdiv-s)*.55),stampH=Math.min(25,d.h*.3);
  if(p.back.stamp){ctx.setLineDash([.7,.7]);ctx.strokeStyle='#b3bba6';ctx.strokeRect(d.w-s-stampW,s,stampW,stampH);ctx.setLineDash([]);ctx.fillStyle='#a0aa91';ctx.font=`${Math.min(2.4,stampW/4)}px ${font}`;ctx.textAlign='center';ctx.fillText('邮票',d.w-s-stampW/2,s+stampH/2);ctx.textAlign='left';}
  const size=p.back.fontSize*25.4/72, sigSize=size*1.05;
  const credit=p.back.credit;
  const descH=Math.min(d.h*.24, size*1.65*3);
  const sigH=sigSize*1.65*2;
  const creditH=credit?size*.8*1.65*2:0;
  const bottom=d.h-s-creditH-sigH-2;
  const descY=p.back.position==='top'?s+(p.back.template==='botanical'?9:0):bottom-descH-3;
  if(textBlock(ctx,p.back.description,s,Math.max(s,descY),leftW,descH,size,color)) warnings.push('图片介绍过长，部分文字放不下；请缩短内容或减小字号。');
  if(textBlock(ctx,p.back.signature,s,bottom,leftW,sigH,sigSize,color)) warnings.push('署名过长，请缩短内容或减小字号。');
  if(credit&&textBlock(ctx,credit,s,d.h-s-creditH,leftW,creditH,size*.8,'#89927d')) warnings.push('作品信息过长，请缩短内容。');
  if(p.back.id&&textBlock(ctx,`ID: ${p.back.id}`,s,Math.max(s+8,d.h*.38),leftW,size*1.7,Math.min(size,3.2),color)) warnings.push('ID 放不下，请缩小字号。');
  if(descY<s || bottom<s+descH) warnings.push('背面空间较小，请减少文字或缩小字号。');
  const addrX=xdiv+4,addrW=d.w-addrX-s,addrY=Math.max(d.h*.49,s+stampH+4),addrH=d.h-s-addrY;
  if(p.back.address){if(textBlock(ctx,p.back.address,addrX,addrY,addrW,addrH,size,color)) warnings.push('收件地址放不下，请减小字号或调整尺寸。');}
  else if(p.back.lines){ctx.strokeStyle='#b4bba7';ctx.lineWidth=.17;const gap=addrH/(p.back.lines+1);for(let i=1;i<=p.back.lines;i++){ctx.beginPath();ctx.moveTo(addrX,addrY+i*gap);ctx.lineTo(d.w-s,addrY+i*gap);ctx.stroke();}}
  ctx.restore();return warnings;
}
export function renderCard(canvas,p,image,side,{preview=false,guides=false}={}) {
  const d=dimensions(p), width=preview?Math.min(1400,d.pw):d.pw,height=preview?Math.round(width*d.oh/d.ow):d.ph;
  canvas.width=width;canvas.height=height;
  const ctx=canvas.getContext('2d');ctx.setTransform(width/d.ow,0,0,height/d.oh,0,0);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  ctx.fillStyle=side==='front'?p.front.background:'#fffdf8';ctx.fillRect(0,0,d.ow,d.oh);
  let warnings=[];
  if(side==='front'&&image){const g=imageGeometry(p,image,d);ctx.save();if(g.b>0){ctx.beginPath();ctx.rect(p.bleed.left+g.b,p.bleed.top+g.b,d.w-2*g.b,d.h-2*g.b);ctx.clip();}ctx.drawImage(image,g.x,g.y,g.w,g.h);ctx.restore();
    if(p.front.mode==='cover'&&!g.b&&(g.x>.01||g.y>.01||g.x+g.w<d.ow-.01||g.y+g.h<d.oh-.01)) warnings.push('原图未覆盖全部裁切余量，边缘会留白；可放大图片或保留边框设计。');
  } else if(side==='back') warnings=drawBack(ctx,p,d);
  if(preview&&guides){ctx.strokeStyle='#ffffffcc';ctx.lineWidth=.28;ctx.setLineDash([1.6,1]);ctx.strokeRect(p.bleed.left,p.bleed.top,d.w,d.h);ctx.strokeStyle='#6c856ba8';ctx.lineWidth=.2;ctx.setLineDash([1,1]);ctx.strokeRect(p.bleed.left+p.safe,p.bleed.top+p.safe,d.w-2*p.safe,d.h-2*p.safe);ctx.setLineDash([]);}
  return {d,warnings};
}
