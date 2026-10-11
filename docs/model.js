import {engine} from './core-adapter.js';
export const defaults = {
  version:1, name:'山海之间', width:150, height:100, unit:'mm', dpi:300,
  bleed:{top:3,right:3,bottom:3,left:3}, safe:5,
  front:{mode:'cover',zoom:1,x:.5,y:.5,border:0,background:'#fffdf8'},
  back:{template:'classic',description:'山海之间，一封来自远方的问候。',position:'bottom',signature:'With love,',credit:'',id:'',address:'',lines:4,stamp:true,fontSize:9},
  asset:null
};
export function newProject(){return structuredClone(defaults);}
export function dimensions(p) {
  const w = engine.toMm(Number(p.width),p.unit,Number(p.dpi));
  const h = engine.toMm(Number(p.height),p.unit,Number(p.dpi));
  if (!(w >= 20 && w <= 600 && h >= 20 && h <= 600)) throw Error('成品宽高需要在 20–600 毫米之间。');
  if (!(p.dpi >= 72 && p.dpi <= 1200)) throw Error('导出精度需要在 72–1200 之间。');
  for (const v of Object.values(p.bleed)) if (!(Number.isFinite(v) && v >= 0 && v <= 30)) throw Error('每边裁切余量需要在 0–30 毫米之间。');
  if (!(p.safe >= 0 && p.safe < Math.min(w,h)/2)) throw Error('文字安全距离需要小于成品短边的一半。');
  const ow = w+p.bleed.left+p.bleed.right, oh=h+p.bleed.top+p.bleed.bottom;
  const pw = engine.pixels(ow,p.dpi), ph = engine.pixels(oh,p.dpi);
  if (pw*ph > 40000000 || pw > 12000 || ph > 12000) throw Error('当前导出图片过大，请降低精度或尺寸（单面上限 4000 万像素）。');
  return {w,h,ow,oh,pw,ph};
}
export function restoreProject(value) {
  if (!value || value.version !== 1) throw Error('这不是支持的明信片项目文件。');
  const p = newProject();
  for (const k of ['name','width','height','unit','dpi','safe']) if (k in value) p[k] = value[k];
  p.bleed = {...p.bleed,...value.bleed}; p.front={...p.front,...value.front}; p.back={...p.back,...value.back};
  for (const k of ['width','height','dpi','safe']) p[k]=Number(p[k]);
  for (const k of ['top','right','bottom','left']) p.bleed[k]=Number(p.bleed[k]);
  if (!['cover','contain'].includes(p.front.mode)) throw Error('图片布局设置不正确。');
  for (const k of ['zoom','x','y','border']) p.front[k]=Number(p.front[k]);
  if (!(p.front.zoom>=1&&p.front.zoom<=3&&p.front.x>=0&&p.front.x<=1&&p.front.y>=0&&p.front.y<=1&&p.front.border>=0&&p.front.border<=20)) throw Error('图片裁剪参数超出范围。');
  if (!/^#[0-9a-f]{6}$/i.test(p.front.background)) p.front.background='#fffdf8';
  p.back.lines=Math.max(0,Math.min(7,Number(p.back.lines)||0));
  p.back.fontSize=Math.max(6,Math.min(16,Number(p.back.fontSize)||9));
  if (!['classic','botanical','airmail'].includes(p.back.template)) p.back.template='classic';
  if (!['top','bottom'].includes(p.back.position)) p.back.position='bottom';
  for (const k of ['description','signature','credit','id','address']) p.back[k]=String(p.back[k] ?? '').slice(0,1000);
  p.asset=typeof value.asset==='string'&&/^data:image\/(png|jpeg|webp);base64,/.test(value.asset)?value.asset:null;
  dimensions(p);
  return p;
}
