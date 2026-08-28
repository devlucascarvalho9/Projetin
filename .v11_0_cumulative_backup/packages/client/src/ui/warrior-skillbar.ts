import { Modules, Packets, Opcodes } from '@kaetram/common/network';

import Utils from '../utils/util';

import type Game from '../game';
import type CombatVfx from './combat-vfx';

type SkillKey = 'cleave' | 'whirlwind' | 'warcry';
type SupportKey = 'area' | 'efficiency' | 'acceleration' | 'vitality';

const SUPPORT_NAMES: Record<SupportKey, string> = {
    area: 'Área Ampliada',
    efficiency: 'Eficiência',
    acceleration: 'Aceleração',
    vitality: 'Vitalidade'
};

interface SkillDef {
    name: string;
    subtitle: string;
    hotkey: string;
    cooldown: number;
    mana: number;
    multiplier: number;
    hits: number;
    radius: number;
    description: string;
    colour: string;
    icon: string;
    animation: string;
}

const svg = (path: string, stroke = '#f0d38b') =>
    `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><radialGradient id="g"><stop stop-color="#423621"/><stop offset="1" stop-color="#0e0b08"/></radialGradient></defs><rect width="64" height="64" rx="10" fill="url(#g)"/><path d="${path}" fill="none" stroke="${stroke}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>`)}`;

const SKILLS: Record<SkillKey, SkillDef> = {
    cleave: {
        name: 'Sunder', subtitle: 'Golpe Sísmico', hotkey: 'Q', cooldown: 2.5, mana: 6,
        multiplier: 2.2, hits: 1, radius: 2,
        description: 'Ergue a arma e desfere um golpe brutal que explode o chão à frente, causando dano físico pesado em área.',
        colour: '#e4a450', animation: '2H_Melee_Attack_Chop',
        icon: svg('M13 46 L42 17 M35 13 L51 29 M14 50 L27 48 M18 37 L31 50', '#ffcf7a')
    },
    whirlwind: {
        name: 'Steelstorm', subtitle: 'Tempestade de Aço', hotkey: 'E', cooldown: 6, mana: 12,
        multiplier: 0.6, hits: 4, radius: 3,
        description: 'Gira com a arma em alta velocidade e acerta inimigos ao redor várias vezes enquanto mantém mobilidade.',
        colour: '#8bc6e8', animation: '2H_Melee_Attack_Spinning',
        icon: svg('M12 34 C18 13 47 12 53 29 C57 43 41 54 25 48 C15 44 13 34 20 26 C28 17 44 21 45 32 C46 40 36 45 29 40', '#9fe3ff')
    },
    warcry: {
        name: 'Warcall', subtitle: 'Grito de Guerra', hotkey: 'R', cooldown: 10, mana: 8,
        multiplier: 0.7, hits: 1, radius: 4,
        description: 'Solta um grito de guerra que reverbera pelo campo. Fere inimigos próximos e sustenta o Guerreiro no combate.',
        colour: '#e7c05d', animation: 'Cheer',
        icon: svg('M20 42 C15 38 13 32 14 25 M24 45 L29 18 M36 46 L35 17 M43 42 C49 37 52 30 50 23 M19 20 L11 14 M45 18 L54 11', '#ffe58c')
    }
};

/** Gothic ARPG skill bar + browser for Warrior active skills. */
export default class WarriorSkillbar {
    private root?: HTMLDivElement;
    private panel?: HTMLDivElement;
    private cooldownUntil: Partial<Record<SkillKey, number>> = {};
    private supports: Record<SkillKey, SupportKey[]> = { cleave: [], whirlwind: [], warcry: [] };
    private selectedSkill: SkillKey = 'cleave';
    private ticker = 0;

    public constructor(
        private game: Game,
        private vfx: CombatVfx
    ) {}

    public mount(): void {
        if (this.root || document.getElementById('warrior-skillbar')) return;
        this.injectStyle();

        const root = document.createElement('div');
        root.id = 'warrior-skillbar';
        root.innerHTML = `<div class="arpg-skill-row"></div>`;
        const row = root.querySelector('.arpg-skill-row')!;

        (Object.keys(SKILLS) as SkillKey[]).forEach((key) => row.appendChild(this.createButton(key)));
        for (let i = 0; i < 4; i++) {
            const empty = document.createElement('div');
            empty.className = 'arpg-skill-empty';
            empty.innerHTML = '<span>+</span>';
            row.appendChild(empty);
        }

        const host = document.getElementById('arpg-actionbar-host');
        (host || document.body).appendChild(root);
        this.root = root;

        this.applySettings((window as any).__kaetramArpgSettings);
        window.addEventListener('kaetram-arpg-settings', ((event: CustomEvent) => {
            this.applySettings(event.detail);
            if (this.panel) this.showDetails(this.selectedSkill);
        }) as EventListener);

        window.addEventListener('keydown', (event) => {
            if (['input', 'textarea', 'select'].includes((document.activeElement?.tagName || '').toLowerCase())) return;
            const key = event.key.toLowerCase();
            if (key === 'q') this.cast('cleave');
            else if (key === 'e') this.cast('whirlwind');
            else if (key === 'r') this.cast('warcry');
        });

        this.ticker = window.setInterval(() => this.refreshCooldowns(), 100);
    }

    public openInfo(): void {
        this.mount();
        if (this.panel) {
            this.panel.remove();
            this.panel = undefined;
            return;
        }

        const panel = document.createElement('div');
        panel.id = 'warrior-skills-panel';
        panel.innerHTML = `
<div class="skill-window">
  <div class="skill-window-head"><div><b>HABILIDADES DO GUERREIRO</b><span>Skills ativas • dano estimado com seu equipamento</span></div><button data-close>✕</button></div>
  <div class="skill-window-body">
    <div class="skill-list"></div>
    <div class="skill-details"><div class="skill-empty">Passe o mouse sobre uma habilidade.</div></div>
  </div>
</div>`;
        document.body.appendChild(panel);
        this.panel = panel;
        panel.querySelector<HTMLButtonElement>('[data-close]')!.onclick = () => {
            panel.remove(); this.panel = undefined;
        };

        const list = panel.querySelector('.skill-list')!;
        (Object.keys(SKILLS) as SkillKey[]).forEach((key) => {
            const def = SKILLS[key];
            const modified = this.getModifiedStats(key);
            const card = document.createElement('button');
            card.className = 'skill-card';
            card.innerHTML = `<img src="${def.icon}" alt=""><div><b>${def.name}</b><span>${def.subtitle}</span><small>${def.hotkey} • ${modified.mana} mana • ${modified.cooldown}s • ${this.supports[key].length}/2 supports</small></div>`;
            card.onmouseenter = () => this.showDetails(key);
            card.onclick = () => this.cast(key);
            list.appendChild(card);
        });
        this.showDetails('cleave');
    }

    private createButton(key: SkillKey): HTMLButtonElement {
        const def = SKILLS[key];
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.skill = key;
        button.className = 'arpg-skill-button';
        button.style.setProperty('--skill-colour', def.colour);
        button.innerHTML = `<span class="skill-hotkey">${def.hotkey}</span><img src="${def.icon}" alt="${def.name}"><span class="skill-name">${def.name}</span><i data-cd></i>`;
        button.title = `${def.name}: ${def.description}`;
        button.onclick = () => this.cast(key);
        return button;
    }

    private showDetails(key: SkillKey): void {
        if (!this.panel) return;
        this.selectedSkill = key;
        const def = SKILLS[key];
        const modified = this.getModifiedStats(key);
        const estimate = this.estimateDamage(key);
        const details = this.panel.querySelector('.skill-details')!;
        const supportText = this.supports[key].length
            ? this.supports[key].map((support) => `<span class="support-chip">${SUPPORT_NAMES[support]}</span>`).join('')
            : '<span class="support-empty">Nenhum Support vinculado</span>';
        details.innerHTML = `
<div class="skill-detail-title"><img src="${def.icon}" alt=""><div><h2>${def.name}</h2><span>${def.subtitle}</span></div></div>
<p>${def.description}</p>
<div class="skill-supports"><b>Supports (máx. 2)</b><div>${supportText}</div></div>
<div class="skill-stat-grid">
 <div><span>Dano estimado</span><b>${estimate}</b></div>
 <div><span>Multiplicador</span><b>${Math.round(def.multiplier * 100)}%${def.hits > 1 ? ` × ${def.hits}` : ''}</b></div>
 <div><span>Mana</span><b>${modified.mana}</b></div>
 <div><span>Cooldown</span><b>${modified.cooldown}s</b></div>
 <div><span>Raio</span><b>${modified.radius} tiles</b></div>
 <div><span>Tecla</span><b>${def.hotkey}</b></div>
</div>
<div class="skill-note">Vincule Supports pelo chat: <b>/support ${key} area</b>, efficiency, acceleration ou vitality. Clique no mesmo Support novamente para remover. O servidor valida mana, cooldown, área e cura.</div>`;
    }

    private applySettings(settings: any): void {
        const supports = settings?.supports;
        if (!supports) return;
        for (const key of Object.keys(this.supports) as SkillKey[]) {
            const list = Array.isArray(supports[key]) ? supports[key] : [];
            this.supports[key] = list.filter((support: string) => support in SUPPORT_NAMES).slice(0, 2) as SupportKey[];
        }
    }

    private getModifiedStats(key: SkillKey): { mana: number; cooldown: number; radius: number } {
        const def = SKILLS[key];
        let manaMultiplier = 1,
            cooldownMultiplier = 1,
            radiusBonus = 0;
        for (const support of this.supports[key]) {
            if (support === 'area') {
                radiusBonus += 1;
                manaMultiplier *= 1.25;
            } else if (support === 'efficiency') manaMultiplier *= 0.7;
            else if (support === 'acceleration') {
                cooldownMultiplier *= 0.75;
                manaMultiplier *= 1.15;
            } else if (support === 'vitality') manaMultiplier *= 1.15;
        }
        return {
            mana: Math.max(1, Math.ceil(def.mana * manaMultiplier)),
            cooldown: Math.max(0.25, Math.round(def.cooldown * cooldownMultiplier * 100) / 100),
            radius: def.radius + radiusBonus
        };
    }

    private estimateDamage(key: SkillKey): string {
        const def = SKILLS[key];
        const weapon = this.game.player.equipments[Modules.Equipment.Weapon];
        const stats = weapon?.attackStats;
        const raw = Number(stats?.slash || 0) + Number(stats?.crush || 0) + Number(stats?.stab || 0) + Number(stats?.magic || 0) + Number(stats?.archery || 0);
        const strength = Number(weapon?.bonuses?.strength || 0);
        const base = Math.max(6, raw + strength * 0.6 + Number(this.game.player.level || 1) * 1.5);
        const talent = Math.max(1, Number(this.game.talentPhysicalDamageMultiplier || 1));
        const perHit = Math.max(1, Math.round(base * def.multiplier * talent));
        return def.hits > 1 ? `${perHit} × ${def.hits} (${perHit * def.hits})` : `${perHit}`;
    }

    private cast(key: SkillKey): void {
        const now = performance.now();
        if ((this.cooldownUntil[key] || 0) > now) return;
        const def = SKILLS[key];
        const modified = this.getModifiedStats(key);
        if (Number(this.game.player.mana || 0) < modified.mana) return;

        // Offensive skills should work from the hotbar even when the user has not
        // manually clicked a monster first. Select the closest reachable mob.
        if (key !== 'warcry' && !this.ensureCombatTarget()) {
            this.vfx.skillPulse(key);
            return;
        }

        this.game.socket.send(Packets.Ability, { opcode: Opcodes.Ability.Use, key });
        this.cooldownUntil[key] = now + modified.cooldown * 1000;
        this.vfx.skillPulse(key);
        window.dispatchEvent(new CustomEvent('kaetram-skill-cast', { detail: { key, animation: def.animation } }));
        this.refreshCooldowns();
    }

    private ensureCombatTarget(): boolean {
        const player = this.game.player;
        if (player.target && !player.target.dead) return true;

        let best: any;
        let bestDistance = Infinity;
        for (const entity of Object.values(this.game.entities.getAll())) {
            if (!entity?.isMob?.() || entity.dead) continue;
            const distance = Utils.distance(player.gridX, player.gridY, entity.gridX, entity.gridY);
            if (distance > 7 || distance >= bestDistance) continue;
            best = entity; bestDistance = distance;
        }

        if (!best) return false;
        player.follow(best, true);
        best.addAttacker(player);
        player.lastTarget = best.instance;
        this.game.socket.send(Packets.Target, [Opcodes.Target.Attack, best.instance, best.gridX, best.gridY]);
        return true;
    }

    private refreshCooldowns(): void {
        if (!this.root) return;
        const now = performance.now();
        for (const button of Array.from(this.root.querySelectorAll<HTMLButtonElement>('[data-skill]'))) {
            const key = button.dataset.skill as SkillKey;
            const overlay = button.querySelector<HTMLElement>('[data-cd]');
            const left = Math.max(0, (this.cooldownUntil[key] || 0) - now);
            if (!overlay) continue;
            if (left > 0) {
                overlay.style.display = 'flex';
                overlay.textContent = left > 1000 ? (left / 1000).toFixed(1) : '0';
                button.classList.add('cooling');
            } else {
                overlay.style.display = 'none'; overlay.textContent = ''; button.classList.remove('cooling');
            }
        }
    }

    private injectStyle(): void {
        if (document.getElementById('warrior-skillbar-style')) return;
        const style = document.createElement('style');
        style.id = 'warrior-skillbar-style';
        style.textContent = `
#warrior-skillbar{display:flex;justify-content:center;width:100%;pointer-events:auto}.arpg-skill-row{display:flex;flex-direction:row;gap:4px;align-items:center;justify-content:center;white-space:nowrap}
.arpg-skill-button{--skill-colour:#d6ad5e;position:relative;width:54px;height:54px;padding:4px;border:0;border-radius:7px;background:linear-gradient(145deg,#2b2115,#070605 68%);box-shadow:inset 0 0 0 2px #090807,inset 0 0 0 3px #6b512f,inset 0 0 12px #000,0 3px 7px #000;cursor:pointer;color:#ead8ae;overflow:hidden}
.arpg-skill-button:before{content:"";position:absolute;inset:2px;border:1px solid color-mix(in srgb,var(--skill-colour) 55%,transparent);border-radius:6px;pointer-events:none}.arpg-skill-button img{width:42px;height:42px;border-radius:4px;display:block;margin:auto;image-rendering:auto}.skill-hotkey{position:absolute;top:3px;left:5px;z-index:3;background:#090806cc;color:#fff0bd;border:1px solid #7b6036;border-radius:4px;padding:1px 4px;font:bold 10px Arial}.skill-name{display:none}.arpg-skill-button [data-cd]{position:absolute;inset:3px;z-index:5;display:none;align-items:center;justify-content:center;border-radius:6px;background:rgba(0,0,0,.68);font:700 18px Arial;color:#fff}.arpg-skill-button.cooling img{filter:grayscale(.65) brightness(.55)}.arpg-skill-button:hover{transform:translateY(-2px);box-shadow:inset 0 0 0 2px #17110b,0 0 12px color-mix(in srgb,var(--skill-colour) 55%,transparent),0 5px 11px #000}
.arpg-skill-empty{position:relative;width:54px;height:54px;border-radius:7px;background:linear-gradient(145deg,#17130e,#050504);box-shadow:inset 0 0 0 2px #090807,inset 0 0 0 3px #4a3823,0 3px 7px #000;display:flex;align-items:center;justify-content:center;color:#5d4b30;font:bold 20px Georgia}.arpg-skill-empty:after{content:"";position:absolute;inset:3px;border:1px solid rgba(169,128,62,.18);border-radius:4px}
#warrior-skills-panel{position:fixed;inset:0;z-index:100020;background:rgba(0,0,0,.48);display:flex;align-items:center;justify-content:center;padding:24px;font-family:Arial,sans-serif}.skill-window{width:min(820px,94vw);height:min(480px,78vh);border:1px solid #705839;border-radius:12px;background:radial-gradient(circle at 50% 0,#302619,#0a0908 58%);box-shadow:0 22px 70px #000,inset 0 0 50px rgba(0,0,0,.7);overflow:hidden;color:#e9ddc0}.skill-window-head{height:62px;padding:0 18px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #4d3a24;background:linear-gradient(180deg,#34291b,#17120d)}.skill-window-head b{display:block;color:#e8c878;letter-spacing:1px}.skill-window-head span{display:block;color:#8f816c;font-size:11px;margin-top:4px}.skill-window-head button{width:36px;height:36px;border-radius:7px;border:1px solid #665033;background:#17110c;color:#d7bf89;cursor:pointer}.skill-window-body{display:grid;grid-template-columns:300px 1fr;height:calc(100% - 62px)}.skill-list{padding:14px;border-right:1px solid #3b2e20;overflow:auto}.skill-card{width:100%;display:flex;gap:12px;align-items:center;text-align:left;padding:10px;margin-bottom:9px;border-radius:9px;border:1px solid #443521;background:linear-gradient(180deg,#211a12,#100d09);color:#e8dcc0;cursor:pointer}.skill-card:hover{border-color:#a3834c;background:#2b2115}.skill-card img{width:54px;height:54px;border-radius:8px}.skill-card b,.skill-card span,.skill-card small{display:block}.skill-card b{color:#f0d189;font-size:15px}.skill-card span{font-size:11px;color:#b7a57e;margin:3px 0}.skill-card small{font-size:10px;color:#7e7568}.skill-details{padding:24px 26px;overflow:auto}.skill-detail-title{display:flex;align-items:center;gap:14px}.skill-detail-title img{width:72px;height:72px;border-radius:11px;border:1px solid #82663b}.skill-detail-title h2{margin:0;color:#f1d38a;font-size:26px}.skill-detail-title span{color:#a89878}.skill-details p{line-height:1.55;color:#d2c6ab}.skill-stat-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-top:18px}.skill-stat-grid div{padding:10px 12px;border:1px solid #3e3120;border-radius:7px;background:#0b0907aa;display:flex;justify-content:space-between;gap:12px}.skill-stat-grid span{color:#958873;font-size:11px}.skill-stat-grid b{color:#e8ca83;font-size:12px}.skill-supports{margin-top:14px;padding:10px;border:1px solid #463721;border-radius:7px;background:#100c08}.skill-supports>b{display:block;color:#cbb178;font-size:11px;margin-bottom:7px}.support-chip{display:inline-block;margin:2px 5px 2px 0;padding:4px 7px;border:1px solid #6c5630;border-radius:10px;background:#241b10;color:#e6c879;font-size:10px}.support-empty{color:#756b5d;font-size:10px}.skill-note{margin-top:16px;padding:10px;border-left:3px solid #826638;background:#17120c;color:#8f8575;font-size:10px;line-height:1.4}@media(max-width:650px){.skill-window-body{grid-template-columns:1fr}.skill-list{display:flex;border-right:0;border-bottom:1px solid #3b2e20;overflow:auto}.skill-card{min-width:220px}.skill-details{padding:14px}.skill-window{height:86vh}}
`;
        document.head.appendChild(style);
    }
}
