const VERSION = '0.5.1';
const BASE = `./trees/${VERSION}`;
const canvas = document.querySelector('#tree');
const ctx = canvas.getContext('2d', { alpha: false });
const loading = document.querySelector('#loading');
const tooltip = document.querySelector('#tooltip');
const statsEl = document.querySelector('#stats');
const searchInput = document.querySelector('#search');
const resetButton = document.querySelector('#resetTalents');

const state = {
  data: null,
  overlay: null,
  atlases: {},
  cx: 0,
  cy: 0,
  scale: 0.05,
  minScale: 0.015,
  maxScale: 1.8,
  width: 0,
  height: 0,
  dpr: Math.min(2, globalThis.devicePixelRatio || 1),
  dragging: false,
  dragX: 0,
  dragY: 0,
  dragStartX: 0,
  dragStartY: 0,
  hoverKey: null,
  search: '',
  searchMatches: new Set(),
  selected: new Set(),
  serverReady: false,
  totalPoints: 45,
  spentPoints: 0,
  availablePoints: 45,
  effects: {},
  raf: 0,
};

function requestRender() {
  if (state.raf) return;
  state.raf = requestAnimationFrame(() => { state.raf = 0; render(); });
}

async function loadJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${url}: ${response.status}`);
  return response.json();
}

function talentMeta(key) { return state.overlay?.nodes?.[String(key)] || null; }
function talentLinks(key) { return state.overlay?.links?.[String(key)] || []; }
function activeNode(key) { const m = talentMeta(key); return Boolean(m && m.visible !== false); }

function nodeDisplay(key, node) {
  const meta = talentMeta(key);
  return {
    name: meta?.name || 'Passiva do Guerreiro',
    stats: Array.isArray(meta?.stats) ? meta.stats : [],
    category: meta?.category || 'Guerreiro',
    type: meta?.type || (node?.isNotable ? 'notable' : node?.isKeystone ? 'keystone' : 'minor'),
    cost: Number(meta?.cost || 0),
    selectable: meta?.selectable !== false
  };
}

function shortestPathTo(target) {
  if (!target || state.selected.has(target)) return [target];
  const queue = [];
  const previous = new Map();
  const visited = new Set();
  for (const start of state.selected) { queue.push(start); visited.add(start); }
  while (queue.length) {
    const current = queue.shift();
    for (const next of talentLinks(current)) {
      if (visited.has(next)) continue;
      const meta = talentMeta(next);
      if (!meta?.selectable) continue;
      visited.add(next); previous.set(next, current);
      if (next === target) {
        const path = [target]; let p = current;
        while (p) { path.push(p); if (state.selected.has(p)) break; p = previous.get(p); }
        return path.reverse();
      }
      queue.push(next);
    }
  }
  return null;
}

function postToGame(message) {
  if (window.parent === window) return;
  window.parent.postMessage(message, window.location.origin);
}

async function loadAtlas(name) {
  const def = await loadJson(`${BASE}/assets/${name}.json`);
  const image = new Image();
  image.src = `${BASE}/assets/${def.meta.image}`;
  await image.decode();
  const scale = Number.parseFloat(String(def.meta.scale || '1')) || 1;
  return { def, image, scale };
}

function atlasFrame(name, key) {
  const atlas = state.atlases[name];
  const frame = atlas?.def?.frames?.[key]?.frame;
  return frame ? { ...frame, atlas } : null;
}

function spriteSize(frame) { return { w: frame.w / frame.atlas.scale, h: frame.h / frame.atlas.scale }; }

function drawAtlasFrame(name, key, x, y, alpha = 1, targetSize = null) {
  const f = atlasFrame(name, key);
  if (!f) return false;
  const natural = spriteSize(f);
  const w = targetSize?.w ?? natural.w;
  const h = targetSize?.h ?? natural.h;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.drawImage(f.atlas.image, f.x, f.y, f.w, f.h, x - w / 2, y - h / 2, w, h);
  ctx.restore();
  return true;
}

function nodeVisual(key, node) {
  if (!node || node.isMastery || !activeNode(key)) return null;
  const meta = talentMeta(key);
  const icon = meta?.icon || node.icon;
  if (!icon && !node.isJewelSocket) return null;
  let kind = 'normal';
  if (node.isKeystone) kind = 'keystone';
  else if (node.isNotable) kind = 'notable';
  const iconKey = icon ? `${kind}Inactive:${icon}` : null;
  let frameKey = 'frame:PSSkillFrame';
  if (meta?.type === 'start') frameKey = 'frame:NotableFrameUnallocated';
  else if (node.isJewelSocket) frameKey = 'frame:JewelSocketAltNormal';
  else if (node.isKeystone) frameKey = 'frame:KeystoneFrameUnallocated';
  else if (node.isNotable) frameKey = 'frame:NotableFrameUnallocated';
  return { iconKey, fallbackIconKey: icon ? `normalInactive:${icon}` : null, frameKey };
}

function nodeRadius(key, node) {
  if (talentMeta(key)?.type === 'start') return 62;
  if (node?.isKeystone) return 65;
  if (node?.isNotable) return 54;
  if (node?.isJewelSocket) return 45;
  return 30;
}

function resize() {
  const r = canvas.getBoundingClientRect();
  state.width = Math.max(1, r.width);
  state.height = Math.max(1, r.height);
  canvas.width = Math.round(state.width * state.dpr);
  canvas.height = Math.round(state.height * state.dpr);
  requestRender();
}


function visibleWarriorBounds() {
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  for (const [key,n] of Object.entries(state.data.nodes)) {
    if (!activeNode(key) || !Number.isFinite(n.x) || !Number.isFinite(n.y)) continue;
    minX=Math.min(minX,n.x); maxX=Math.max(maxX,n.x); minY=Math.min(minY,n.y); maxY=Math.max(maxY,n.y);
  }
  return {minX,minY,maxX,maxY};
}

function rotatePoint(x, y, cx, cy, angle) {
  const dx=x-cx, dy=y-cy, cos=Math.cos(angle), sin=Math.sin(angle);
  return {x:cx+dx*cos-dy*sin, y:cy+dx*sin+dy*cos};
}

function orientWarriorSection() {
  const d=visibleWarriorBounds();
  if (!Number.isFinite(d.minX)) return;
  const cx=(d.minX+d.maxX)/2, cy=(d.minY+d.maxY)/2;
  // +90°: o lado de entrada que ficava à direita passa a apontar para BAIXO.
  const angle=Math.PI/2;
  for (const node of Object.values(state.data.nodes)) {
    if (!Number.isFinite(node.x)||!Number.isFinite(node.y)) continue;
    const p=rotatePoint(node.x,node.y,cx,cy,angle); node.x=p.x; node.y=p.y;
  }
  for (const group of Object.values(state.data.groups||{})) {
    if (!Number.isFinite(group.x)||!Number.isFinite(group.y)) continue;
    const p=rotatePoint(group.x,group.y,cx,cy,angle); group.x=p.x; group.y=p.y;
  }
  for (const edge of state.data.edges||[]) {
    if (Number.isFinite(edge.orbitX)&&Number.isFinite(edge.orbitY)) {
      const p=rotatePoint(edge.orbitX,edge.orbitY,cx,cy,angle); edge.orbitX=p.x; edge.orbitY=p.y;
    }
  }
}

function mainTreeBounds() {
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  for (const [key,n] of Object.entries(state.data.nodes)) {
    if (!activeNode(key) || !Number.isFinite(n.x) || !Number.isFinite(n.y)) continue;
    minX=Math.min(minX,n.x); maxX=Math.max(maxX,n.x); minY=Math.min(minY,n.y); maxY=Math.max(maxY,n.y);
  }
  return {minX,minY,maxX,maxY};
}

function fitTree() {
  if (!state.data) return;
  const d = mainTreeBounds();
  const pad = 650;
  const w = (d.maxX - d.minX) + pad * 2;
  const h = (d.maxY - d.minY) + pad * 2;
  state.cx = (d.minX + d.maxX) / 2;
  state.cy = (d.minY + d.maxY) / 2;
  state.scale = Math.min(state.width / w, state.height / h);
  state.minScale = state.scale * 0.72;
  requestRender();
}

function zoomAt(factor, sx = state.width / 2, sy = state.height / 2) {
  const beforeX = state.cx + (sx - state.width / 2) / state.scale;
  const beforeY = state.cy + (sy - state.height / 2) / state.scale;
  state.scale = Math.max(state.minScale, Math.min(state.maxScale, state.scale * factor));
  state.cx = beforeX - (sx - state.width / 2) / state.scale;
  state.cy = beforeY - (sy - state.height / 2) / state.scale;
  requestRender();
}

function beginWorldTransform() {
  ctx.setTransform(state.dpr, 0, 0, state.dpr, 0, 0);
  ctx.clearRect(0, 0, state.width, state.height);
  ctx.fillStyle = '#07090c';
  ctx.fillRect(0, 0, state.width, state.height);
  ctx.translate(state.width / 2, state.height / 2);
  ctx.scale(state.scale, state.scale);
  ctx.translate(-state.cx, -state.cy);
}

function visibleBounds(extra = 400) {
  const hw = state.width / (2 * state.scale);
  const hh = state.height / (2 * state.scale);
  return { minX: state.cx - hw - extra, maxX: state.cx + hw + extra, minY: state.cy - hh - extra, maxY: state.cy + hh + extra };
}
function inBounds(x, y, b) { return x >= b.minX && x <= b.maxX && y >= b.minY && y <= b.maxY; }

function drawTiledBackground() {
  const f = atlasFrame('background', 'background:Background2');
  if (!f) return;
  const size = spriteSize(f);
  const b = visibleBounds(0);
  const startX = Math.floor(b.minX / size.w) * size.w;
  const startY = Math.floor(b.minY / size.h) * size.h;
  ctx.save(); ctx.globalAlpha = 0.42;
  for (let y = startY; y <= b.maxY; y += size.h) {
    for (let x = startX; x <= b.maxX; x += size.w) {
      ctx.drawImage(f.atlas.image, f.x, f.y, f.w, f.h, x, y, size.w, size.h);
    }
  }
  ctx.restore();
}

function drawGroupHints() {
  const b = visibleBounds(300);
  ctx.save(); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(104,84,47,.12)';
  for (const group of Object.values(state.data.groups)) {
    if (!inBounds(group.x, group.y, b) || !Array.isArray(group.nodes)) continue;
    const active = group.nodes.filter(key => activeNode(String(key)));
    if (active.length < 4) continue;
    let r = 0;
    for (const key of active) {
      const n = state.data.nodes[String(key)];
      if (!n || !Number.isFinite(n.x) || !Number.isFinite(n.y)) continue;
      r = Math.max(r, Math.hypot(n.x - group.x, n.y - group.y));
    }
    if (r < 70 || r > 900) continue;
    ctx.beginPath(); ctx.arc(group.x, group.y, r + 55, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
}

function traceEdge(edge, a, b) {
  ctx.moveTo(a.x, a.y);
  if (Number.isFinite(edge.orbitX) && Number.isFinite(edge.orbitY)) {
    const cx = edge.orbitX, cy = edge.orbitY;
    const rA = Math.hypot(a.x - cx, a.y - cy), rB = Math.hypot(b.x - cx, b.y - cy);
    if (rA > 1 && rB > 1 && Math.abs(rA - rB) <= rA * .02) {
      const sa = Math.atan2(a.y - cy, a.x - cx), ea = Math.atan2(b.y - cy, b.x - cx);
      let delta = ea - sa;
      while (delta > Math.PI) delta -= Math.PI * 2;
      while (delta < -Math.PI) delta += Math.PI * 2;
      ctx.arc(cx, cy, rA, sa, ea, delta < 0); return;
    }
  }
  ctx.lineTo(b.x, b.y);
}

function drawEdges() {
  const b = visibleBounds(900);
  ctx.save(); ctx.lineCap = 'round'; ctx.lineWidth = 6; ctx.strokeStyle = '#5d5035'; ctx.globalAlpha = .72; ctx.beginPath();
  for (const e of state.data.edges) {
    const ak=String(e.from), bk=String(e.to);
    if (!activeNode(ak) || !activeNode(bk)) continue;
    const a=state.data.nodes[ak], c=state.data.nodes[bk];
    if (!a || !c || (!inBounds(a.x,a.y,b) && !inBounds(c.x,c.y,b))) continue;
    traceEdge(e,a,c);
  }
  for (const e of state.overlay.extraEdges || []) {
    const a=state.data.nodes[String(e.from)], c=state.data.nodes[String(e.to)];
    if (!a || !c || (!inBounds(a.x,a.y,b) && !inBounds(c.x,c.y,b))) continue;
    ctx.moveTo(a.x,a.y); ctx.lineTo(c.x,c.y);
  }
  ctx.stroke(); ctx.restore();
}

function drawNode(key, node, match, selected, hovered) {
  const visual = nodeVisual(key,node); if (!visual) return;
  const r = nodeRadius(key,node);
  if (match || selected || hovered) {
    ctx.save(); ctx.beginPath(); ctx.arc(node.x,node.y,r*1.45,0,Math.PI*2);
    ctx.lineWidth = selected ? 12 : 8;
    ctx.strokeStyle = selected ? '#f1cf70' : (match ? '#52c8ff' : '#dcae55');
    ctx.globalAlpha = match ? .95 : .82; ctx.stroke(); ctx.restore();
  }
  if (visual.iconKey) {
    if (!drawAtlasFrame('skills-disabled', visual.iconKey, node.x, node.y, .96) && visual.fallbackIconKey)
      drawAtlasFrame('skills-disabled', visual.fallbackIconKey, node.x, node.y, .96);
  }
  const framed=drawAtlasFrame('frame',visual.frameKey,node.x,node.y,.98);
  if(!framed){ctx.save();ctx.beginPath();ctx.arc(node.x,node.y,r,0,Math.PI*2);ctx.fillStyle='#171510';ctx.fill();ctx.strokeStyle='#9c7b3d';ctx.lineWidth=5;ctx.stroke();ctx.restore();}
}

function drawNodes() {
  const b=visibleBounds(180), matches=state.searchMatches, hovered=state.hoverKey;
  for (const [key,node] of Object.entries(state.data.nodes)) {
    if (!activeNode(key) || !Number.isFinite(node.x) || !Number.isFinite(node.y) || !inBounds(node.x,node.y,b)) continue;
    drawNode(key,node,matches.has(key),state.selected.has(key),hovered===key);
  }
}

function render() {
  if (!state.data) return;
  beginWorldTransform(); drawTiledBackground(); drawGroupHints(); drawEdges(); drawNodes();
}

function screenToWorld(sx,sy){return{x:state.cx+(sx-state.width/2)/state.scale,y:state.cy+(sy-state.height/2)/state.scale};}
function findNodeAt(sx,sy){
  const p=screenToWorld(sx,sy), worldHit=Math.max(38,15/state.scale); let best=null,bestD=worldHit*worldHit;
  for(const [key,n] of Object.entries(state.data.nodes)){
    if(!activeNode(key)||!Number.isFinite(n.x)||!Number.isFinite(n.y)||!nodeVisual(key,n))continue;
    const dx=n.x-p.x,dy=n.y-p.y,d=dx*dx+dy*dy,rr=Math.max(worldHit,nodeRadius(key,n)*1.15);
    if(d<=rr*rr&&d<bestD){best={key,node:n};bestD=d;}
  }
  return best;
}

function typeName(key,n){
  const type=talentMeta(key)?.type;
  if(type==='start')return 'Caminho Inicial';
  if(type==='keystone')return 'Nó Chave';
  if(type==='notable')return 'Notável';
  if(type==='rune')return 'Encaixe de Runa';
  return 'Passiva';
}

function showTooltip(hit,sx,sy){
  if(!hit){tooltip.style.display='none';return;}
  const n=hit.node,d=nodeDisplay(hit.key,n);
  const route=d.selectable&&!state.selected.has(hit.key)?shortestPathTo(hit.key):null;
  const routeCost=route?route.slice(1).reduce((sum,key)=>sum+Number(talentMeta(key)?.cost||0),0):0;
  const status=state.selected.has(hit.key)?'ATIVO':(!d.selectable?'INDISPONÍVEL':route?`Rota: ${route.length-1} nodes • ${routeCost} pontos`:'Sem rota disponível');
  tooltip.innerHTML=`<div class="name">${escapeHtml(d.name)}</div><div class="type">${escapeHtml(typeName(hit.key,n))} • ${escapeHtml(d.category)}</div>${d.stats.slice(0,8).map(stat=>`<div class="stat">${escapeHtml(stat)}</div>`).join('')}<div class="route">${escapeHtml(status)}${!state.serverReady?' • sincronizando…':''}</div>`;
  tooltip.style.display='block';
  tooltip.style.left=`${Math.min(state.width-372,Math.max(10,sx+14))}px`;
  tooltip.style.top=`${Math.min(state.height-240,Math.max(10,sy+14))}px`;
}
function escapeHtml(v){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

function updateSearch(){
  const q=searchInput.value.trim().toLocaleLowerCase('pt-BR'); state.search=q; state.searchMatches.clear();
  if(q){for(const [key,n] of Object.entries(state.data.nodes)){if(!activeNode(key))continue;const d=nodeDisplay(key,n);const hay=`${d.name} ${d.category} ${d.stats.join(' ')}`.toLocaleLowerCase('pt-BR');if(hay.includes(q))state.searchMatches.add(key);}}
  const visibleCount=Object.values(state.overlay.nodes).filter(m=>m.visible!==false).length;
  statsEl.textContent=`${state.spentPoints}/${state.totalPoints} pontos • ${state.availablePoints} livres • ${visibleCount} nodes${q?` • ${state.searchMatches.size} resultados`:''}`;
  requestRender();
}

canvas.addEventListener('pointerdown',e=>{if(e.button!==0)return;state.dragging=true;state.dragX=e.clientX;state.dragY=e.clientY;state.dragStartX=e.clientX;state.dragStartY=e.clientY;canvas.classList.add('dragging');canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener('pointermove',e=>{
  const r=canvas.getBoundingClientRect(),sx=e.clientX-r.left,sy=e.clientY-r.top;
  if(state.dragging){const dx=e.clientX-state.dragX,dy=e.clientY-state.dragY;state.dragX=e.clientX;state.dragY=e.clientY;state.cx-=dx/state.scale;state.cy-=dy/state.scale;tooltip.style.display='none';requestRender();return;}
  const hit=findNodeAt(sx,sy),next=hit?.key??null;if(next!==state.hoverKey){state.hoverKey=next;requestRender();}showTooltip(hit,sx,sy);
});
function endDrag(e){if(!state.dragging)return;state.dragging=false;canvas.classList.remove('dragging');try{canvas.releasePointerCapture(e.pointerId)}catch{}}
canvas.addEventListener('pointerup',e=>{const moved=Math.hypot(e.clientX-state.dragStartX,e.clientY-state.dragStartY);endDrag(e);if(moved>5)return;const r=canvas.getBoundingClientRect();const hit=findNodeAt(e.clientX-r.left,e.clientY-r.top);if(!hit)return;const meta=talentMeta(hit.key);if(!state.serverReady||!meta?.selectable)return;postToGame({type:'kaetram-talents-toggle',node:hit.key});});
canvas.addEventListener('pointercancel',endDrag);
canvas.addEventListener('pointerleave',e=>{if(!state.dragging){state.hoverKey=null;tooltip.style.display='none';requestRender();}});
canvas.addEventListener('wheel',e=>{e.preventDefault();const r=canvas.getBoundingClientRect();zoomAt(Math.exp(-e.deltaY*.0012),e.clientX-r.left,e.clientY-r.top);},{passive:false});
canvas.addEventListener('dblclick',()=>fitTree());
searchInput.addEventListener('input',updateSearch);
document.querySelector('#fit').addEventListener('click',fitTree);
document.querySelector('#zoomOut').addEventListener('click',()=>zoomAt(.82));
document.querySelector('#zoomIn').addEventListener('click',()=>zoomAt(1.22));
resetButton?.addEventListener('click',()=>{if(state.serverReady&&confirm('Redefinir todos os talentos do Guerreiro?'))postToGame({type:'kaetram-talents-reset'});});
globalThis.addEventListener('resize',resize);

window.addEventListener('message',event=>{
  if(event.origin!==window.location.origin)return;
  const message=event.data;if(message?.type!=='kaetram-talents-sync'||!message.payload)return;
  const data=message.payload;
  state.selected=new Set(Array.isArray(data.selected)?data.selected:[state.overlay?.startNode]);
  state.serverReady=true;state.totalPoints=Number(data.totalPoints||0);state.spentPoints=Number(data.spentPoints||0);state.availablePoints=Number(data.availablePoints||0);state.effects=data.effects||{};
  updateSearch();requestRender();
});

async function boot(){
  try{
    resize();
    const [data,overlay,background,frame,groupBackground,skillsDisabled]=await Promise.all([
      loadJson(`${BASE}/data.json`),loadJson(`${BASE}/kaetram-warrior.json`),
      loadAtlas('background'),loadAtlas('frame'),loadAtlas('group-background'),loadAtlas('skills-disabled')
    ]);
    state.data=data;state.overlay=overlay;state.atlases={background,frame,'group-background':groupBackground,'skills-disabled':skillsDisabled};
    for(const [key,node] of Object.entries(overlay.syntheticNodes||{}))state.data.nodes[key]=node;
    orientWarriorSection();
    state.selected=new Set([overlay.startNode]);
    updateSearch();fitTree();loading.remove();postToGame({type:'kaetram-talents-ready'});
  }catch(error){console.error(error);loading.innerHTML=`<b>Falha ao carregar a árvore</b><div style="max-width:620px;color:#a99579;font:12px Arial,sans-serif">${escapeHtml(error?.message||error)}</div>`;}
}
boot();
