import type Game from '../game';

type Direction = 'north' | 'south' | 'east' | 'west';

/**
 * KayKit local-player replacement.
 * The original Kaetram body is disabled by renderer.ts while this layer is mounted.
 * CC0 KayKit Barbarian renders are used for direction and lightweight action animation.
 */
export default class KayKitCharacter {
    private root?: HTMLDivElement;
    private image?: HTMLImageElement;
    private raf = 0;
    private lastX = 0;
    private lastY = 0;
    private movingUntil = 0;
    private actionUntil = 0;
    private actionClass = '';
    private actionStartedAt = 0;
    private facing: Direction = 'south';
    private renderedDirection: Direction = 'south';
    private mounted = false;

    public constructor(private game: Game) {}

    public mount(): void {
        if (this.mounted || document.getElementById('kaykit-player-avatar')) return;
        this.mounted = true;
        (globalThis as typeof globalThis & { __kaetramKayKitReplaceLocalPlayer?: boolean }).__kaetramKayKitReplaceLocalPlayer = true;

        const style = document.createElement('style');
        style.id = 'kaykit-player-style';
        style.textContent = `
#kaykit-player-avatar{position:fixed;z-index:520;pointer-events:none;width:46px;height:46px;transform:translate(-50%,-72%);transform-origin:50% 80%;filter:drop-shadow(0 4px 3px rgba(0,0,0,.48));will-change:left,top,transform}
#kaykit-player-avatar img{width:100%;height:100%;object-fit:contain;image-rendering:auto;transform-origin:50% 80%}
#kaykit-player-avatar.idle img{animation:kayIdle 1.75s ease-in-out infinite}
#kaykit-player-avatar.running img{animation:kayRun .28s ease-in-out infinite}
#kaykit-player-avatar.attack img{animation:kayAttack .30s cubic-bezier(.18,.74,.2,1) 1}
#kaykit-player-avatar.spin img{animation:kaySpinPose .16s ease-in-out infinite alternate;filter:brightness(1.06) drop-shadow(0 0 5px rgba(151,214,245,.32))}
#kaykit-player-avatar.sunder img{animation:kaySunder .44s cubic-bezier(.2,.72,.18,1) 1}
#kaykit-player-avatar.warcall img{animation:kayWarcall .58s ease-out 1}
#kaykit-player-avatar.hit img{animation:kayHit .20s ease-out 1;filter:brightness(1.45) saturate(1.18) drop-shadow(0 0 6px #ff6045)}
#kaykit-player-avatar.dead img{filter:grayscale(.85) brightness(.52);transform:rotate(82deg) translateY(4px)}
#kaykit-player-avatar:after{content:"";position:absolute;left:50%;bottom:1px;width:24px;height:7px;transform:translateX(-50%);border-radius:50%;background:rgba(0,0,0,.26);filter:blur(1px);z-index:-1}
@keyframes kayIdle{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-1px) scale(1.012)}}
@keyframes kayRun{0%,100%{transform:translateY(1px) rotate(-1deg) scaleY(.98)}50%{transform:translateY(-2px) rotate(1deg) scaleY(1.02)}}
@keyframes kayAttack{0%{transform:translate(-2px,0) rotate(-7deg)}45%{transform:translate(6px,-2px) rotate(13deg) scale(1.06)}100%{transform:none}}
@keyframes kaySpinPose{0%{transform:translateY(1px) scale(.985)}100%{transform:translateY(-1px) scale(1.035)}}
@keyframes kaySunder{0%{transform:translateY(-3px) rotate(-8deg)}48%{transform:translate(2px,4px) rotate(16deg) scale(1.08)}100%{transform:none}}
@keyframes kayWarcall{0%{transform:scale(.96)}42%{transform:scale(1.12) translateY(-3px)}70%{filter:brightness(1.25)}100%{transform:scale(1)}}
@keyframes kayHit{0%{transform:translateX(0)}38%{transform:translateX(-4px) rotate(-3deg)}100%{transform:translateX(0)}}
`;
        document.head.appendChild(style);

        const root = document.createElement('div');
        root.id = 'kaykit-player-avatar';
        root.className = 'idle';
        const image = document.createElement('img');
        image.src = '/models/kaykit/barbarian_south.png';
        image.alt = '';
        root.appendChild(image);
        document.body.appendChild(root);
        this.root = root;
        this.image = image;

        window.addEventListener('kaetram-skill-cast', this.onSkill as EventListener);
        window.addEventListener('kaetram-player-hit', this.onHit as EventListener);
        window.addEventListener('kaetram-player-attack', this.onAttack as EventListener);
        this.lastX = Number(this.game.player.x || 0);
        this.lastY = Number(this.game.player.y || 0);
        this.loop();
    }

    private onSkill = (event: CustomEvent<{ key?: string }>) => {
        const key = event.detail?.key;
        if (key === 'whirlwind') this.playAction('spin', 950);
        else if (key === 'warcry') this.playAction('warcall', 650);
        else this.playAction('sunder', 500);
    };

    private onHit = () => this.playAction('hit', 230);
    private onAttack = () => this.playAction('attack', 330);

    public playAttack(): void { this.playAction('attack', 330); }

    private playAction(className: string, duration: number): void {
        this.actionClass = className;
        this.actionStartedAt = performance.now();
        this.actionUntil = this.actionStartedAt + duration;
    }

    private setDirection(direction: Direction): void {
        if (!this.image || this.renderedDirection === direction) return;
        this.renderedDirection = direction;
        this.image.src = `/models/kaykit/barbarian_${direction}.png`;
    }

    private loop = (): void => {
        if (!this.root || !this.image) return;
        const player = this.game.player;
        const zoom = Number(this.game.camera.zoomFactor || 1);
        const tileSize = Number(this.game.map.tileSize || 16);
        const screenX = (Number(player.x || 0) - Number(this.game.camera.x || 0)) * zoom + tileSize * zoom * .5;
        const screenY = (Number(player.y || 0) - Number(this.game.camera.y || 0)) * zoom + tileSize * zoom * .55;
        this.root.style.left = `${screenX}px`;
        this.root.style.top = `${screenY}px`;

        // V10.2: 1.4x the V10.1 avatar size. The stronger vertical anchor keeps the feet
        // on the same world point while the sprite grows.
        const size = 1.4 * Math.max(38, Math.min(58, 44 * zoom));
        this.root.style.width = `${size}px`;
        this.root.style.height = `${size}px`;

        const x = Number(player.x || 0), y = Number(player.y || 0);
        const dx = x - this.lastX, dy = y - this.lastY;
        const now = performance.now();
        if (Math.abs(dx) + Math.abs(dy) > .2) {
            this.movingUntil = now + 120;
            this.facing = Math.abs(dx) > Math.abs(dy)
                ? (dx > 0 ? 'east' : 'west')
                : (dy > 0 ? 'south' : 'north');
        }
        this.lastX = x; this.lastY = y;

        // Do not rotate the PNG like a flat card during Steelstorm. Instead cycle the
        // four upright directional renders quickly, which reads as a real in-place turn
        // while the weapon VFX carries the circular motion.
        if (now < this.actionUntil && this.actionClass === 'spin') {
            const spinDirections: Direction[] = ['south', 'west', 'north', 'east'];
            const frame = Math.floor((now - this.actionStartedAt) / 85) % spinDirections.length;
            this.setDirection(spinDirections[frame]);
        } else {
            this.setDirection(this.facing);
        }

        const dead = Boolean(player.dead);
        const cls = dead ? 'dead' : now < this.actionUntil ? this.actionClass : now < this.movingUntil ? 'running' : 'idle';
        if (this.root.className !== cls) this.root.className = cls;

        this.raf = requestAnimationFrame(this.loop);
    };
}
