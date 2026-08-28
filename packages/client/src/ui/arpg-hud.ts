import type Game from '../game';

/** Diabolic-style HUD using the user-supplied UI art. */
export default class ArpgHud {
    private root?: HTMLDivElement;
    private healthFill?: HTMLDivElement;
    private manaFill?: HTMLDivElement;
    private healthText?: HTMLSpanElement;
    private manaText?: HTMLSpanElement;
    private timer = 0;

    public constructor(private game: Game) {}

    public mount(): void {
        if (this.root || document.getElementById('kaetram-arpg-hud')) return;
        document.querySelector<HTMLElement>('#player-info')?.style.setProperty('display', 'none');

        const style = document.createElement('style');
        style.id = 'kaetram-arpg-hud-style';
        style.textContent = `
#kaetram-arpg-hud{position:fixed;left:50%;bottom:0;transform:translateX(-50%);z-index:9989;width:min(940px,98vw);height:126px;pointer-events:none;font-family:Georgia,serif;filter:drop-shadow(0 8px 14px rgba(0,0,0,.7))}
#kaetram-arpg-hud .diabolic-bar{position:absolute;left:118px;right:118px;bottom:0;height:104px;background:url('/vendor/diabolic/bars-single.png') center bottom/100% 100% no-repeat;pointer-events:auto}
#kaetram-arpg-hud .bar-inner{position:absolute;left:10%;right:10%;top:16px;bottom:17px;display:flex;flex-direction:column;justify-content:flex-end;align-items:center}
#arpg-actionbar-host{width:100%;height:66px;display:flex;align-items:center;justify-content:center}
#kaetram-arpg-hud .xp-track{position:absolute;left:16%;right:16%;bottom:12px;height:4px;background:#090806;border:1px solid rgba(126,96,48,.6);overflow:hidden}
#kaetram-arpg-hud .xp-fill{height:100%;width:0;background:linear-gradient(90deg,#5f4309,#d49c20,#ffe083);box-shadow:0 0 5px rgba(255,194,48,.55)}
#kaetram-arpg-hud .orb{position:absolute;bottom:1px;width:122px;height:122px;pointer-events:auto}
#kaetram-arpg-hud .orb.health{left:1px}#kaetram-arpg-hud .orb.mana{right:1px}
#kaetram-arpg-hud .orb-backdrop,#kaetram-arpg-hud .orb-glass,#kaetram-arpg-hud .orb-border{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;pointer-events:none}
#kaetram-arpg-hud .orb-backdrop{z-index:1}#kaetram-arpg-hud .orb-glass{z-index:4;opacity:.76}#kaetram-arpg-hud .orb-border{z-index:5}
#kaetram-arpg-hud .orb-liquid-wrap{position:absolute;left:22px;right:22px;top:22px;bottom:22px;border-radius:50%;overflow:hidden;z-index:2;background:#090909;box-shadow:inset 0 0 18px #000}
#kaetram-arpg-hud .orb-liquid{position:absolute;left:0;right:0;bottom:0;height:100%;transition:height .16s ease;box-shadow:inset 0 8px 12px rgba(255,255,255,.11),inset 0 -12px 18px rgba(0,0,0,.4)}
#kaetram-arpg-hud .health .orb-liquid{background:radial-gradient(circle at 40% 22%,#ff6b62,#bd171c 46%,#4a0308 88%)}
#kaetram-arpg-hud .mana .orb-liquid{background:radial-gradient(circle at 40% 22%,#68c6ff,#136ab2 48%,#061b4e 88%)}
#kaetram-arpg-hud .orb-liquid:before{content:"";position:absolute;left:-10%;right:-10%;top:-5px;height:12px;border-radius:50%;background:rgba(255,255,255,.18);animation:orbWave 2.5s ease-in-out infinite}
#kaetram-arpg-hud .orb-value{position:absolute;z-index:6;left:10px;right:10px;bottom:27px;text-align:center;color:#f8eed8;font:bold 11px Arial,sans-serif;text-shadow:0 1px 3px #000,0 0 4px #000}
#kaetram-arpg-hud .orb-label{position:absolute;z-index:6;left:0;right:0;bottom:12px;text-align:center;color:#bba473;font:bold 8px Arial,sans-serif;letter-spacing:1.2px;text-transform:uppercase;text-shadow:0 1px 2px #000}
@keyframes orbWave{0%,100%{transform:translateY(0) scaleX(1)}50%{transform:translateY(2px) scaleX(.94)}}
@media(max-width:720px){#kaetram-arpg-hud{width:98vw;height:100px}.diabolic-bar{left:82px!important;right:82px!important;height:84px!important}.orb{width:88px!important;height:88px!important}.orb-liquid-wrap{left:16px!important;right:16px!important;top:16px!important;bottom:16px!important}.orb-value{font-size:9px!important;bottom:22px!important}.orb-label{bottom:10px!important}#arpg-actionbar-host{height:52px!important}}
`;
        document.head.appendChild(style);

        const root = document.createElement('div');
        root.id = 'kaetram-arpg-hud';
        root.innerHTML = `
<div class="orb health"><img class="orb-backdrop" src="/vendor/diabolic/orb-backdrop1.png" alt=""><div class="orb-liquid-wrap"><div class="orb-liquid" data-health-fill></div></div><img class="orb-glass" src="/vendor/diabolic/orb-glass.png" alt=""><img class="orb-border" src="/vendor/diabolic/orb-border.png" alt=""><span class="orb-value" data-health-text>0 / 0</span><span class="orb-label">Vida</span></div>
<div class="diabolic-bar"><div class="bar-inner"><div id="arpg-actionbar-host"></div></div><div class="xp-track"><div class="xp-fill" data-xp-fill></div></div></div>
<div class="orb mana"><img class="orb-backdrop" src="/vendor/diabolic/orb-backdrop2.png" alt=""><div class="orb-liquid-wrap"><div class="orb-liquid" data-mana-fill></div></div><img class="orb-glass" src="/vendor/diabolic/orb-glass.png" alt=""><img class="orb-border" src="/vendor/diabolic/orb-border.png" alt=""><span class="orb-value" data-mana-text>0 / 0</span><span class="orb-label">Mana</span></div>`;
        document.body.appendChild(root);

        this.root = root;
        this.healthFill = root.querySelector('[data-health-fill]') as HTMLDivElement;
        this.manaFill = root.querySelector('[data-mana-fill]') as HTMLDivElement;
        this.healthText = root.querySelector('[data-health-text]') as HTMLSpanElement;
        this.manaText = root.querySelector('[data-mana-text]') as HTMLSpanElement;
        this.refresh();
        this.timer = window.setInterval(() => this.refresh(), 100);
    }

    private refresh(): void {
        if (!this.root) return;
        const hp = Math.max(0, Number(this.game.player.hitPoints || 0));
        const maxHp = Math.max(1, Number(this.game.player.maxHitPoints || 1));
        const mana = Math.max(0, Number(this.game.player.mana || 0));
        const maxMana = Math.max(1, Number(this.game.player.maxMana || 1));
        const hpPct = Math.max(0, Math.min(100, (hp / maxHp) * 100));
        const manaPct = Math.max(0, Math.min(100, (mana / maxMana) * 100));
        if (this.healthFill) this.healthFill.style.height = `${hpPct}%`;
        if (this.manaFill) this.manaFill.style.height = `${manaPct}%`;
        if (this.healthText) this.healthText.textContent = `${Math.round(hp)} / ${Math.round(maxHp)}`;
        if (this.manaText) this.manaText.textContent = `${Math.round(mana)} / ${Math.round(maxMana)}`;

        const xpFill = this.root.querySelector<HTMLElement>('[data-xp-fill]');
        const level = Math.max(1, Number(this.game.player.level || 1));
        const totalXp = Number(this.game.player.getTotalExperience?.() || 0);
        const progress = Math.min(100, ((totalXp % Math.max(100, level * 250)) / Math.max(100, level * 250)) * 100);
        if (xpFill) xpFill.style.width = `${progress}%`;
    }
}
