import { Packets } from '@kaetram/common/network';

import type Game from '../game';

/**
 * Compact GM/testing panel for V11.1.
 * All authoritative changes are still performed by the server through /devset.
 * Server rejects the commands for non-admin players.
 */
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
            <div class="dev-title"><b>GM / TESTE</b><button data-close type="button">×</button></div>
            <div class="dev-sub">Overrides de sessão. Velocidades: 100% = normal.</div>
            ${this.row('LV', 'level', '1', '999')}
            ${this.row('STR', 'str', '1', '999')}
            ${this.row('HP', 'hp', '1', '999999')}
            ${this.row('ATK SPD %', 'attackspeed', '25', '500', '100')}
            ${this.row('MOVE SPD %', 'movespeed', '25', '500', '100')}
            <div class="dev-actions">
                <button data-apply type="button">APLICAR</button>
                <button data-reset type="button">RESET</button>
            </div>
            <div class="dev-actions secondary">
                <button data-cmd="/cidade" type="button">CIDADE</button>
                <button data-cmd="/dungeon" type="button">DUNGEON</button>
            </div>
            <div class="dev-actions secondary">
                <button data-cmd="/itemlist 1" type="button">ITENS</button>
                <button data-cmd="/conteudo" type="button">CONTEÚDO</button>
            </div>
            <div class="dev-hint">F10 abre/fecha • /devstats confere os valores</div>
        `;
        root.appendChild(panel);
        document.body.appendChild(root);
        this.root = root;
        this.panel = panel;

        root.querySelector<HTMLButtonElement>('.dev-toggle')!.onclick = () => this.toggle();
        panel.querySelector<HTMLButtonElement>('[data-close]')!.onclick = () => this.hide();
        panel.querySelector<HTMLButtonElement>('[data-reset]')!.onclick = () => {
            this.send('/devset reset');
            this.refreshDefaults();
        };
        panel.querySelector<HTMLButtonElement>('[data-apply]')!.onclick = () => this.apply();
        panel.querySelectorAll<HTMLButtonElement>('[data-cmd]').forEach((button) => {
            button.onclick = () => this.send(button.dataset.cmd || '');
        });

        window.addEventListener('keydown', (event) => {
            if (event.key === 'F10') {
                event.preventDefault();
                this.toggle();
            }
        });

        this.refreshDefaults();
    }

    public toggle(): void {
        if (!this.panel) return;
        this.panel.classList.toggle('open');
    }

    private hide(): void {
        this.panel?.classList.remove('open');
    }

    private row(label: string, stat: string, min: string, max: string, value = ''): string {
        return `<label class="dev-row"><span>${label}</span><input data-stat="${stat}" type="number" min="${min}" max="${max}" ${value ? `value="${value}"` : ''}></label>`;
    }

    private refreshDefaults(): void {
        if (!this.panel) return;
        const p = this.game.player;
        const set = (stat: string, value: number) => {
            const input = this.panel?.querySelector<HTMLInputElement>(`[data-stat="${stat}"]`);
            if (input) input.value = String(Math.max(1, Math.round(value || 1)));
        };
        set('level', Number(p.level || 1));
        set('hp', Number(p.maxHitPoints || 1));
        // STR is not exposed as a single authoritative client stat; leave a sensible test default.
        const str = this.panel.querySelector<HTMLInputElement>('[data-stat="str"]');
        if (str && !str.value) str.value = '1';
        const atk = this.panel.querySelector<HTMLInputElement>('[data-stat="attackspeed"]');
        const move = this.panel.querySelector<HTMLInputElement>('[data-stat="movespeed"]');
        if (atk && !atk.value) atk.value = '100';
        if (move && !move.value) move.value = '100';
    }

    private apply(): void {
        if (!this.panel) return;
        const order = ['level', 'str', 'hp', 'attackspeed', 'movespeed'];
        for (const stat of order) {
            const input = this.panel.querySelector<HTMLInputElement>(`[data-stat="${stat}"]`);
            if (!input) continue;
            const value = Number(input.value);
            if (!Number.isFinite(value)) continue;
            this.send(`/devset ${stat} ${Math.floor(value)}`);
        }
        this.send('/devstats');
    }

    private send(command: string): void {
        if (!command) return;
        this.game.socket.send(Packets.Chat, [command]);
    }

    private injectStyle(): void {
        if (document.getElementById('kaetram-dev-panel-style')) return;
        const style = document.createElement('style');
        style.id = 'kaetram-dev-panel-style';
        style.textContent = `
#kaetram-dev-panel-root{position:fixed;right:12px;top:118px;z-index:999995;font-family:Arial,sans-serif;pointer-events:none}
#kaetram-dev-panel-root .dev-toggle{pointer-events:auto;width:48px;height:30px;border:1px solid #8b6a32;border-radius:6px;background:#15120d;color:#f2c968;font:700 11px Arial;cursor:pointer;box-shadow:0 4px 14px #0009}
#kaetram-dev-panel-root .dev-panel{position:absolute;right:0;top:36px;width:248px;padding:10px;border:1px solid #806333;border-radius:8px;background:linear-gradient(#18140f,#090a0c);box-shadow:0 16px 40px #000c;color:#e8d8b4;display:none;pointer-events:auto}
#kaetram-dev-panel-root .dev-panel.open{display:block}
.dev-title{display:flex;align-items:center;justify-content:space-between;color:#efc967;font:13px Georgia,serif;border-bottom:1px solid #654d29;padding-bottom:7px;margin-bottom:5px}.dev-title button{border:0;background:transparent;color:#c9b68c;font-size:20px;cursor:pointer}
.dev-sub,.dev-hint{font-size:10px;line-height:1.35;color:#93866f;margin:5px 0 8px}.dev-hint{margin:8px 0 0;text-align:center}
.dev-row{display:grid;grid-template-columns:92px 1fr;align-items:center;gap:7px;margin:5px 0;font-size:11px;color:#d8c7a3}.dev-row input{width:100%;box-sizing:border-box;padding:5px 6px;border:1px solid #52442f;border-radius:4px;background:#090a0c;color:#fff2cc;outline:none}.dev-row input:focus{border-color:#b88d43}
.dev-actions{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:9px}.dev-actions button{padding:7px 5px;border:1px solid #76592e;border-radius:5px;background:#231b11;color:#efd28c;font:700 10px Arial;cursor:pointer}.dev-actions button:hover{background:#332717}.dev-actions.secondary{margin-top:6px}.dev-actions.secondary button{background:#111317;color:#cfc1a0;border-color:#4e4434}
`;
        document.head.appendChild(style);
    }
}
