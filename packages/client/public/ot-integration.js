(() => {
    'use strict';

    const VERSION = '2026.08.28-ot4-dnd-vfx';
    const EFFECT_IMAGE = '/img/effects/otsp-effects-v3.png';
    const QUICKBAR_KEY = 'kaetram-ot-warrior-quickbar-v2';
    const QUICK_KEYS = ['1', '2', '3', '4'];
    const EFFECT_ROWS = {
        physical: 0, fire: 1, ice: 2, energy: 3, earth: 4,
        death: 5, holy: 6, water: 7, heal: 8, support: 9
    };
    const EFFECT_META = {
        physical: ['⚔️', '#e6c56d'], fire: ['🔥', '#ff9448'], ice: ['❄️', '#74e5ff'],
        energy: ['⚡', '#6bb6ff'], earth: ['🍃', '#a4ce66'], death: ['☠️', '#a67cc9'],
        holy: ['✨', '#fff1a4'], water: ['💧', '#7bd8ff'], heal: ['💚', '#79e887'], support: ['🛡️', '#72b9ff']
    };

    let game;
    let spells = [];
    let maps = [];
    let warrior = [];
    const byKey = new Map();
    const clientCooldowns = new Map();
    let quickbar = loadQuickbar();

    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    async function fetchJson(path) {
        const response = await fetch(`${path}?v=${encodeURIComponent(VERSION)}`, { cache: 'no-store' });
        if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
        return response.json();
    }

    async function boot() {
        for (let i = 0; i < 240; i++) {
            game = window.__kaetramGame;
            if (game && document.getElementById('game-taskbar')) break;
            await sleep(100);
        }
        if (!game) {
            console.warn('[OT Import V4] Game bridge not found.');
            return;
        }

        try {
            [spells, maps] = await Promise.all([
                fetchJson('/data/ot-spells.json'),
                fetchJson('/data/ot-maps.json')
            ]);
        } catch (error) {
            console.error('[OT Import V4] Could not load catalogues.', error);
            return;
        }

        spells.forEach((spell) => byKey.set(spell.key, spell));
        warrior = spells.filter((spell) => Array.isArray(spell.vocations) &&
            spell.vocations.some((vocation) => vocation === 'knight' || vocation === 'elite knight'));

        installStyles();
        installButtons();
        installNativeWarriorObserver();
        installGlobalKeys();
        await installQuickbarWithRetry();
        window.setInterval(refreshQuickbarCooldowns, 100);
        console.info(`[OT Import V4] Ready: ${spells.length} skills, ${warrior.length} warrior skills, ${maps.length} maps.`);
    }

    function installButtons() {
        const bar = document.getElementById('game-taskbar');
        if (!bar) return;
        document.getElementById('btn-ot-warrior')?.remove();
        document.getElementById('btn-ot-skills')?.remove();
        document.getElementById('btn-ot-maps')?.remove();
        bar.append(
            makeTaskButton('btn-ot-skills', '🪄 OT Skills', openSkills),
            makeTaskButton('btn-ot-maps', '🌀 OT Maps', openMaps)
        );
    }

    function makeTaskButton(id, label, action) {
        const button = document.createElement('button');
        button.id = id;
        button.textContent = label;
        button.className = 'ot-task-button';
        button.onclick = (event) => {
            event.preventDefault();
            button.blur();
            action();
        };
        return button;
    }

    function modal(title, subtitle) {
        document.querySelector('.ot-modal-root')?.remove();
        const root = document.createElement('div');
        root.className = 'ot-modal-root';
        root.innerHTML = `
            <section class="ot-window">
              <header class="ot-head">
                <div><b>${escapeHtml(title)}</b><span>${escapeHtml(subtitle)}</span></div>
                <button data-close>✕</button>
              </header>
              <div class="ot-body"></div>
            </section>`;
        const close = () => root.remove();
        root.querySelector('[data-close]').onclick = close;
        root.onclick = (event) => { if (event.target === root) close(); };
        document.body.appendChild(root);
        return root.querySelector('.ot-body');
    }

    function openSkills() {
        const body = modal('OT SKILLS', `${spells.length} skills importadas • arraste qualquer skill compatível para a barra`);
        let page = 1;
        let query = '';
        let effect = 'all';
        let category = 'all';
        const pageSize = 24;

        body.innerHTML = `
          <div class="ot-toolbar">
            <input data-search placeholder="Buscar por nome, palavras ou key...">
            <select data-effect><option value="all">Todos efeitos</option>${Object.keys(EFFECT_ROWS).map((e) => `<option>${e}</option>`).join('')}</select>
            <select data-category><option value="all">Todas categorias</option></select>
          </div>
          <div class="ot-summary"></div>
          <div class="ot-skill-grid"></div>
          <div class="ot-pager"><button data-prev>◀</button><span></span><button data-next>▶</button></div>`;

        const cats = [...new Set(spells.map((s) => s.category))].sort();
        const catSelect = body.querySelector('[data-category]');
        cats.forEach((cat) => catSelect.insertAdjacentHTML('beforeend', `<option>${escapeHtml(cat)}</option>`));

        const render = () => {
            const needle = query.trim().toLowerCase();
            const filtered = spells.filter((spell) => {
                if (effect !== 'all' && spell.effect !== effect) return false;
                if (category !== 'all' && spell.category !== category) return false;
                if (!needle) return true;
                return `${spell.name} ${spell.words || ''} ${spell.key}`.toLowerCase().includes(needle);
            });
            const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
            page = Math.min(page, pages);
            const list = filtered.slice((page - 1) * pageSize, page * pageSize);
            body.querySelector('.ot-summary').textContent = `${filtered.length} skills • clique para usar ou arraste para um slot 1–4`;
            const grid = body.querySelector('.ot-skill-grid');
            grid.innerHTML = '';
            list.forEach((spell) => grid.appendChild(createSkillCard(spell, false)));
            const pager = body.querySelector('.ot-pager');
            pager.querySelector('span').textContent = `Página ${page}/${pages}`;
            pager.querySelector('[data-prev]').disabled = page <= 1;
            pager.querySelector('[data-next]').disabled = page >= pages;
            pager.querySelector('[data-prev]').onclick = () => { page--; render(); };
            pager.querySelector('[data-next]').onclick = () => { page++; render(); };
        };

        body.querySelector('[data-search]').oninput = (event) => { query = event.target.value; page = 1; render(); };
        body.querySelector('[data-effect]').onchange = (event) => { effect = event.target.value; page = 1; render(); };
        catSelect.onchange = (event) => { category = event.target.value; page = 1; render(); };
        render();
    }

    function installNativeWarriorObserver() {
        const inject = () => {
            const panel = document.getElementById('warrior-skills-panel');
            if (panel) injectNativeWarriorPanel(panel);
        };
        inject();
        const observer = new MutationObserver(() => inject());
        observer.observe(document.body, { childList: true, subtree: true });
    }

    function effectIconData(effect) {
        const [icon, colour] = EFFECT_META[effect] || EFFECT_META.physical;
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><defs><radialGradient id="g"><stop stop-color="${colour}" stop-opacity=".95"/><stop offset="1" stop-color="#09080b"/></radialGradient></defs><rect width="64" height="64" rx="10" fill="url(#g)"/><circle cx="32" cy="32" r="25" fill="none" stroke="#fff" stroke-opacity=".25"/><text x="32" y="40" text-anchor="middle" font-size="29">${icon}</text></svg>`;
        return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
    }

    function injectNativeWarriorPanel(panel) {
        if (panel.dataset.otWarriorInjected === VERSION) return;
        const list = panel.querySelector('.skill-list');
        if (!list) return;
        panel.dataset.otWarriorInjected = VERSION;

        const heading = document.createElement('div');
        heading.className = 'ot-native-warrior-heading';
        heading.innerHTML = `<b>OPEN TIBIA — ${warrior.length} SKILLS DO GUERREIRO</b><span>Arraste para os slots 1–4 da barra inferior</span>`;
        list.appendChild(heading);

        warrior.forEach((spell) => {
            const card = document.createElement('button');
            card.type = 'button';
            card.className = 'skill-card ot-native-warrior-card';
            card.draggable = true;
            card.dataset.otSkill = spell.key;
            const cd = normalizedCooldown(spell);
            card.innerHTML = `<img src="${effectIconData(spell.effect)}" alt=""><div><b>${escapeHtml(spell.name)}</b><span>${escapeHtml(spell.words || spell.key)}</span><small>OT • ${spell.effect} • ${spell.mana || 0} mana • ${(cd / 1000).toFixed(1)}s</small></div>`;
            card.onclick = () => castSpell(spell, card);
            card.onmouseenter = () => showNativeOtDetails(panel, spell);
            card.ondragstart = (event) => {
                event.dataTransfer.effectAllowed = 'copy';
                event.dataTransfer.setData('application/x-kaetram-ot-skill', spell.key);
                event.dataTransfer.setData('text/plain', spell.key);
                card.classList.add('dragging');
            };
            card.ondragend = () => card.classList.remove('dragging');
            list.appendChild(card);
        });
    }

    function showNativeOtDetails(panel, spell) {
        const details = panel.querySelector('.skill-details');
        if (!details) return;
        const [icon, colour] = EFFECT_META[spell.effect] || EFFECT_META.physical;
        const cd = normalizedCooldown(spell);
        details.innerHTML = `
          <div class="skill-detail-title"><img src="${effectIconData(spell.effect)}" alt=""><div><h2>${escapeHtml(spell.name)}</h2><span>${escapeHtml(spell.words || spell.key)}</span></div></div>
          <p>Skill Knight/Elite Knight importada do OTServBR e adaptada ao combate do Kaetram.</p>
          <div class="ot-native-drag-tip">⠿ <b>ARRASTE</b> esta skill para um dos slots <b>1–4</b> da barra. Clique para usar imediatamente.</div>
          <div class="skill-stat-grid">
            <div><span>Efeito</span><b style="color:${colour}">${icon} ${escapeHtml(spell.effect)}</b></div>
            <div><span>Forma</span><b>${escapeHtml(spell.shape)}</b></div>
            <div><span>Mana</span><b>${spell.mana || 0}</b></div>
            <div><span>Cooldown</span><b>${(cd / 1000).toFixed(1)}s</b></div>
            <div><span>Range</span><b>${spell.range || 1}</b></div>
            <div><span>Level OT</span><b>${spell.level || 1}</b></div>
          </div>`;
    }

    function openWarriorSkills() {
        const body = modal('GUERREIRO — OPEN TIBIA', `${warrior.length} skills Knight/Elite Knight • arraste para os slots 1–4 da barra`);
        body.innerHTML = `
          <div class="ot-warrior-intro">
            <b>Drag & Drop ativo.</b> Arraste uma habilidade para um dos quatro slots vazios da barra inferior.
            Depois use <b>1, 2, 3 ou 4</b>, ou clique no slot. Clique com o botão direito no slot para removê-la.
          </div>
          <div class="ot-skill-grid ot-warrior-grid"></div>`;
        const grid = body.querySelector('.ot-warrior-grid');
        warrior.forEach((spell) => grid.appendChild(createSkillCard(spell, true)));
    }

    function createSkillCard(spell, warriorCard) {
        const [icon, colour] = EFFECT_META[spell.effect] || EFFECT_META.physical;
        const cooldown = normalizedCooldown(spell);
        const card = document.createElement('button');
        card.type = 'button';
        card.className = `ot-skill-card${warriorCard ? ' ot-warrior-card' : ''}`;
        card.draggable = true;
        card.dataset.otSkill = spell.key;
        card.style.setProperty('--effect-colour', colour);
        card.innerHTML = `
          <div class="ot-skill-title"><i>${icon}</i><span><b>${escapeHtml(spell.name)}</b><small>${escapeHtml(spell.words || spell.key)}</small></span></div>
          <div class="ot-tags">${warriorCard ? '<em>GUERREIRO</em>' : ''}<em>${escapeHtml(spell.category)}</em><em>${escapeHtml(spell.effect)}</em><em>${escapeHtml(spell.shape)}</em></div>
          <div class="ot-stats">Lv ${spell.level || 1} • Mana ${spell.mana || 0} • CD ${(cooldown / 1000).toFixed(1)}s • Range ${spell.range || 1}</div>
          <div class="ot-cast-label">⠿ ARRASTE PARA BARRA • CLIQUE PARA USAR</div>`;
        card.onclick = () => castSpell(spell, card);
        card.ondragstart = (event) => {
            event.dataTransfer.effectAllowed = 'copy';
            event.dataTransfer.setData('application/x-kaetram-ot-skill', spell.key);
            event.dataTransfer.setData('text/plain', spell.key);
            card.classList.add('dragging');
        };
        card.ondragend = () => card.classList.remove('dragging');
        return card;
    }

    function normalizedCooldown(spell) {
        return Math.max(350, Math.min(30000, Number(spell.cooldown || 1000)));
    }

    function castSpell(spell, card) {
        if (!spell) return;
        const now = Date.now();
        const ready = clientCooldowns.get(spell.key) || 0;
        if (now < ready) {
            if (card) pulseCard(card, `CD ${((ready - now) / 1000).toFixed(1)}s`);
            return;
        }

        if (typeof game.castOtSpell === 'function') game.castOtSpell(spell.key);
        else console.warn('[OT Import V4] castOtSpell bridge unavailable.');

        const cooldown = normalizedCooldown(spell);
        clientCooldowns.set(spell.key, now + cooldown);
        triggerCharacterAnimation(spell);
        spawnEffect(spell.effect || 'physical', spell.shape || 'self');
        if (card) pulseCard(card, 'CAST!');
        refreshQuickbarCooldowns();
    }

    function triggerCharacterAnimation(spell) {
        const shape = String(spell.shape || 'self');
        const effect = String(spell.effect || 'physical');
        let key = 'cleave';
        if (shape === 'area' || shape === 'wave') key = 'whirlwind';
        if (effect === 'support' || effect === 'heal') key = 'warcry';
        window.dispatchEvent(new CustomEvent('kaetram-skill-cast', { detail: { key, otKey: spell.key } }));
        if (effect !== 'support' && effect !== 'heal') {
            const target = game.player?.target;
            window.dispatchEvent(new CustomEvent('kaetram-player-attack', {
                detail: { targetX: target?.x, targetY: target?.y, otKey: spell.key }
            }));
        }
    }

    function pulseCard(card, text) {
        const label = card.querySelector('.ot-cast-label');
        if (!label) return;
        const previous = label.textContent;
        label.textContent = text;
        card.classList.add('casting');
        setTimeout(() => { label.textContent = previous; card.classList.remove('casting'); }, 650);
    }

    async function installQuickbarWithRetry() {
        for (let i = 0; i < 120; i++) {
            if (installQuickbar()) return;
            await sleep(100);
        }
        console.warn('[OT Import V4] Warrior quickbar not found.');
    }

    function installQuickbar() {
        const row = document.querySelector('#warrior-skillbar .arpg-skill-row');
        if (!row) return false;

        let slots = Array.from(row.querySelectorAll('.ot-quick-slot'));
        if (slots.length !== 4) {
            const empties = Array.from(row.querySelectorAll('.arpg-skill-empty')).slice(0, 4);
            if (empties.length < 4) return false;
            slots = empties.map((empty, index) => {
                const slot = document.createElement('button');
                slot.type = 'button';
                slot.className = 'arpg-skill-empty ot-quick-slot';
                slot.dataset.otSlot = String(index);
                empty.replaceWith(slot);
                return slot;
            });
        }

        slots.forEach((slot, index) => bindQuickSlot(slot, index));
        renderQuickbar();
        return true;
    }

    function bindQuickSlot(slot, index) {
        slot.dataset.otSlot = String(index);
        slot.ondragover = (event) => {
            event.preventDefault();
            event.dataTransfer.dropEffect = 'copy';
            slot.classList.add('drag-over');
        };
        slot.ondragleave = () => slot.classList.remove('drag-over');
        slot.ondrop = (event) => {
            event.preventDefault();
            slot.classList.remove('drag-over');
            const key = event.dataTransfer.getData('application/x-kaetram-ot-skill') || event.dataTransfer.getData('text/plain');
            if (!byKey.has(key)) return;
            quickbar[index] = key;
            saveQuickbar();
            renderQuickbar();
        };
        slot.onclick = () => {
            const spell = byKey.get(quickbar[index]);
            if (spell) castSpell(spell, slot);
        };
        slot.oncontextmenu = (event) => {
            event.preventDefault();
            quickbar[index] = '';
            saveQuickbar();
            renderQuickbar();
        };
    }

    function renderQuickbar() {
        const slots = Array.from(document.querySelectorAll('#warrior-skillbar .ot-quick-slot'));
        slots.forEach((slot, index) => {
            const spell = byKey.get(quickbar[index]);
            slot.className = spell ? 'arpg-skill-button ot-quick-slot' : 'arpg-skill-empty ot-quick-slot';
            slot.dataset.otSlot = String(index);
            if (!spell) {
                slot.title = `Slot OT ${QUICK_KEYS[index]} — arraste uma skill aqui`;
                slot.innerHTML = `<span class="skill-hotkey">${QUICK_KEYS[index]}</span><span class="ot-slot-plus">+</span>`;
                return;
            }
            const row = EFFECT_ROWS[spell.effect] ?? 0;
            const [icon, colour] = EFFECT_META[spell.effect] || EFFECT_META.physical;
            slot.style.setProperty('--skill-colour', colour);
            slot.title = `${spell.name} (${QUICK_KEYS[index]}) — botão direito remove`;
            slot.innerHTML = `
              <span class="skill-hotkey">${QUICK_KEYS[index]}</span>
              <span class="ot-slot-icon" style="--row:${row}"></span>
              <span class="ot-slot-element">${icon}</span>
              <i data-ot-cd></i>`;
        });
        refreshQuickbarCooldowns();
    }

    function refreshQuickbarCooldowns() {
        const now = Date.now();
        document.querySelectorAll('#warrior-skillbar .ot-quick-slot').forEach((slot) => {
            const index = Number(slot.dataset.otSlot);
            const key = quickbar[index];
            const cd = slot.querySelector('[data-ot-cd]');
            if (!cd || !key) return;
            const left = Math.max(0, (clientCooldowns.get(key) || 0) - now);
            if (left > 0) {
                cd.style.display = 'flex';
                cd.textContent = left > 1000 ? (left / 1000).toFixed(1) : '0';
                slot.classList.add('cooling');
            } else {
                cd.style.display = 'none';
                cd.textContent = '';
                slot.classList.remove('cooling');
            }
        });
    }

    function installGlobalKeys() {
        window.addEventListener('keydown', (event) => {
            const tag = (document.activeElement?.tagName || '').toLowerCase();
            if (['input', 'textarea', 'select'].includes(tag) || event.ctrlKey || event.altKey || event.metaKey) return;
            const index = QUICK_KEYS.indexOf(event.key);
            if (index < 0) return;
            const spell = byKey.get(quickbar[index]);
            if (!spell) return;
            event.preventDefault();
            castSpell(spell, document.querySelector(`#warrior-skillbar .ot-quick-slot[data-ot-slot="${index}"]`));
        });
    }

    function loadQuickbar() {
        try {
            const raw = JSON.parse(localStorage.getItem(QUICKBAR_KEY) || '[]');
            if (Array.isArray(raw)) return [0, 1, 2, 3].map((i) => String(raw[i] || ''));
        } catch {}
        return ['', '', '', ''];
    }

    function saveQuickbar() {
        localStorage.setItem(QUICKBAR_KEY, JSON.stringify(quickbar));
    }

    function openMaps() {
        const body = modal('OT MAPS', `${maps.length} mapas .otbm • estruturas, piso e colisões importados`);
        body.innerHTML = `<div class="ot-map-grid"></div>`;
        const grid = body.querySelector('.ot-map-grid');
        maps.forEach((map) => {
            const button = document.createElement('button');
            button.className = 'ot-map-card';
            button.innerHTML = `
              <b>${String(map.id).padStart(2, '0')} — ${escapeHtml(map.name)}</b>
              <span>${map.structures || 0} estruturas • ${map.wallStructures || 0} sólidas • ${map.decorations || 0} decorações</span>
              <small>/otmap ${escapeHtml(map.slug)}</small>`;
            button.onclick = () => {
                if (typeof game.sendOtCommand === 'function') game.sendOtCommand(`/otmap ${map.slug}`);
                body.closest('.ot-modal-root')?.remove();
            };
            grid.appendChild(button);
        });
    }

    function spawnEffect(effect, shape) {
        effect = EFFECT_ROWS[effect] === undefined ? 'physical' : effect;
        const row = EFFECT_ROWS[effect];
        const [, colour] = EFFECT_META[effect] || EFFECT_META.physical;
        const target = game.player?.target;
        const useTarget = ['target', 'beam', 'projectile'].includes(String(shape)) && target && Number.isFinite(target.x);
        const entity = useTarget ? target : game.player;
        if (!entity || !game.camera) return;

        const zoom = Number(game.camera.zoomFactor || 1);
        const tileSize = Number(game.map?.tileSize || 16);
        const x = (Number(entity.x || 0) - Number(game.camera.x || 0)) * zoom + tileSize * zoom * 0.5;
        const y = (Number(entity.y || 0) - Number(game.camera.y || 0)) * zoom + tileSize * zoom * 0.35;
        const broad = shape === 'area' || shape === 'wave';
        const size = broad ? 156 : shape === 'beam' ? 132 : 112;

        const fx = document.createElement('div');
        fx.className = `ot-cast-fx ot-shape-${String(shape || 'self')}`;
        fx.style.left = `${x}px`;
        fx.style.top = `${y}px`;
        fx.style.width = `${size}px`;
        fx.style.height = `${size}px`;
        fx.style.setProperty('--fx-colour', colour);

        const sprite = document.createElement('i');
        sprite.className = 'ot-main-sprite';
        sprite.style.width = `${size}px`;
        sprite.style.height = `${size}px`;
        sprite.style.backgroundSize = `${size * 8}px ${size * 10}px`;
        sprite.style.backgroundPositionY = `${-row * size}px`;
        fx.appendChild(sprite);

        const ring = document.createElement('b');
        ring.className = 'ot-fx-ring';
        fx.appendChild(ring);
        for (let i = 0; i < 7; i++) {
            const particle = document.createElement('u');
            particle.className = 'ot-fx-particle';
            const angle = (Math.PI * 2 * i) / 7;
            particle.style.setProperty('--px', `${Math.cos(angle) * size * 0.42}px`);
            particle.style.setProperty('--py', `${Math.sin(angle) * size * 0.42}px`);
            particle.style.animationDelay = `${i * 22}ms`;
            fx.appendChild(particle);
        }
        document.body.appendChild(fx);

        let frame = 0;
        const step = () => {
            sprite.style.backgroundPositionX = `${-frame * size}px`;
            frame++;
            if (frame < 8) window.setTimeout(step, 72);
            else {
                fx.classList.add('fade');
                setTimeout(() => fx.remove(), 260);
            }
        };
        step();
    }

    function installStyles() {
        document.getElementById('ot-import-style')?.remove();
        const style = document.createElement('style');
        style.id = 'ot-import-style';
        style.textContent = `
.ot-task-button{background:rgba(100,65,145,.28)!important;border:1px solid rgba(194,142,255,.42)!important;color:#fff!important;padding:6px 12px;border-radius:6px;cursor:pointer;font-weight:700;white-space:nowrap}.ot-task-button:hover{background:rgba(136,82,196,.55)!important}#btn-ot-warrior{background:rgba(145,79,35,.32)!important;border-color:rgba(241,174,89,.55)!important}
.ot-modal-root{position:fixed;inset:0;z-index:1000002;background:rgba(2,3,6,.82);backdrop-filter:blur(6px);display:grid;place-items:center;padding:22px;font-family:Arial,sans-serif;color:#e9dfc9}.ot-window{width:min(1120px,96vw);max-height:90vh;overflow:hidden;background:linear-gradient(#17161d,#0b0b0f);border:1px solid #7c5d9d;border-radius:12px;box-shadow:0 26px 100px #000;display:flex;flex-direction:column}.ot-head{display:flex;justify-content:space-between;align-items:center;padding:16px 18px;border-bottom:1px solid #493859;background:linear-gradient(90deg,rgba(113,65,149,.25),transparent)}.ot-head b{display:block;font:700 22px Georgia,serif;color:#e4b8ff}.ot-head span{display:block;margin-top:3px;color:#9e96a8;font-size:12px}.ot-head button{width:38px;height:38px;border:1px solid #6e587a;background:#121016;color:#fff;border-radius:7px;cursor:pointer}.ot-body{padding:16px;overflow:auto}
.ot-toolbar{display:grid;grid-template-columns:1fr 180px 190px;gap:9px;margin-bottom:10px}.ot-toolbar input,.ot-toolbar select{background:#090a0d;border:1px solid #4c4253;color:#eee;border-radius:6px;padding:9px}.ot-summary{color:#a89dac;font-size:12px;margin:8px 2px 12px}.ot-warrior-intro{margin:0 0 12px;padding:10px 12px;border:1px solid #5d482c;background:rgba(121,77,31,.12);border-radius:7px;color:#d9c7a7;font-size:12px;line-height:1.45}
.ot-skill-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}.ot-skill-card{--effect-colour:#fff;text-align:left;background:#101116;border:1px solid #34323b;border-left:3px solid var(--effect-colour);color:#ddd;border-radius:8px;padding:10px;cursor:grab;min-height:132px;transition:.15s}.ot-skill-card:hover{transform:translateY(-1px);border-color:var(--effect-colour);background:#171820}.ot-skill-card.dragging{opacity:.5;transform:scale(.98)}.ot-skill-card.casting{box-shadow:0 0 18px var(--effect-colour)}.ot-skill-title{display:flex;gap:9px;align-items:center}.ot-skill-title i{font-style:normal;font-size:24px}.ot-skill-title b{display:block;color:#f0e6c9;font-size:13px}.ot-skill-title small{display:block;color:#918b94;margin-top:2px}.ot-tags{display:flex;gap:4px;flex-wrap:wrap;margin:9px 0}.ot-tags em{font-style:normal;font-size:9px;text-transform:uppercase;padding:3px 5px;border:1px solid #3b3942;border-radius:999px;color:#bbb}.ot-stats{font-size:10px;color:#9c96a0;line-height:1.45}.ot-cast-label{text-align:right;margin-top:6px;font-size:10px;font-weight:800;color:var(--effect-colour)}
.ot-pager{display:flex;justify-content:center;align-items:center;gap:12px;margin-top:14px}.ot-pager button{background:#15131a;border:1px solid #51455c;color:#fff;border-radius:5px;padding:5px 10px;cursor:pointer}.ot-pager button:disabled{opacity:.3}.ot-pager span{font-size:11px;color:#aaa}.ot-map-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.ot-map-card{text-align:left;background:#111218;border:1px solid #383746;color:#ddd;border-radius:8px;padding:12px;cursor:pointer}.ot-map-card:hover{border-color:#9d75c2;background:#181722}.ot-map-card b{display:block;color:#e3c7f5;font:700 14px Georgia,serif}.ot-map-card span{display:block;color:#a3a0aa;font-size:11px;margin:6px 0}.ot-map-card small{color:#8fc6ff}
#warrior-skillbar .ot-quick-slot{position:relative;width:54px;height:54px;min-width:54px;padding:4px;border:0;border-radius:7px;cursor:pointer;color:#ead8ae;overflow:hidden}#warrior-skillbar .ot-quick-slot.drag-over{outline:2px solid #e8c877!important;box-shadow:0 0 18px #e8c877!important;transform:translateY(-3px)}#warrior-skillbar .ot-slot-plus{font:bold 25px Arial;color:#806b48;display:flex;height:100%;align-items:center;justify-content:center}#warrior-skillbar .ot-slot-icon{position:absolute;left:6px;top:6px;width:42px;height:42px;border-radius:4px;background-image:url('${EFFECT_IMAGE}');background-repeat:no-repeat;background-size:336px 420px;background-position:0 calc(var(--row) * -42px);image-rendering:auto;filter:drop-shadow(0 0 5px var(--skill-colour))}#warrior-skillbar .ot-slot-element{position:absolute;right:3px;bottom:1px;z-index:4;font-size:13px;text-shadow:0 1px 2px #000}#warrior-skillbar [data-ot-cd]{position:absolute;inset:3px;z-index:7;display:none;align-items:center;justify-content:center;border-radius:6px;background:rgba(0,0,0,.7);font:700 18px Arial;color:#fff}#warrior-skillbar .ot-quick-slot.cooling .ot-slot-icon{filter:grayscale(.65) brightness(.55)}
.ot-cast-fx{position:fixed;z-index:1000001;pointer-events:none;transform:translate(-50%,-55%);filter:drop-shadow(0 0 16px var(--fx-colour));transition:opacity .24s ease}.ot-main-sprite{position:absolute;inset:0;display:block;background-image:url('${EFFECT_IMAGE}');background-repeat:no-repeat;image-rendering:auto}.ot-fx-ring{position:absolute;inset:18%;border:3px solid var(--fx-colour);border-radius:50%;box-shadow:0 0 16px var(--fx-colour),inset 0 0 12px var(--fx-colour);animation:otRing .62s ease-out forwards}.ot-fx-particle{position:absolute;left:50%;top:50%;width:7px;height:7px;margin:-3px;border-radius:50%;background:var(--fx-colour);box-shadow:0 0 10px var(--fx-colour);animation:otParticle .58s ease-out forwards}.ot-cast-fx.fade{opacity:0}@keyframes otRing{from{transform:scale(.2);opacity:.9}to{transform:scale(1.45);opacity:0}}@keyframes otParticle{from{transform:translate(0,0) scale(1);opacity:1}to{transform:translate(var(--px),var(--py)) scale(.2);opacity:0}}
.ot-native-warrior-heading{grid-column:1/-1;margin:10px 0 5px;padding:9px 10px;border-top:1px solid #6b4d2e;border-bottom:1px solid #40301f;background:linear-gradient(90deg,rgba(151,91,37,.2),transparent);color:#e5c58c}.ot-native-warrior-heading b{display:block;font-size:11px}.ot-native-warrior-heading span{display:block;margin-top:2px;font-size:9px;color:#9f8f77}.ot-native-warrior-card{cursor:grab!important;border-left:2px solid #b78143!important}.ot-native-warrior-card.dragging{opacity:.45}.ot-native-drag-tip{margin:10px 0;padding:8px;border:1px dashed #b78143;background:rgba(183,129,67,.08);color:#d7bd92;font-size:11px}
@media(max-width:800px){.ot-skill-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.ot-toolbar{grid-template-columns:1fr}.ot-map-grid{grid-template-columns:1fr}}@media(max-width:520px){.ot-skill-grid{grid-template-columns:1fr}}
`;
        document.head.appendChild(style);
    }

    function escapeHtml(value) {
        return String(value ?? '').replace(/[&<>'"]/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
    }

    boot();
})();
