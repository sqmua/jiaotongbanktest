'use strict';
const viewer=document.querySelector('#viewer'), slides=document.querySelector('#slides');
const counter=document.querySelector('#counter'),next=document.querySelector('#next'),previous=document.querySelector('#previous');
const audio=document.querySelector('#audio'),music=document.querySelector('#music');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let current=0,busy=false,musicWanted=true,pointer=null;
function size(){const scale=Math.min(viewer.clientWidth/320,viewer.clientHeight/630);viewer.style.setProperty('--scale',scale);}
new ResizeObserver(size).observe(viewer);size();
function pxStyles(node,styles){const units=new Set(['width','height','top','left','marginLeft','marginTop']);for(const [key,value] of Object.entries(styles||{})){if(units.has(key))node.style[key]=Number(value)+'px';}}
const sections=PAGES.map((page,i)=>{
 const section=document.createElement('section');section.className='slide';section.setAttribute('aria-label',`第 ${i+1} 页`);section.setAttribute('aria-hidden','true');
 const canvas=document.createElement('div');canvas.className='canvas';
 for(const el of page.elements){
  const layer=document.createElement('div');layer.className='layer';pxStyles(layer,el.css);layer.style.top=(el.css.top+74)+'px';layer.style.zIndex=el.css.zIndex;layer.style.opacity=el.css.opacity;layer.style.transform=el.css.transform;
  let parent=layer;
  let elapsed=0;
  for(const animation of el.animations){const motion=document.createElement('div');motion.className='motion';motion.dataset.animation=animation.name;motion.dataset.duration=animation.duration;elapsed+=animation.delay||0;motion.dataset.delay=elapsed;motion.dataset.count=animation.count===1?'infinite':String(animation.countNum||1);elapsed+=(animation.duration||1)*(animation.countNum||1);parent.append(motion);parent=motion;}
  const crop=document.createElement('div');crop.className='crop';const img=document.createElement('img');img.src=el.src;img.alt='';img.draggable=false;img.decoding='async';if(i===0)img.fetchPriority='high';pxStyles(img,el.imageStyle);img.addEventListener('error',()=>{document.querySelector('#error').hidden=false;document.querySelector('#loading').hidden=true;});crop.append(img);parent.append(crop);canvas.append(layer);
 }
 section.append(canvas);slides.append(section);return section;
});
function animateLayers(section){for(const node of section.querySelectorAll('.motion')){node.style.animation='none';}void section.offsetWidth;if(reduced.matches)return;for(const node of section.querySelectorAll('.motion'))node.style.animation=`${node.dataset.animation} ${node.dataset.duration}s ease ${node.dataset.delay}s ${node.dataset.count} both`;}
function state(){sections.forEach((s,i)=>s.setAttribute('aria-hidden',String(i!==current)));counter.value=`${current+1} / ${sections.length}`;counter.textContent=counter.value;previous.disabled=current===0;const end=current===sections.length-1;next.classList.toggle('replay',end);next.textContent=end?'重新浏览':'⌃';next.setAttribute('aria-label',end?'重新浏览':'下一页');}
async function go(index){
 if(busy||index<0||index>=sections.length||index===current)return;
 busy=true;const outgoing=sections[current],incoming=sections[index],forward=index>current;
 incoming.classList.add('active');incoming.style.zIndex='1';outgoing.style.zIndex='3';
 if(!reduced.matches&&outgoing.animate){
  const frames=forward?[{transform:'translateY(0) rotate(0)',opacity:1},{transform:'translateY(15%) rotate(8deg)',opacity:1,offset:.35},{transform:'translateY(110%) rotate(14deg)',opacity:0}]:[{transform:'translateY(0)',opacity:1},{transform:'translateY(-105%)',opacity:0}];
  const animation=outgoing.animate(frames,{duration:650,easing:'ease-in',fill:'forwards'});await animation.finished.catch(()=>{});animation.cancel();
 }
 outgoing.classList.remove('active');outgoing.style.zIndex='';incoming.style.zIndex='';current=index;animateLayers(incoming);state();busy=false;
}
next.addEventListener('click',()=>go(current===sections.length-1?0:current+1));previous.addEventListener('click',()=>go(current-1));
viewer.addEventListener('pointerdown',e=>{if(e.target.closest('button')||!e.isPrimary)return;pointer={x:e.clientX,y:e.clientY,id:e.pointerId};viewer.setPointerCapture(e.pointerId);});
viewer.addEventListener('pointerup',e=>{if(!pointer||pointer.id!==e.pointerId)return;const dy=e.clientY-pointer.y,dx=e.clientX-pointer.x;pointer=null;if(Math.abs(dy)>40&&Math.abs(dy)>Math.abs(dx))go(current+(dy<0?1:-1));});viewer.addEventListener('pointercancel',()=>pointer=null);
let lastWheel=0;viewer.addEventListener('wheel',e=>{e.preventDefault();if(Math.abs(e.deltaY)<15||Date.now()-lastWheel<800)return;lastWheel=Date.now();go(current+(e.deltaY>0?1:-1));},{passive:false});
document.addEventListener('keydown',e=>{if(e.target.closest('button'))return;if(['ArrowDown','PageDown',' '].includes(e.key)){e.preventDefault();go(current+1);}if(['ArrowUp','PageUp'].includes(e.key)){e.preventDefault();go(current-1);}if(e.key==='Home')go(0);if(e.key==='End')go(sections.length-1);});
function syncMusic(){music.setAttribute('aria-pressed',String(!audio.paused));music.setAttribute('aria-label',audio.paused?'播放背景音乐':'暂停背景音乐');}
function startMusic(){if(musicWanted)audio.play().catch(syncMusic);}
music.addEventListener('click',()=>{if(audio.paused){musicWanted=true;startMusic();}else{musicWanted=false;audio.pause();}});audio.addEventListener('play',syncMusic);audio.addEventListener('pause',syncMusic);audio.addEventListener('error',()=>{music.setAttribute('aria-label','音乐加载失败，点击重试');music.textContent='♫';});
document.addEventListener('pointerdown',e=>{if(!e.target.closest('#music'))startMusic();},{once:true});document.addEventListener('keydown',startMusic,{once:true});
document.addEventListener('visibilitychange',()=>{if(document.hidden)audio.pause();else startMusic();});
sections[0].classList.add('active');state();
Promise.all(Array.from(sections[0].querySelectorAll('img'),img=>img.decode().catch(()=>{}))).then(()=>{document.querySelector('#loading').hidden=true;animateLayers(sections[0]);});
