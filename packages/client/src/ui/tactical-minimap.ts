import type Game from '../game';

/**
 * Original Kaetram tactical minimap UI.
 * Visual structure is inspired by reusable HUD/minimap patterns from game-hud (MIT),
 * but the rendering, styling and map data are specific to Kaetram.
 */
export default class TacticalMinimap {
    private root?: HTMLDivElement;
    private canvas?: HTMLCanvasElement;
    private ctx?: CanvasRenderingContext2D | null;
    private expanded = false;
    private visible = true;
    private radius = 12;
    private lastRender = 0;

    public constructor(private game: Game) {}

    public mount(): void {
        if (this.root || document.getElementById('arpg-tactical-minimap')) return;

        const root = document.createElement('div');
        root.id = 'arpg-tactical-minimap';
        Object.assign(root.style, {
            position: 'fixed',
            top: '54px',
            right: '14px',
            width: '190px',
            height: '190px',
            zIndex: '9990',
            borderRadius: '50%',
            border: '2px solid rgba(196,155,79,.8)',
            background: 'radial-gradient(circle at 50% 45%, rgba(19,27,32,.96), rgba(4,7,9,.98))',
            boxShadow: '0 10px 28px rgba(0,0,0,.55), inset 0 0 0 4px rgba(0,0,0,.55), inset 0 0 24px rgba(70,105,110,.2)',
            overflow: 'hidden',
            transition: 'width .18s ease,height .18s ease,border-radius .18s ease',
            pointerEvents: 'auto'
        });

        const canvas = document.createElement('canvas');
        canvas.width = 380;
        canvas.height = 380;
        Object.assign(canvas.style, {
            width: '100%',
            height: '100%',
            display: 'block',
            imageRendering: 'pixelated'
        });

        const north = document.createElement('div');
        north.textContent = 'N';
        Object.assign(north.style, {
            position: 'absolute', top: '5px', left: '50%', transform: 'translateX(-50%)',
            color: '#e8c77b', font: '700 12px Arial, sans-serif', textShadow: '0 1px 2px #000'
        });

        const caption = document.createElement('div');
        caption.id = 'arpg-minimap-caption';
        caption.textContent = 'RADAR';
        Object.assign(caption.style, {
            position: 'absolute', bottom: '7px', left: '50%', transform: 'translateX(-50%)',
            padding: '3px 8px', borderRadius: '999px', background: 'rgba(0,0,0,.68)',
            color: '#cbb98f', font: '10px Arial, sans-serif', letterSpacing: '1.2px'
        });

        const expand = document.createElement('button');
        expand.type = 'button';
        expand.textContent = '⛶';
        expand.title = 'Expandir minimapa (M)';
        Object.assign(expand.style, {
            position: 'absolute', right: '8px', top: '8px', width: '30px', height: '30px',
            borderRadius: '8px', border: '1px solid rgba(196,155,79,.5)', background: 'rgba(7,10,13,.86)',
            color: '#e7bd64', cursor: 'pointer', fontSize: '14px'
        });
        expand.onclick = () => this.toggleExpanded();

        root.append(canvas, north, caption, expand);
        document.body.appendChild(root);
        this.root = root;
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.render(true);
    }

    public toggle(): void {
        this.mount();
        this.visible = !this.visible;
        if (this.root) this.root.style.display = this.visible ? 'block' : 'none';
    }

    public toggleExpanded(): void {
        this.mount();
        this.expanded = !this.expanded;
        if (!this.root) return;
        if (this.expanded) {
            Object.assign(this.root.style, {
                width: 'min(640px, 72vw)',
                height: 'min(640px, 72vw)',
                borderRadius: '18px',
                top: '50%',
                right: '50%',
                transform: 'translate(50%,-50%)',
                zIndex: '999995'
            });
            this.radius = 28;
        } else {
            Object.assign(this.root.style, {
                width: '190px', height: '190px', borderRadius: '50%', top: '54px', right: '14px',
                transform: 'none', zIndex: '9990'
            });
            this.radius = 12;
        }
        this.render(true);
    }

    public update(): void {
        if (!this.visible || !this.root) return;
        const now = Date.now();
        if (now - this.lastRender < 160) return;
        this.lastRender = now;
        this.render();
    }

    private render(force = false): void {
        if (!this.ctx || !this.canvas || !this.game.player || (!force && !this.game.started)) return;

        const ctx = this.ctx;
        const canvas = this.canvas;
        const size = canvas.width;
        ctx.clearRect(0, 0, size, size);

        const p = this.game.player;
        const radius = this.radius;
        const tiles = radius * 2 + 1;
        const cell = size / tiles;

        ctx.fillStyle = '#091014';
        ctx.fillRect(0, 0, size, size);

        for (let oy = -radius; oy <= radius; oy++) {
            for (let ox = -radius; ox <= radius; ox++) {
                const gx = p.gridX + ox;
                const gy = p.gridY + oy;
                const sx = (ox + radius) * cell;
                const sy = (oy + radius) * cell;

                if (gx < 0 || gy < 0 || gx >= this.game.map.width || gy >= this.game.map.height) {
                    ctx.fillStyle = '#020405';
                } else if (this.game.map.isColliding(gx, gy)) {
                    ctx.fillStyle = '#1d282b';
                } else {
                    ctx.fillStyle = (ox + oy) % 2 === 0 ? '#26383a' : '#223235';
                }
                ctx.fillRect(sx, sy, Math.ceil(cell) + 0.5, Math.ceil(cell) + 0.5);
            }
        }

        // subtle tactical grid
        ctx.strokeStyle = 'rgba(190,220,210,.055)';
        ctx.lineWidth = 1;
        for (let i = 0; i <= tiles; i += 4) {
            const v = i * cell;
            ctx.beginPath(); ctx.moveTo(v, 0); ctx.lineTo(v, size); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, v); ctx.lineTo(size, v); ctx.stroke();
        }

        for (const entity of Object.values(this.game.entities.getAll())) {
            if (!entity || entity.instance === p.instance) continue;
            const dx = entity.gridX - p.gridX;
            const dy = entity.gridY - p.gridY;
            if (Math.abs(dx) > radius || Math.abs(dy) > radius) continue;

            const x = (dx + radius + 0.5) * cell;
            const y = (dy + radius + 0.5) * cell;
            let color = '';
            let r = Math.max(2.4, cell * 0.24);

            if (entity.isMob() && !entity.dead) color = '#e65d4f';
            else if (entity.isItem()) { color = '#f2c45d'; r *= 0.8; }
            else if (entity.isNPC()) color = '#70c98b';
            else if (entity.isPlayer()) color = '#8bc7ff';
            else continue;

            ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
            ctx.fillStyle = color; ctx.fill();
            ctx.strokeStyle = 'rgba(0,0,0,.65)'; ctx.lineWidth = 1.5; ctx.stroke();
        }

        const center = size / 2;
        ctx.save();
        ctx.translate(center, center);
        ctx.rotate(Math.PI / 4);
        ctx.fillStyle = '#f6f1d0';
        ctx.fillRect(-5, -5, 10, 10);
        ctx.restore();

        // vignette/radar ring
        const grad = ctx.createRadialGradient(center, center, size * 0.25, center, center, size * 0.52);
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(1, 'rgba(0,0,0,.72)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, size, size);
    }
}
