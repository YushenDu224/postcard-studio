import {initializeCore,engine} from './core-adapter.js';
import {newProject,dimensions,restoreProject} from './model.js';
import {renderCard,imageGeometry} from './render.js';
import {exportPng,exportPdf,download} from './export.js';
import {readDraft,saveDraft,clearDraft} from './storage.js';
const $=id=>document.getElementById(id);
let project=newProject(),image,side='front',valid=false,busy=false,remember=false,saveTimer,saveQueue=Promise.resolve(),toastTimer;
const canvas=$('preview');
function toast(text){$('toast').textContent=text;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),4500);}
function saveSoon(){clearTimeout(saveTimer);if(!remember||!valid)return;saveTimer=setTimeout(()=>{const snapshot=structuredClone(project);saveQueue=saveQueue.then(()=>saveDraft(snapshot)).catch(()=>toast('本机草稿保存失败，请用“保存项目”备份。'));},500);}
function render(){
  try{
    const d=dimensions(project);valid=true;
    const {warnings}=renderCard(canvas,project,image,side,{preview:true,guides:$('guides').checked});
    $('card-size').textContent=`${d.w.toFixed(1).replace(/\.0$/,'')} × ${d.h.toFixed(1).replace(/\.0$/,'')} mm`;
    $('output-dimensions').textContent=`${d.pw} × ${d.ph} px`;
    $('export-summary').textContent=`输出 ${d.ow.toFixed(1)} × ${d.oh.toFixed(1)} mm · ${project.dpi} 精度 · 正反面`;
    $('zoom-value').textContent=`${Math.round(project.front.zoom*100)}%`;
    const bleeds=Object.values(project.bleed);$('bleed-label').textContent=bleeds.every(v=>v===bleeds[0])?`每边 ${bleeds[0]} mm`:'四边分别设置';
    if(image){const g=imageGeometry(project,image,d),effective=25.4/g.scale,good=effective>=project.dpi;
      $('quality-title').textContent=good?'原图清晰度满足当前精度':'原图清晰度低于导出精度';
      $('quality-detail').textContent=`裁剪后有效精度约 ${Math.round(effective)} 像素/英寸${good?'':'；可换原图、减少放大或缩小成品尺寸。'}`;
      $('quality-icon').textContent=good?'✓':'!';
    }
    if(side==='front') {const probe=document.createElement('canvas');const back=renderCard(probe,project,image,'back',{preview:true});warnings.push(...back.warnings);probe.width=1;probe.height=1;}
    $('validation').textContent=[...new Set(warnings)].join(' ');
  }catch(e){valid=false;$('validation').textContent=e.message;}
  for(const id of ['export-pdf','export-front','export-back','save-project'])$(id).disabled=!valid||busy;
  saveSoon();
}
function updateControls(){
  for(const id of ['width','height','unit','dpi','safe'])$(id).value=project[id];
  for(const input of document.querySelectorAll('[data-bleed]'))input.value=project.bleed[input.dataset.bleed];
  $('bleed-all').value=project.bleed.top;
  for(const [id,key] of [['mode','mode'],['zoom','zoom'],['border','border'],['background','background']])$(id).value=project.front[key];
  for(const [id,key] of [['description','description'],['position','position'],['signature','signature'],['credit','credit'],['postcard-id','id'],['address','address'],['lines','lines'],['font-size','fontSize']])$(id).value=project.back[key];
  $('stamp').checked=project.back.stamp;
  document.querySelectorAll('[data-template]').forEach(b=>b.classList.toggle('active',b.dataset.template===project.back.template));
}
async function loadImage(src){const img=new Image();img.src=src;await img.decode();if(img.naturalWidth*img.naturalHeight>80000000)throw Error('原图超过 8000 万像素，请先缩小后选择。');image=img;}
function initialZoom(){const d=dimensions(project);return Math.max(1,Math.min(3,engine.coverScale(image.naturalWidth,image.naturalHeight,d.ow,d.oh)/engine.coverScale(image.naturalWidth,image.naturalHeight,d.w,d.h)));}
async function chooseSample(){await loadImage('./sample.svg');project.asset=null;project.front.x=.5;project.front.y=.5;project.front.zoom=initialZoom();updateControls();render();}
for(const id of ['width','height','dpi','safe'])$(id).addEventListener('input',()=>{project[id]=Number($(id).value);render();});
$('unit').addEventListener('change',()=>{const next=$('unit').value,w=engine.toMm(project.width,project.unit,project.dpi),h=engine.toMm(project.height,project.unit,project.dpi);const convert=v=>next==='cm'?v/10:next==='in'?v/25.4:next==='px'?Math.round(v/25.4*project.dpi):v;project.width=Number(convert(w).toFixed(5));project.height=Number(convert(h).toFixed(5));project.unit=next;updateControls();render();});
document.querySelectorAll('[data-size]').forEach(b=>b.addEventListener('click',()=>{[project.width,project.height]=b.dataset.size.split(',').map(Number);project.unit='mm';updateControls();render();}));
$('bleed-all').addEventListener('input',()=>{for(const k of Object.keys(project.bleed))project.bleed[k]=Number($('bleed-all').value);updateControls();render();});
document.querySelectorAll('[data-bleed]').forEach(input=>input.addEventListener('input',()=>{project.bleed[input.dataset.bleed]=Number(input.value);render();}));
for(const [id,key,num] of [['mode','mode',false],['zoom','zoom',true],['border','border',true],['background','background',false]])$(id).addEventListener('input',()=>{project.front[key]=num?Number($(id).value):$(id).value;render();});
for(const [id,key,num] of [['description','description',false],['position','position',false],['signature','signature',false],['credit','credit',false],['postcard-id','id',false],['address','address',false],['lines','lines',true],['font-size','fontSize',true]])$(id).addEventListener('input',()=>{project.back[key]=num?Number($(id).value):$(id).value;render();});
$('stamp').addEventListener('change',()=>{project.back.stamp=$('stamp').checked;render();});
document.querySelectorAll('[data-template]').forEach(b=>b.addEventListener('click',()=>{project.back.template=b.dataset.template;side='back';updateControls();updateTabs();render();}));
function updateTabs(){for(const s of ['front','back'])$(`${s}-tab`).setAttribute('aria-selected',String(side===s));$('stage-note').textContent=side==='front'?'一张小小的纸，装下大大的世界。':'留下你的心意，也留出手写的空间。';}
for(const s of ['front','back'])$(`${s}-tab`).addEventListener('click',()=>{side=s;updateTabs();render();});
$('guides').addEventListener('change',render);
$('reset-crop').addEventListener('click',()=>{project.front.zoom=project.front.mode==='cover'?initialZoom():1;project.front.x=.5;project.front.y=.5;updateControls();render();});
$('sample').addEventListener('click',()=>chooseSample().catch(e=>toast(e.message)));
$('choose-image').addEventListener('click',()=>$('image-input').click());
const asDataUrl=file=>new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(Error('读取文件失败。'));r.readAsDataURL(file);});
$('image-input').addEventListener('change',async()=>{
  const file=$('image-input').files[0];if(!file)return;
  try{if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw Error('请选择 JPG、PNG 或 WebP 图片。');if(file.size>40000000)throw Error('图片超过 40 MB，请先缩小文件。');
    const src=await asDataUrl(file);await loadImage(src);project.asset=src;project.name=file.name.replace(/\.[^.]+$/,'');project.front.zoom=project.front.mode==='cover'?initialZoom():1;project.front.x=.5;project.front.y=.5;side='front';updateTabs();updateControls();render();toast('图片已在本机打开。');
  }catch(e){toast(e.message);}finally{$('image-input').value='';}
});
let drag;
canvas.addEventListener('pointerdown',e=>{if(side!=='front'||!valid||!image)return;canvas.setPointerCapture(e.pointerId);drag={x:e.clientX,y:e.clientY,fx:project.front.x,fy:project.front.y};});
canvas.addEventListener('pointermove',e=>{if(!drag)return;const d=dimensions(project),g=imageGeometry(project,image,d),r=canvas.getBoundingClientRect();const dx=(e.clientX-drag.x)*d.ow/r.width,dy=(e.clientY-drag.y)*d.oh/r.height;const ax=d.w-2*g.b-g.w,ay=d.h-2*g.b-g.h;project.front.x=Math.max(0,Math.min(1,drag.fx+(Math.abs(ax)>.01?dx/ax:0)));project.front.y=Math.max(0,Math.min(1,drag.fy+(Math.abs(ay)>.01?dy/ay:0)));render();});
for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,()=>drag=null);
canvas.addEventListener('keydown',e=>{if(side!=='front'||!valid)return;const directions={ArrowLeft:[-.02,0],ArrowRight:[.02,0],ArrowUp:[0,-.02],ArrowDown:[0,.02]};if(!directions[e.key])return;e.preventDefault();const [dx,dy]=directions[e.key];project.front.x=Math.max(0,Math.min(1,project.front.x+dx));project.front.y=Math.max(0,Math.min(1,project.front.y+dy));render();});
const fileName=()=>String(project.name||'明信片').replace(/[\\/:*?"<>|\x00-\x1f]/g,'_').slice(0,80);
async function withExport(work){if(!valid||busy)return;busy=true;render();toast('正在本机生成印刷文件…');try{await new Promise(r=>setTimeout(r,30));await work();toast('文件已生成，请检查下载。');}catch(e){toast(e.message||'导出失败，请降低精度后重试。');}finally{busy=false;render();}}
$('export-pdf').addEventListener('click',()=>withExport(async()=>download(await exportPdf(project,image),`${fileName()}-双面.pdf`)));
for(const s of ['front','back'])$(`export-${s}`).addEventListener('click',()=>withExport(async()=>download(await exportPng(project,image,s),`${fileName()}-${s==='front'?'正面':'背面'}.png`)));
$('save-project').addEventListener('click',()=>{download(new Blob([JSON.stringify(project)],{type:'application/json'}),`${fileName()}.postcard.json`);toast('项目包含原图及输入的文字、地址，请妥善保管。');});
$('import-project').addEventListener('click',()=>$('project-input').click());
$('project-input').addEventListener('change',async()=>{const file=$('project-input').files[0];if(!file)return;try{if(file.size>100000000)throw Error('项目文件超过 100 MB。');const p=restoreProject(JSON.parse(await file.text()));await loadImage(p.asset||'./sample.svg');project=p;updateControls();render();toast('项目已恢复，可以继续编辑。');}catch(e){toast(e.message||'项目文件无法打开。');}finally{$('project-input').value='';}});
$('remember').addEventListener('change',async()=>{remember=$('remember').checked;clearTimeout(saveTimer);if(remember){saveSoon();toast('草稿将只保存在这台设备。');}else{await saveQueue;await clearDraft().catch(()=>toast('清除失败，请在浏览器设置中清理站点数据。'));toast('已关闭自动保存并清除本机草稿。');}});
$('clear-local').addEventListener('click',async()=>{remember=false;$('remember').checked=false;clearTimeout(saveTimer);try{await saveQueue;await clearDraft();toast('本机草稿已清除，当前编辑内容仍在本次页面中。');}catch{toast('清除失败，请在浏览器设置中清理站点数据。');}});
async function boot(){
  document.documentElement.dataset.core=await initializeCore();
  try{const draft=await readDraft();if(draft){project=restoreProject(draft);remember=true;$('remember').checked=true;}}catch{/* Private mode can disable persistent storage; editing remains available. */}
  await loadImage(project.asset||'./sample.svg');if(!remember)project.front.zoom=initialZoom();updateControls();render();
  if('serviceWorker' in navigator){try{await navigator.serviceWorker.register('./sw.js');await navigator.serviceWorker.ready;$('offline-status').textContent='离线资源已准备好，下次可断网打开。';}catch{$('offline-status').textContent='离线资源暂未准备好；仍可导出项目文件备份。';}}else $('offline-status').textContent='此浏览器暂不支持离线资源缓存。';
}
boot().catch(e=>{$('validation').textContent=`启动失败：${e.message}`;});
