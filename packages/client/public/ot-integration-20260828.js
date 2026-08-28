(() => {
    'use strict';

    const VERSION = '2026.08.28-ot3-warrior';
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
    const clientCooldowns = new Map();

    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    async function fetchJson(path) {
        const response = await fetch(`${path}?v=${encodeURIComponent(VERSION)}`, { cache: 'no-store' });
        if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
        return response.json();
    }

    async function boot() {
        for (let i = 0; i < 200; i++) {
            game = window.__kaetramGame;
            if (game && document.getElementById('game-taskbar')) break;
            await sleep(100);
        }

        if (!game) {
            console.warn('[OT Import] Game bridge not found.');
            return;
        }

        try {
            [spells, maps] = await Promise.all([
                fetchJson('/data/ot-spells.json'),
                fetchJson('/data/ot-maps.json')
            ]);
        } catch (error) {
            console.error('[OT Import] Could not load catalogues.', error);
            return;
        }

        installStyles();
        installButtons();
        console.info(`[OT Import] Ready: ${spells.length} skills, ${maps.length} maps.`);
    }

    function installButtons() {
        const bar = document.getElementById('game-taskbar');
        if (!bar || document.getElementById('btn-ot-skills')) return;

        const warriorButton = makeTaskButton('btn-ot-warrior', '⚔️ Guerreiro OT', openWarriorSkills);
        const skillButton = makeTaskButton('btn-ot-skills', '🪄 OT Skills', openSkills);
        const mapButton = makeTaskButton('btn-ot-maps', '🌀 OT Maps', openMaps);
        bar.append(warriorButton, skillButton, mapButton);
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
        const body = modal('OT SKILLS', `${spells.length} skills importadas do OTServBR • efeitos OpenTibia Sprite Pack`);
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
            body.querySelector('.ot-summary').textContent = `${filtered.length} skills encontradas • clique para conjurar`;
            const grid = body.querySelector('.ot-skill-grid');
            grid.innerHTML = '';

            for (const spell of list) {
                const [icon, colour] = EFFECT_META[spell.effect] || EFFECT_META.physical;
                const cooldown = Math.max(350, Math.min(30000, spell.cooldown || 1000));
                const card = document.createElement('button');
                card.className = 'ot-skill-card';
                card.style.setProperty('--effect-colour', colour);
                card.innerHTML = `
                  <div class="ot-skill-title"><i>${icon}</i><span><b>${escapeHtml(spell.name)}</b><small>${escapeHtml(spell.words || spell.key)}</small></span></div>
                  <div class="ot-tags"><em>${escapeHtml(spell.category)}</em><em>${escapeHtml(spell.effect)}</em><em>${escapeHtml(spell.shape)}</em></div>
                  <div class="ot-stats">Lv ${spell.level || 1} • Mana OT ${spell.mana || 0} • CD ${(cooldown / 1000).toFixed(1)}s • Range ${spell.range || 1}</div>
                  <div class="ot-cast-label">CONJURAR</div>`;
                card.onclick = () => castSpell(spell, card);
                grid.appendChild(card);
            }
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


    function openWarriorSkills() {
        const warrior = spells.filter((spell) => Array.isArray(spell.vocations) &&
            spell.vocations.some((vocation) => vocation === 'knight' || vocation === 'elite knight'));
        const body = modal('GUERREIRO — OPEN TIBIA', `${warrior.length} skills Knight/Elite Knight • todas com VFX OpenTibia`);
        body.innerHTML = `
          <div class="ot-warrior-intro">As skills abaixo fazem parte do arsenal importado do Guerreiro. Ataques, cura e suporte usam os mesmos dados de mana/cooldown/range do catálogo OT adaptados ao Kaetram.</div>
          <div class="ot-skill-grid ot-warrior-grid"></div>`;
        const grid = body.querySelector('.ot-warrior-grid');
        warrior.forEach((spell) => {
            const [icon, colour] = EFFECT_META[spell.effect] || EFFECT_META.physical;
            const cooldown = Math.max(350, Math.min(30000, spell.cooldown || 1000));
            const card = document.createElement('button');
            card.className = 'ot-skill-card ot-warrior-card';
            card.style.setProperty('--effect-colour', colour);
            card.innerHTML = `
              <div class="ot-skill-title"><i>${icon}</i><span><b>${escapeHtml(spell.name)}</b><small>${escapeHtml(spell.words || spell.key)}</small></span></div>
              <div class="ot-tags"><em>GUERREIRO</em><em>${escapeHtml(spell.category)}</em><em>${escapeHtml(spell.effect)}</em><em>${escapeHtml(spell.shape)}</em></div>
              <div class="ot-stats">Lv ${spell.level || 1} • Mana OT ${spell.mana || 0} • CD ${(cooldown / 1000).toFixed(1)}s • Range ${spell.range || 1}</div>
              <div class="ot-cast-label">CONJURAR</div>`;
            card.onclick = () => castSpell(spell, card);
            grid.appendChild(card);
        });
    }

    function castSpell(spell, card) {
        const now = Date.now();
        const ready = clientCooldowns.get(spell.key) || 0;
        if (now < ready) {
            pulseCard(card, `CD ${((ready - now) / 1000).toFixed(1)}s`);
            return;
        }

        if (typeof game.castOtSpell === 'function') game.castOtSpell(spell.key);
        else console.warn('[OT Import] castOtSpell bridge is unavailable.');

        const cooldown = Math.max(350, Math.min(30000, spell.cooldown || 1000));
        clientCooldowns.set(spell.key, now + cooldown);
        spawnEffect(spell.effect || 'physical', spell.shape || 'self');
        pulseCard(card, 'CAST!');
    }

    function pulseCard(card, text) {
        const label = card.querySelector('.ot-cast-label');
        if (!label) return;
        const previous = label.textContent;
        label.textContent = text;
        card.classList.add('casting');
        setTimeout(() => { label.textContent = previous; card.classList.remove('casting'); }, 650);
    }

    function openMaps() {
        const body = modal('OT MAPS', `${maps.length} mapas .otbm convertidos estruturalmente para Kaetram`);
        body.innerHTML = `<div class="ot-map-grid"></div>`;
        const grid = body.querySelector('.ot-map-grid');
        maps.forEach((map) => {
            const button = document.createElement('button');
            button.className = 'ot-map-card';
            button.innerHTML = `
              <b>${String(map.id).padStart(2, '0')} — ${escapeHtml(map.name)}</b>
              <span>Tema: ${escapeHtml(map.theme)} • source Z:${map.sourceZ} • ${map.sourceTiles} tiles • ${map.structures || 0} estruturas</span>
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
        const [_, colour] = EFFECT_META[effect] || EFFECT_META.physical;
        const entity = (shape === 'target' && game.player?.target && Number.isFinite(game.player.target.x))
            ? game.player.target : game.player;
        if (!entity || !game.camera) return;

        const zoom = Number(game.camera.zoomFactor || 1);
        const tileSize = Number(game.map?.tileSize || 16);
        const x = (Number(entity.x || 0) - Number(game.camera.x || 0)) * zoom + tileSize * zoom * 0.5;
        const y = (Number(entity.y || 0) - Number(game.camera.y || 0)) * zoom + tileSize * zoom * 0.35;
        const size = shape === 'area' || shape === 'wave' ? 144 : shape === 'beam' ? 128 : 104;

        const fx = document.createElement('div');
        fx.className = 'ot-cast-fx';
        fx.style.left = `${x}px`;
        fx.style.top = `${y}px`;
        fx.style.width = `${size}px`;
        fx.style.height = `${size}px`;
        fx.style.setProperty('--fx-colour', colour);
        const sprite = document.createElement('i');
        sprite.style.width = `${size}px`;
        sprite.style.height = `${size}px`;
        sprite.style.backgroundSize = `${size * 8}px ${size * 10}px`;
        sprite.style.backgroundPositionY = `${-row * size}px`;
        fx.appendChild(sprite);
        document.body.appendChild(fx);

        let frame = 0;
        const timer = setInterval(() => {
            sprite.style.backgroundPositionX = `${-frame * size}px`;
            frame++;
            if (frame >= 8) {
                clearInterval(timer);
                fx.classList.add('fade');
                setTimeout(() => fx.remove(), 220);
            }
        }, 65);
    }

    function installStyles() {
        if (document.getElementById('ot-import-style')) return;
        const style = document.createElement('style');
        style.id = 'ot-import-style';
        style.textContent = `
.ot-task-button{background:rgba(100,65,145,.28)!important;border:1px solid rgba(194,142,255,.42)!important;color:#fff!important;padding:6px 12px;border-radius:6px;cursor:pointer;font-weight:700;white-space:nowrap}
.ot-task-button:hover{background:rgba(136,82,196,.55)!important}#btn-ot-warrior{background:rgba(145,79,35,.32)!important;border-color:rgba(241,174,89,.55)!important}.ot-warrior-intro{margin:0 0 12px;padding:10px 12px;border:1px solid #5d482c;background:rgba(121,77,31,.12);border-radius:7px;color:#d9c7a7;font-size:12px;line-height:1.45}
.ot-modal-root{position:fixed;inset:0;z-index:1000002;background:rgba(2,3,6,.82);backdrop-filter:blur(6px);display:grid;place-items:center;padding:22px;font-family:Arial,sans-serif;color:#e9dfc9}
.ot-window{width:min(1120px,96vw);max-height:90vh;overflow:hidden;background:linear-gradient(#17161d,#0b0b0f);border:1px solid #7c5d9d;border-radius:12px;box-shadow:0 26px 100px #000;display:flex;flex-direction:column}
.ot-head{display:flex;justify-content:space-between;align-items:center;padding:16px 18px;border-bottom:1px solid #493859;background:linear-gradient(90deg,rgba(113,65,149,.25),transparent)}
.ot-head b{display:block;font:700 22px Georgia,serif;color:#e4b8ff}.ot-head span{display:block;margin-top:3px;color:#9e96a8;font-size:12px}.ot-head button{width:38px;height:38px;border:1px solid #6e587a;background:#121016;color:#fff;border-radius:7px;cursor:pointer}
.ot-body{padding:16px;overflow:auto}.ot-toolbar{display:grid;grid-template-columns:1fr 180px 190px;gap:9px;margin-bottom:10px}.ot-toolbar input,.ot-toolbar select{background:#090a0d;border:1px solid #4c4253;color:#eee;border-radius:6px;padding:9px}.ot-summary{color:#a89dac;font-size:12px;margin:8px 2px 12px}
.ot-skill-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}.ot-skill-card{--effect-colour:#fff;text-align:left;background:#101116;border:1px solid #34323b;border-left:3px solid var(--effect-colour);color:#ddd;border-radius:8px;padding:10px;cursor:pointer;min-height:132px;transition:.15s}.ot-skill-card:hover{transform:translateY(-1px);border-color:var(--effect-colour);background:#171820}.ot-skill-card.casting{box-shadow:0 0 18px var(--effect-colour)}
.ot-skill-title{display:flex;gap:9px;align-items:center}.ot-skill-title i{font-style:normal;font-size:24px}.ot-skill-title b{display:block;color:#f0e6c9;font-size:13px}.ot-skill-title small{display:block;color:#918b94;margin-top:2px}.ot-tags{display:flex;gap:4px;flex-wrap:wrap;margin:9px 0}.ot-tags em{font-style:normal;font-size:9px;text-transform:uppercase;padding:3px 5px;border:1px solid #3b3942;border-radius:999px;color:#bbb}.ot-stats{font-size:10px;color:#9c96a0;line-height:1.45}.ot-cast-label{text-align:right;margin-top:6px;font-size:10px;font-weight:800;color:var(--effect-colour)}
.ot-pager{display:flex;justify-content:center;align-items:center;gap:12px;margin-top:14px}.ot-pager button{background:#15131a;border:1px solid #51455c;color:#fff;border-radius:5px;padding:5px 10px;cursor:pointer}.ot-pager button:disabled{opacity:.3}.ot-pager span{font-size:11px;color:#aaa}
.ot-map-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.ot-map-card{text-align:left;background:#111218;border:1px solid #383746;color:#ddd;border-radius:8px;padding:12px;cursor:pointer}.ot-map-card:hover{border-color:#9d75c2;background:#181722}.ot-map-card b{display:block;color:#e3c7f5;font:700 14px Georgia,serif}.ot-map-card span{display:block;color:#a3a0aa;font-size:11px;margin:6px 0}.ot-map-card small{color:#8fc6ff}
.ot-cast-fx{position:fixed;z-index:9990;pointer-events:none;transform:translate(-50%,-55%);filter:drop-shadow(0 0 12px var(--fx-colour));transition:opacity .2s ease}.ot-cast-fx:after{content:"";position:absolute;inset:14%;border:2px solid var(--fx-colour);border-radius:50%;opacity:.4;animation:otRing .5s ease-out forwards}.ot-cast-fx i{display:block;background-image:url('/img/effects/otsp-effects.png');background-repeat:no-repeat;image-rendering:pixelated}.ot-cast-fx.fade{opacity:0}
@keyframes otRing{from{transform:scale(.35);opacity:.65}to{transform:scale(1.35);opacity:0}}
@media(max-width:800px){.ot-skill-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.ot-toolbar{grid-template-columns:1fr}.ot-map-grid{grid-template-columns:1fr}}@media(max-width:520px){.ot-skill-grid{grid-template-columns:1fr}}
`;
        document.head.appendChild(style);
    }

    function escapeHtml(value) {
        return String(value ?? '').replace(/[&<>'"]/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
    }

    boot();
})();
