import { Modules } from '@kaetram/common/network';

import type Game from '../game';
import type Character from '../entity/character/character';

interface HitLike {
    damage: number;
    type: Modules.Hits;
    aoe?: number;
}

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    maxLife: number;
    size: number;
    kind: 'spark' | 'dust';
}

interface Ring {
    x: number;
    y: number;
    life: number;
    maxLife: number;
    radius: number;
    maxRadius: number;
    colour?: string;
    alpha?: number;
}

/**
 * Lightweight 2D combat feedback layer.
 * Timing/pooling ideas are adapted from Warptracker's MIT VFX/animation system,
 * rebuilt for Kaetram's 2D renderer and DOM canvas.
 */
export default class CombatVfx {
    private canvas?: HTMLCanvasElement;
    private ctx?: CanvasRenderingContext2D | null;
    private particles: Particle[] = [];
    private rings: Ring[] = [];
    private last = performance.now();
    private raf = 0;
    private shakeUntil = 0;
    private shakePower = 0;

    public constructor(private game: Game) {}

    public mount(): void {
        if (this.canvas) return;
        const canvas = document.createElement('canvas');
        canvas.id = 'arpg-combat-vfx';
        Object.assign(canvas.style, {
            position: 'fixed', inset: '0', width: '100%', height: '100%', zIndex: '9985',
            pointerEvents: 'none'
        });
        document.body.appendChild(canvas);
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.resize();
        window.addEventListener('resize', () => this.resize());
        this.loop();
    }

    public onHit(attacker: Character, target: Character, hit: HitLike): void {
        this.mount();
        const pos = this.toScreen(target.x, target.y);
        const attackerPos = this.toScreen(attacker.x, attacker.y);
        const angle = Math.atan2(pos.y - attackerPos.y, pos.x - attackerPos.x);
        const crit = hit.type === Modules.Hits.Critical;
        const amount = crit ? 14 : Math.max(5, Math.min(10, Math.round((hit.damage || 1) / 3)));

        for (let i = 0; i < amount; i++) {
            const a = angle + (Math.random() - 0.5) * 1.8;
            const speed = 50 + Math.random() * (crit ? 170 : 110);
            this.particles.push({
                x: pos.x, y: pos.y,
                vx: Math.cos(a) * speed,
                vy: Math.sin(a) * speed - Math.random() * 50,
                life: 0,
                maxLife: 0.18 + Math.random() * 0.28,
                size: crit ? 3 + Math.random() * 3 : 2 + Math.random() * 2,
                kind: Math.random() > 0.2 ? 'spark' : 'dust'
            });
        }

        if (hit.aoe) {
            this.rings.push({ x: pos.x, y: pos.y, life: 0, maxLife: 0.3, radius: 8, maxRadius: 44 + hit.aoe * 18 });
        }

        if (crit || hit.damage >= Math.max(10, this.game.player.maxHitPoints * 0.08)) {
            this.shakePower = crit ? 5 : 3;
            this.shakeUntil = performance.now() + 120;
        }

        this.spawnSlash(pos.x, pos.y, angle, crit);
    }

    public skillPulse(kind: 'cleave' | 'whirlwind' | 'warcry'): void {
        this.mount();
        const p = this.toScreen(this.game.player.x, this.game.player.y);
        if (kind === 'cleave') {
            this.rings.push({ x: p.x, y: p.y, life: 0, maxLife: .28, radius: 10, maxRadius: 62 });
            this.spawnSkillArc(p.x, p.y, 'sunder');
            this.spawnGroundCracks(p.x, p.y);
        } else if (kind === 'whirlwind') {
            // Tighter steel-blue ground pulses keep the effect around the character instead
            // of drawing two huge expanding circles across the screen.
            this.rings.push({ x: p.x, y: p.y, life: 0, maxLife: .42, radius: 18, maxRadius: 58, colour: '#9bdcf4', alpha: .42 });
            this.rings.push({ x: p.x, y: p.y, life: -.07, maxLife: .44, radius: 14, maxRadius: 48, colour: '#d9f4ff', alpha: .28 });
            this.spawnSkillArc(p.x, p.y, 'whirlwind');
        } else {
            this.rings.push({ x: p.x, y: p.y, life: 0, maxLife: .58, radius: 10, maxRadius: 112 });
            this.rings.push({ x: p.x, y: p.y, life: -.12, maxLife: .62, radius: 18, maxRadius: 138 });
            this.spawnSkillArc(p.x, p.y, 'warcry');
        }
    }

    private spawnSkillArc(x: number, y: number, kind: 'sunder' | 'whirlwind' | 'warcry'): void {
        const element = document.createElement('div');
        element.className = `kaetram-skill-fx ${kind}`;
        Object.assign(element.style, {
            position: 'fixed',
            left: `${x}px`,
            top: `${y}px`,
            zIndex: '9987',
            pointerEvents: 'none',
            transform: 'translate(-50%,-50%)'
        });
        if (kind === 'sunder') {
            Object.assign(element.style, {
                width: '116px', height: '42px', borderRadius: '50%',
                borderTop: '5px solid #ffd074',
                borderRight: '2px solid rgba(255,166,53,.7)',
                filter: 'drop-shadow(0 0 9px #ff8a31)',
                transform: 'translate(-50%,-50%) rotate(-18deg) scale(.2)',
                opacity: '1', transition: 'transform 220ms cubic-bezier(.16,.78,.2,1),opacity 300ms ease'
            });
        } else if (kind === 'whirlwind') {
            element.innerHTML = '<i class="whirl-arc whirl-a"></i><i class="whirl-arc whirl-b"></i><i class="whirl-arc whirl-c"></i><b class="whirl-dust"></b>';
            Object.assign(element.style, {
                width: '126px', height: '82px',
                animation: 'kaetramWhirlFade .92s ease-out forwards'
            });
        } else {
            element.textContent = 'WARCALL';
            Object.assign(element.style, {
                color: '#ffd97c', font: '900 15px Georgia,serif', letterSpacing: '2px',
                textShadow: '0 0 8px #ff9f37,0 2px 3px #000',
                transform: 'translate(-50%,-50%) scale(.65)', opacity: '1',
                transition: 'transform 420ms ease-out,opacity 620ms ease-out'
            });
        }
        if (!document.getElementById('kaetram-skill-fx-style')) {
            const style = document.createElement('style');
            style.id = 'kaetram-skill-fx-style';
            style.textContent = `
.kaetram-skill-fx.whirlwind .whirl-arc{position:absolute;left:50%;top:50%;border-radius:50%;box-sizing:border-box;transform-origin:50% 50%;filter:drop-shadow(0 0 5px rgba(121,205,244,.5))}
.kaetram-skill-fx.whirlwind .whirl-a{width:116px;height:58px;margin:-29px 0 0 -58px;border-top:4px solid rgba(222,247,255,.96);border-right:3px solid rgba(91,183,229,.62);border-bottom:2px solid transparent;border-left:3px solid transparent;animation:kaetramWhirlA .40s linear 2}
.kaetram-skill-fx.whirlwind .whirl-b{width:94px;height:48px;margin:-24px 0 0 -47px;border-top:2px solid rgba(134,214,246,.82);border-left:3px solid rgba(224,248,255,.8);border-right:2px solid transparent;border-bottom:2px solid transparent;animation:kaetramWhirlB .34s linear 2 reverse}
.kaetram-skill-fx.whirlwind .whirl-c{width:72px;height:36px;margin:-18px 0 0 -36px;border-bottom:2px solid rgba(198,238,255,.68);border-right:2px solid rgba(83,163,210,.45);border-top:2px solid transparent;border-left:2px solid transparent;animation:kaetramWhirlC .30s linear 2}
.kaetram-skill-fx.whirlwind .whirl-dust{position:absolute;left:50%;top:58%;width:78px;height:20px;margin:-10px 0 0 -39px;border-radius:50%;background:radial-gradient(ellipse,rgba(196,213,218,.20),rgba(95,115,120,.10) 48%,transparent 72%);animation:kaetramWhirlDust .42s ease-out 2}
@keyframes kaetramWhirlA{to{transform:rotate(360deg)}}
@keyframes kaetramWhirlB{to{transform:rotate(360deg) scale(.96)}}
@keyframes kaetramWhirlC{to{transform:rotate(360deg) scale(1.06)}}
@keyframes kaetramWhirlDust{50%{transform:scaleX(1.18);opacity:.82}100%{transform:scaleX(.92);opacity:.18}}
@keyframes kaetramWhirlFade{0%{opacity:.2;transform:translate(-50%,-50%) scale(.78)}12%{opacity:1;transform:translate(-50%,-50%) scale(1)}78%{opacity:.88}100%{opacity:0;transform:translate(-50%,-50%) scale(1.06)}}
`;
            document.head.appendChild(style);
        }
        document.body.appendChild(element);
        requestAnimationFrame(() => {
            if (kind === 'sunder') { element.style.transform = 'translate(-50%,-50%) rotate(-18deg) scale(1)'; element.style.opacity = '0'; }
            else if (kind === 'warcry') { element.style.transform = 'translate(-50%,-88px) scale(1.12)'; element.style.opacity = '0'; }
        });
        setTimeout(() => element.remove(), kind === 'whirlwind' ? 1000 : 700);
    }

    private spawnGroundCracks(x: number, y: number): void {
        for (let i = 0; i < 5; i++) {
            const crack = document.createElement('i');
            Object.assign(crack.style, {
                position: 'fixed', left: `${x + (i - 2) * 8}px`, top: `${y + 8}px`, width: `${34 + i * 5}px`, height: '2px',
                zIndex: '9986', pointerEvents: 'none', background: 'linear-gradient(90deg,transparent,#ffbc54,transparent)',
                transform: `rotate(${-32 + i * 16}deg) scaleX(.15)`, transformOrigin: '0 50%', opacity: '.9',
                transition: 'transform 240ms ease-out,opacity 360ms ease-out'
            });
            document.body.appendChild(crack);
            requestAnimationFrame(() => { crack.style.transform = `rotate(${-32 + i * 16}deg) scaleX(1)`; crack.style.opacity = '0'; });
            setTimeout(() => crack.remove(), 430);
        }
    }

    private spawnSlash(x: number, y: number, angle: number, crit: boolean): void {
        const slash = document.createElement('div');
        Object.assign(slash.style, {
            position: 'fixed', left: `${x - 28}px`, top: `${y - 3}px`, width: '56px', height: crit ? '5px' : '3px',
            zIndex: '9986', pointerEvents: 'none', borderRadius: '999px',
            transform: `rotate(${angle + (Math.random() - .5) * .45}rad) scaleX(.25)`,
            transformOrigin: '50% 50%', opacity: '1',
            background: crit
                ? 'linear-gradient(90deg,transparent,#fff5b1,#ffb52e,transparent)'
                : 'linear-gradient(90deg,transparent,#f5efe0,#d1aa67,transparent)',
            boxShadow: crit ? '0 0 12px rgba(255,193,64,.85)' : '0 0 7px rgba(220,190,130,.45)',
            transition: 'transform 130ms ease-out,opacity 180ms ease-out'
        });
        document.body.appendChild(slash);
        requestAnimationFrame(() => {
            slash.style.transform = `rotate(${angle + (Math.random() - .5) * .45}rad) scaleX(1)`;
            slash.style.opacity = '0';
        });
        setTimeout(() => slash.remove(), 210);
    }

    private loop = (): void => {
        this.raf = requestAnimationFrame(this.loop);
        if (!this.ctx || !this.canvas) return;
        const now = performance.now();
        const dt = Math.min(.04, Math.max(0, (now - this.last) / 1000));
        this.last = now;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        for (const p of this.particles) {
            p.life += dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vy += 160 * dt;
            const k = Math.max(0, 1 - p.life / p.maxLife);
            this.ctx.globalAlpha = k;
            this.ctx.fillStyle = p.kind === 'spark' ? '#f6d58c' : '#b89b72';
            this.ctx.fillRect(p.x, p.y, p.size * k + .5, p.size * k + .5);
        }
        this.particles = this.particles.filter((p) => p.life < p.maxLife).slice(-180);

        for (const ring of this.rings) {
            ring.life += dt;
            if (ring.life < 0) continue;
            const k = Math.min(1, ring.life / ring.maxLife);
            const r = ring.radius + (ring.maxRadius - ring.radius) * k;
            this.ctx.globalAlpha = (1 - k) * (ring.alpha ?? .7);
            this.ctx.strokeStyle = ring.colour ?? '#d8b56a';
            this.ctx.lineWidth = Math.max(1, 4 * (1 - k));
            this.ctx.beginPath();
            this.ctx.arc(ring.x, ring.y, r, 0, Math.PI * 2);
            this.ctx.stroke();
        }
        this.rings = this.rings.filter((r) => r.life < r.maxLife);
        this.ctx.globalAlpha = 1;

        const border = this.game.camera.border;
        if (now < this.shakeUntil) {
            const x = (Math.random() - .5) * this.shakePower;
            const y = (Math.random() - .5) * this.shakePower;
            border.style.transform = `translate(${x}px,${y}px)`;
        } else if (border.style.transform) border.style.transform = '';
    };

    private toScreen(worldX: number, worldY: number): { x: number; y: number } {
        const zoom = this.game.camera.zoomFactor;
        return {
            x: (worldX - this.game.camera.x) * zoom + this.game.map.tileSize * zoom * .5,
            y: (worldY - this.game.camera.y) * zoom + this.game.map.tileSize * zoom * .5
        };
    }

    private resize(): void {
        if (!this.canvas) return;
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }
}
