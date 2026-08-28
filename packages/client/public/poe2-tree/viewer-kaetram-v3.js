const VERSION = '0.5.1';
const BASE = `./trees/${VERSION}`;
const canvas = document.querySelector('#tree');
const ctx = canvas.getContext('2d', { alpha: false });
const loading = document.querySelector('#loading');
const tooltip = document.querySelector('#tooltip');
const statsEl = document.querySelector('#stats');
const searchInput = document.querySelector('#search');
const ascendancySelect = document.querySelector('#ascendancy');

const state = {
  data: null,
  atlases: {},
  cx: 0,
  cy: 0,
  scale: 0.03,
  minScale: 0.01,
  maxScale: 1.6,
  width: 0,
  height: 0,
  dpr: Math.min(2, globalThis.devicePixelRatio || 1),
  dragging: false,
  dragX: 0,
  dragY: 0,
  dragStartX: 0,
  dragStartY: 0,
  hoverKey: null,
  selectedAscendancy: 'Warrior1',
  ascendancyTransform: null,
  search: '',
  searchMatches: new Set(),
  selected: new Set(JSON.parse(localStorage.getItem('kaetram-poe-imported-selected') || '[]')),
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

function spriteSize(frame) {
  return { w: frame.w / frame.atlas.scale, h: frame.h / frame.atlas.scale };
}

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

function nodeVisual(node) {
  if (!node || node.isMastery) return null;
  if (!node.icon && !node.isJewelSocket && !node.isAscendancyStart) return null;
  let kind = 'normal';
  if (node.isKeystone) kind = 'keystone';
  else if (node.isNotable) kind = 'notable';
  const iconKey = node.icon ? `${kind}Inactive:${node.icon}` : null;
  let frameKey = 'frame:PSSkillFrame';
  if (node.isAscendancyStart) frameKey = 'frame:AscendancyStartNode';
  else if (node.isJewelSocket) frameKey = 'frame:JewelSocketAltNormal';
  else if (node.isKeystone) frameKey = 'frame:KeystoneFrameUnallocated';
  else if (node.isNotable && node.ascendancyId) frameKey = 'frame:AscendancyFrameNotableUnallocated';
  else if (node.isNotable) frameKey = 'frame:NotableFrameUnallocated';
  else if (node.ascendancyId) frameKey = 'frame:AscendancyFrameNormalUnallocated';
  return { iconKey, frameKey };
}

function nodeRadius(node) {
  if (node?.isKeystone) return 65;
  if (node?.isNotable) return 54;
  if (node?.isAscendancyStart) return 54;
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

function mainTreeBounds() {
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
  for (const n of Object.values(state.data.nodes)) {
    if (n.ascendancyId || !Number.isFinite(n.x) || !Number.isFinite(n.y)) continue;
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
  state.minScale = state.scale * 0.62;
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
  ctx.save();
  ctx.globalAlpha = 0.42;
  for (let y = startY; y <= b.maxY; y += size.h) {
    for (let x = startX; x <= b.maxX; x += size.w) {
      ctx.drawImage(f.atlas.image, f.x, f.y, f.w, f.h, x, y, size.w, size.h);
    }
  }
  ctx.restore();
}

function classStartKeys() {
  const out = [];
  for (const [key, n] of Object.entries(state.data.nodes)) if (Array.isArray(n.classStartIndex)) out.push(key);
  return out;
}

function drawCentralWarriorBackdrop() {
  const starts = classStartKeys().map(k => state.data.nodes[k]).filter(n => Number.isFinite(n.x) && Number.isFinite(n.y));
  if (!starts.length) return;
  const radius = starts.reduce((s,n)=>s+Math.hypot(n.x,n.y),0) / starts.length;
  drawAtlasFrame('background-warrior', 'classWarrior:Class0', 0, 0, 0.56, { w: radius * 2, h: radius * 2 });
  drawAtlasFrame('group-background', 'startNode:MainCircleActive', 0, 0, 0.72, { w: radius * 2 * 1.36, h: radius * 2 * 1.36 });
  drawAtlasFrame('group-background', 'startNode:MainCircle', 0, 0, 0.82, { w: radius * 2 * 1.36, h: radius * 2 * 1.36 });
}

function drawGroupHints() {
  const b = visibleBounds(300);
  ctx.save();
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(104,84,47,.12)';
  for (const group of Object.values(state.data.groups)) {
    if (!inBounds(group.x, group.y, b)) continue;
    if (!Array.isArray(group.nodes) || group.nodes.length < 4) continue;
    let r = 0;
    for (const key of group.nodes) {
      const n = state.data.nodes[key];
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
    const rA = Math.hypot(a.x - cx, a.y - cy);
    const rB = Math.hypot(b.x - cx, b.y - cy);
    if (rA > 1 && rB > 1 && Math.abs(rA - rB) <= rA * .02) {
      const sa = Math.atan2(a.y - cy, a.x - cx);
      const ea = Math.atan2(b.y - cy, b.x - cx);
      let delta = ea - sa;
      while (delta > Math.PI) delta -= Math.PI * 2;
      while (delta < -Math.PI) delta += Math.PI * 2;
      ctx.arc(cx, cy, rA, sa, ea, delta < 0);
      return;
    }
  }
  ctx.lineTo(b.x, b.y);
}

function updateAscendancyTransform() {
  const ascId = state.selectedAscendancy;
  state.ascendancyTransform = null;
  if (!ascId || !state.data) return;
  let start = null;
  for (const n of Object.values(state.data.nodes)) {
    if (n.ascendancyId === ascId && n.isAscendancyStart) { start = n; break; }
  }
  const warrior = state.data.classes.find(c => c.name === 'Warrior');
  const asc = warrior?.ascendancies?.find(a => a.id === ascId);
  if (!start || !asc) return;
  state.ascendancyTransform = { dx: -Number(asc.offsetX || 0) - start.x, dy: -Number(asc.offsetY || 0) - start.y };
}

function visibleNodePosition(node) {
  if (!node.ascendancyId) return { x: node.x, y: node.y };
  if (node.ascendancyId !== state.selectedAscendancy || !state.ascendancyTransform) return null;
  return { x: node.x + state.ascendancyTransform.dx, y: node.y + state.ascendancyTransform.dy };
}

function edgeIsVisible(a,b) {
  if (!a.ascendancyId && !b.ascendancyId) return true;
  return a.ascendancyId === state.selectedAscendancy && b.ascendancyId === state.selectedAscendancy;
}

function drawEdges() {
  const b = visibleBounds(900);
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#5d5035';
  ctx.globalAlpha = .72;
  ctx.beginPath();
  for (const e of state.data.edges) {
    const a = state.data.nodes[String(e.from)], c = state.data.nodes[String(e.to)];
    if (!a || !c || !Number.isFinite(a.x) || !Number.isFinite(a.y) || !Number.isFinite(c.x) || !Number.isFinite(c.y)) continue;
    if (a.isMastery || c.isMastery || !edgeIsVisible(a,c)) continue;
    const ap=visibleNodePosition(a), cp=visibleNodePosition(c);
    if (!ap || !cp || (!inBounds(ap.x,ap.y,b) && !inBounds(cp.x,cp.y,b))) continue;
    if (a.ascendancyId) { ctx.moveTo(ap.x,ap.y); ctx.lineTo(cp.x,cp.y); } else traceEdge(e, ap, cp);
  }
  ctx.stroke();
  ctx.restore();
}

function drawNode(key, node, pos, match, selected, hovered) {
  const visual = nodeVisual(node);
  if (!visual) return;
  const r = nodeRadius(node);
  if (match || selected || hovered) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, r * 1.45, 0, Math.PI * 2);
    ctx.lineWidth = selected ? 12 : 8;
    ctx.strokeStyle = selected ? '#f1cf70' : (match ? '#52c8ff' : '#dcae55');
    ctx.globalAlpha = match ? .95 : .82;
    ctx.stroke();
    ctx.restore();
  }
  if (visual.iconKey) drawAtlasFrame('skills-disabled', visual.iconKey, pos.x, pos.y, node.ascendancyId ? .78 : .96);
  const framed = drawAtlasFrame('frame', visual.frameKey, pos.x, pos.y, node.ascendancyId ? .82 : .98);
  if (!framed) {
    ctx.save(); ctx.beginPath(); ctx.arc(pos.x,pos.y,r,0,Math.PI*2); ctx.fillStyle='#171510'; ctx.fill(); ctx.strokeStyle='#9c7b3d'; ctx.lineWidth=5; ctx.stroke(); ctx.restore();
  }
}

function drawNodes() {
  const b = visibleBounds(180);
  const matches = state.searchMatches;
  const hovered = state.hoverKey;
  for (const [key,node] of Object.entries(state.data.nodes)) {
    if (key === 'root' || !Number.isFinite(node.x) || !Number.isFinite(node.y)) continue;
    const pos=visibleNodePosition(node);
    if (!pos || !inBounds(pos.x,pos.y,b)) continue;
    drawNode(key, node, pos, matches.has(key), state.selected.has(key), hovered === key);
  }
}

function render() {
  if (!state.data) return;
  beginWorldTransform();
  drawTiledBackground();
  drawCentralWarriorBackdrop();
  drawGroupHints();
  drawEdges();
  drawNodes();
}

function screenToWorld(sx, sy) {
  return { x: state.cx + (sx - state.width/2)/state.scale, y: state.cy + (sy - state.height/2)/state.scale };
}

function findNodeAt(sx, sy) {
  const p = screenToWorld(sx, sy);
  const worldHit = Math.max(38, 15 / state.scale);
  let best = null, bestD = worldHit * worldHit;
  for (const [key,n] of Object.entries(state.data.nodes)) {
    if (!Number.isFinite(n.x) || !Number.isFinite(n.y) || !nodeVisual(n)) continue;
    const pos=visibleNodePosition(n); if(!pos) continue;
    const dx=pos.x-p.x, dy=pos.y-p.y, d=dx*dx+dy*dy;
    const rr = Math.max(worldHit, nodeRadius(n)*1.15);
    if (d <= rr*rr && d < bestD) { best={key,node:n}; bestD=d; }
  }
  return best;
}

function typeName(n) {
  if (n.isKeystone) return 'Keystone';
  if (n.isNotable) return n.ascendancyId ? 'Notável de Ascendência' : 'Notável';
  if (n.isJewelSocket) return 'Jewel Socket';
  if (n.isAscendancyStart) return 'Início de Ascendência';
  if (n.classStartIndex) return 'Início de Classe';
  return 'Passiva';
}

function showTooltip(hit, sx, sy) {
  if (!hit) { tooltip.style.display='none'; return; }
  const n=hit.node;
  const name = n.name || n.id || `Node ${hit.key}`;
  const stats = Array.isArray(n.stats) ? n.stats : [];
  tooltip.innerHTML = `<div class="name">${escapeHtml(name)}</div><div class="type">${escapeHtml(typeName(n))}${n.ascendancyId ? ` • ${escapeHtml(n.ascendancyId)}` : ''}</div>${stats.slice(0,8).map(s=>`<div class="stat">${escapeHtml(s)}</div>`).join('')}${stats.length>8?`<div class="stat">+ ${stats.length-8} linhas…</div>`:''}`;
  tooltip.style.display='block';
  const x=Math.min(state.width-372, Math.max(10,sx+14));
  const y=Math.min(state.height-220, Math.max(10,sy+14));
  tooltip.style.left=`${x}px`; tooltip.style.top=`${y}px`;
}

function escapeHtml(v) { return String(v).replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }

function updateSearch() {
  const q = searchInput.value.trim().toLocaleLowerCase('pt-BR');
  state.search=q; state.searchMatches.clear();
  if (q) {
    for (const [key,n] of Object.entries(state.data.nodes)) {
      if (!visibleNodePosition(n)) continue;
      const hay = `${n.name||''} ${(n.stats||[]).join(' ')}`.toLocaleLowerCase('pt-BR');
      if (hay.includes(q)) state.searchMatches.add(key);
    }
  }
  const visibleCount=Object.values(state.data.nodes).filter(n=>visibleNodePosition(n) && !n.isMastery).length;
  statsEl.textContent = `${visibleCount} nodes visíveis • ${state.data.edges.length} conexões no export${q ? ` • ${state.searchMatches.size} resultados` : ''}`;
  requestRender();
}

canvas.addEventListener('pointerdown', e => {
  if (e.button !== 0) return;
  state.dragging=true; state.dragX=e.clientX; state.dragY=e.clientY; state.dragStartX=e.clientX; state.dragStartY=e.clientY; canvas.classList.add('dragging'); canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove', e => {
  const r=canvas.getBoundingClientRect(), sx=e.clientX-r.left, sy=e.clientY-r.top;
  if (state.dragging) {
    const dx=e.clientX-state.dragX, dy=e.clientY-state.dragY; state.dragX=e.clientX; state.dragY=e.clientY;
    state.cx -= dx/state.scale; state.cy -= dy/state.scale; tooltip.style.display='none'; requestRender(); return;
  }
  const hit=findNodeAt(sx,sy); const next=hit?.key ?? null;
  if (next!==state.hoverKey) { state.hoverKey=next; requestRender(); }
  showTooltip(hit,sx,sy);
});
function endDrag(e){ if(!state.dragging)return; state.dragging=false; canvas.classList.remove('dragging'); try{canvas.releasePointerCapture(e.pointerId)}catch{} }
canvas.addEventListener('pointerup', e => {
  const moved = Math.hypot(e.clientX-state.dragStartX,e.clientY-state.dragStartY);
  endDrag(e);
  if (moved > 5) return;
  const r=canvas.getBoundingClientRect(); const hit=findNodeAt(e.clientX-r.left,e.clientY-r.top); if(!hit)return;
  if(state.selected.has(hit.key)) state.selected.delete(hit.key); else state.selected.add(hit.key);
  localStorage.setItem('kaetram-poe-imported-selected', JSON.stringify([...state.selected])); requestRender();
});
canvas.addEventListener('pointercancel', endDrag);
canvas.addEventListener('pointerleave', e => { if(!state.dragging){state.hoverKey=null;tooltip.style.display='none';requestRender();} });
canvas.addEventListener('wheel', e => { e.preventDefault(); const r=canvas.getBoundingClientRect(); zoomAt(Math.exp(-e.deltaY*.0012),e.clientX-r.left,e.clientY-r.top); }, {passive:false});
canvas.addEventListener('dblclick', () => fitTree());
searchInput.addEventListener('input', updateSearch);
ascendancySelect.addEventListener('change', () => { state.selectedAscendancy=ascendancySelect.value; updateAscendancyTransform(); updateSearch(); requestRender(); });
document.querySelector('#fit').addEventListener('click', fitTree);
document.querySelector('#zoomOut').addEventListener('click', ()=>zoomAt(.82));
document.querySelector('#zoomIn').addEventListener('click', ()=>zoomAt(1.22));
globalThis.addEventListener('resize', resize);

async function boot() {
  try {
    resize();
    const [data, background, frame, groupBackground, skillsDisabled, warrior] = await Promise.all([
      loadJson(`${BASE}/data.json`),
      loadAtlas('background'), loadAtlas('frame'), loadAtlas('group-background'), loadAtlas('skills-disabled'), loadAtlas('background-warrior')
    ]);
    state.data=data;
    state.selectedAscendancy=ascendancySelect.value;
    updateAscendancyTransform();
    state.atlases={ background, frame, 'group-background':groupBackground, 'skills-disabled':skillsDisabled, 'background-warrior':warrior };
    updateSearch(); fitTree(); loading.remove();
  } catch (error) {
    console.error(error);
    loading.innerHTML=`<b>Falha ao carregar a árvore</b><div style="max-width:620px;color:#a99579;font:12px Arial,sans-serif">${escapeHtml(error?.message || error)}</div>`;
  }
}
boot();
