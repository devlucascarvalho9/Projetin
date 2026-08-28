import { Packets } from '@kaetram/common/network';

import type Game from '../game';

/** V11.2 movable GM/debug console. Authoritative values remain server-side. */
export default class DevPanel {
    private root?: HTMLDivElement;
    private panel?: HTMLDivElement;

    public constructor(private game: Game) {}

    public mount(): void {
        if (this.root || document.getElementById('kaetram-dev-panel-root')) return;
        this.injectStyle();

        const root = document.createElement('div');
        root.id = 'kaetram-dev-panel-root';
        root.innerHTML = `<button class="dev-toggle" type="button" title="Painel GM (F10)">DEV</button>`;

        const panel = document.createElement('div');
        panel.className = 'dev-panel';
        panel.innerHTML = `
            <div class="dev-title" data-drag><b>GM / DEBUG V11.2</b><span>arraste aqui</span><button data-close type="button">×</button></div>
            <div class="dev-sub">Overrides de sessão. HP/Mana são máximos reais durante o teste.</div>
            <div class="dev-grid">
                ${this.row('LV','level','1','999')}
                ${this.row('HP MÁX','hp','1','999999')}
                ${this.row('MANA MÁX','mana','1','999999')}
                ${this.row('STR','str','1','999')}
                ${this.row('DEX / ACC','dex','1','999')}
                ${this.row('AGI','agi','1','999')}
                ${this.row('EVA / DEF','evasion','1','999')}
                ${this.row('ARCHERY','archery','1','999')}
                ${this.row('MAGIC','magic','1','999')}
                ${this.row('ARMOR +','armor','0','9999','0')}
                ${this.row('CRIT %','crit','0','100','0')}
                ${this.row('DANO %','damage','25','1000','100')}
                ${this.row('ATK SPD %','attackspeed','25','500','100')}
                ${this.row('MOVE SPD %','movespeed','25','500','100')}
            </div>
            <div class="dev-actions three">
                <button data-apply type="button">APLICAR</button>
                <button data-heal type="button">CURAR</button>
                <button data-reset type="button">RESET</button>
            </div>
            <div class="dev-actions">
                <button data-cmd="/cidade" type="button">CIDADE BONITA</button>
                <button data-cmd="/dungeon" type="button">DUNGEON</button>
            </div>
            <div class="dev-actions">
                <button data-cmd="/itemlist 1" type="button">ITENS</button>
                <button data-cmd="/supportlist" type="button">SUPPORTS</button>
            </div>
            <div class="dev-hint">F10 abre/fecha • posição do painel fica salva neste navegador.</div>
        `;
        root.appendChild(panel);
        document.body.appendChild(root);
        this.root = root;
        this.panel = panel;

        this.restorePosition();
        root.querySelector<HTMLButtonElement>('.dev-toggle')!.onclick = () => this.toggle();
        panel.querySelector<HTMLButtonElement>('[data-close]')!.onclick = () => this.hide();
        panel.querySelector<HTMLButtonElement>('[data-reset]')!.onclick = () => {
            this.send('/devset reset');
            this.refreshDefaults();
        };
        panel.querySelector<HTMLButtonElement>('[data-heal]')!.onclick = () => this.send('/devheal');
        panel.querySelector<HTMLButtonElement>('[data-apply]')!.onclick = () => this.apply();
        panel.querySelectorAll<HTMLButtonElement>('[data-cmd]').forEach((button) => {
            button.onclick = () => this.send(button.dataset.cmd || '');
        });
        this.enableDragging(panel.querySelector<HTMLElement>('[data-drag]')!);

        window.addEventListener('keydown', (event) => {
            if (event.key === 'F10') {
                event.preventDefault();
                this.toggle();
            }
        });
        this.refreshDefaults();
    }

    public toggle(): void { this.panel?.classList.toggle('open'); }
    private hide(): void { this.panel?.classList.remove('open'); }

    private row(label: string, stat: string, min: string, max: string, value = ''): string {
        return `<label class="dev-row"><span>${label}</span><input data-stat="${stat}" type="number" min="${min}" max="${max}" ${value ? `value="${value}"` : ''}></label>`;
    }

    private refreshDefaults(): void {
        if (!this.panel) return;
        const p = this.game.player;
        const set = (stat: string, value: number) => {
            const input = this.panel?.querySelector<HTMLInputElement>(`[data-stat="${stat}"]`);
            if (input && !input.value) input.value = String(Math.max(0, Math.round(value || 0)));
        };
        set('level', Number(p.level || 1));
        set('hp', Number(p.maxHitPoints || 1));
        set('mana', Number(p.maxMana || 1));
        ['str','dex','agi','evasion','archery','magic'].forEach((k) => set(k, 1));
    }

    private apply(): void {
        if (!this.panel) return;
        const order = ['level','hp','mana','str','dex','agi','evasion','archery','magic','armor','crit','damage','attackspeed','movespeed'];
        for (const stat of order) {
            const input = this.panel.querySelector<HTMLInputElement>(`[data-stat="${stat}"]`);
            if (!input || input.value.trim() === '') continue;
            const value = Number(input.value);
            if (Number.isFinite(value)) this.send(`/devset ${stat} ${Math.floor(value)}`);
        }
        this.send('/devstats');
    }

    private enableDragging(handle: HTMLElement): void {
        handle.addEventListener('pointerdown', (event) => {
            if ((event.target as HTMLElement).closest('button')) return;
            if (!this.root) return;
            event.preventDefault();
            const rect = this.root.getBoundingClientRect();
            const dx = event.clientX - rect.left;
            const dy = event.clientY - rect.top;
            handle.setPointerCapture(event.pointerId);
            const move = (e: PointerEvent) => {
                if (!this.root) return;
                const left = Math.max(0, Math.min(window.innerWidth - 50, e.clientX - dx));
                const top = Math.max(0, Math.min(window.innerHeight - 40, e.clientY - dy));
                Object.assign(this.root.style, { left: `${left}px`, top: `${top}px`, right: 'auto' });
            };
            const end = (e: PointerEvent) => {
                handle.releasePointerCapture(e.pointerId);
                handle.removeEventListener('pointermove', move);
                handle.removeEventListener('pointerup', end);
                handle.removeEventListener('pointercancel', end);
                this.savePosition();
            };
            handle.addEventListener('pointermove', move);
            handle.addEventListener('pointerup', end);
            handle.addEventListener('pointercancel', end);
        });
    }

    private savePosition(): void {
        if (!this.root) return;
        const rect = this.root.getBoundingClientRect();
        try { localStorage.setItem('kaetram-dev-panel-position', JSON.stringify({ left: rect.left, top: rect.top })); } catch {}
    }

    private restorePosition(): void {
        if (!this.root) return;
        try {
            const value = JSON.parse(localStorage.getItem('kaetram-dev-panel-position') || 'null') as {left?:number;top?:number}|null;
            if (value && Number.isFinite(value.left) && Number.isFinite(value.top))
                Object.assign(this.root.style, { left: `${Math.max(0, value.left!)}px`, top: `${Math.max(0, value.top!)}px`, right: 'auto' });
        } catch {}
    }

    private send(command: string): void {
        if (command) this.game.socket.send(Packets.Chat, [command]);
    }

    private injectStyle(): void {
        if (document.getElementById('kaetram-dev-panel-style')) return;
        const style = document.createElement('style');
        style.id = 'kaetram-dev-panel-style';
        style.textContent = `
#kaetram-dev-panel-root{position:fixed;right:12px;top:118px;z-index:999995;font-family:Arial,sans-serif;pointer-events:none}
#kaetram-dev-panel-root .dev-toggle{pointer-events:auto;width:48px;height:30px;border:1px solid #8b6a32;border-radius:6px;background:#15120d;color:#f2c968;font:700 11px Arial;cursor:pointer;box-shadow:0 4px 14px #0009}
#kaetram-dev-panel-root .dev-panel{position:absolute;left:0;top:36px;width:356px;padding:10px;border:1px solid #806333;border-radius:8px;background:linear-gradient(#18140f,#090a0c);box-shadow:0 16px 40px #000c;color:#e8d8b4;display:none;pointer-events:auto}
#kaetram-dev-panel-root .dev-panel.open{display:block}.dev-title{display:grid;grid-template-columns:1fr auto auto;gap:8px;align-items:center;color:#efc967;font:13px Georgia,serif;border-bottom:1px solid #654d29;padding-bottom:7px;margin-bottom:5px;cursor:move;touch-action:none;user-select:none}.dev-title span{font:9px Arial;color:#786d58}.dev-title button{border:0;background:transparent;color:#c9b68c;font-size:20px;cursor:pointer}
.dev-sub,.dev-hint{font-size:10px;line-height:1.35;color:#93866f;margin:5px 0 8px}.dev-hint{margin:8px 0 0;text-align:center}.dev-grid{display:grid;grid-template-columns:1fr 1fr;gap:4px 8px}.dev-row{display:grid;grid-template-columns:76px 1fr;align-items:center;gap:5px;margin:2px 0;font-size:10px;color:#d8c7a3}.dev-row input{min-width:0;width:100%;box-sizing:border-box;padding:5px 5px;border:1px solid #52442f;border-radius:4px;background:#090a0c;color:#fff2cc;outline:none}.dev-row input:focus{border-color:#b88d43}
.dev-actions{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:7px}.dev-actions.three{grid-template-columns:1fr 1fr 1fr}.dev-actions button{padding:7px 5px;border:1px solid #76592e;border-radius:5px;background:#231b11;color:#efd28c;font:700 10px Arial;cursor:pointer}.dev-actions button:hover{background:#332717}
`;
        document.head.appendChild(style);
    }
}
