import type Game from '../game';

type Direction = 'north' | 'south' | 'east' | 'west';
type AnimationKey = 'idle' | 'run' | 'attack' | 'cleave' | 'spin' | 'warcry' | 'hit' | 'death';

interface AnimationDefinition {
    frames: number;
    duration: number;
    loop: boolean;
}

const Animations: Record<AnimationKey, AnimationDefinition> = {
    idle: { frames: 6, duration: 1100, loop: true },
    run: { frames: 8, duration: 620, loop: true },
    attack: { frames: 7, duration: 390, loop: false },
    cleave: { frames: 7, duration: 500, loop: false },
    spin: { frames: 10, duration: 900, loop: false },
    warcry: { frames: 7, duration: 650, loop: false },
    hit: { frames: 4, duration: 230, loop: false },
    death: { frames: 8, duration: 720, loop: false }
};

/**
 * V10.6 KayKit local-player replacement.
 *
 * Unlike the old implementation, the player is no longer a single PNG that is
 * distorted/rotated by CSS.  Every state below is rendered from the original
 * CC0 KayKit Barbarian GLB animation and exported to directional sprite sheets.
 */
export default class KayKitCharacter {
    private root?: HTMLDivElement;
    private sprite?: HTMLDivElement;
    private lastX = 0;
    private lastY = 0;
    private movingUntil = 0;
    private actionUntil = 0;
    private actionStartedAt = 0;
    private action: AnimationKey | undefined;
    private facing: Direction = 'south';
    private renderedSheet = '';
    private mounted = false;
    private deathStartedAt = 0;
    private wasDead = false;

    public constructor(private game: Game) {}

    public mount(): void {
        if (this.mounted || document.getElementById('kaykit-player-avatar')) return;
        this.mounted = true;
        (globalThis as typeof globalThis & { __kaetramKayKitReplaceLocalPlayer?: boolean }).__kaetramKayKitReplaceLocalPlayer = true;

        const style = document.createElement('style');
        style.id = 'kaykit-player-style';
        style.textContent = `
#kaykit-player-avatar{position:fixed;z-index:520;pointer-events:none;width:46px;height:46px;transform:translate(-50%,-72%);transform-origin:50% 80%;filter:drop-shadow(0 4px 3px rgba(0,0,0,.48));will-change:left,top,width,height}
#kaykit-player-avatar .kaykit-sprite{position:absolute;inset:0;background-repeat:no-repeat;image-rendering:auto;will-change:background-position,background-image;transform-origin:50% 80%}
#kaykit-player-avatar.hit .kaykit-sprite{filter:brightness(1.4) saturate(1.18) drop-shadow(0 0 6px rgba(255,96,69,.9))}
#kaykit-player-avatar.spin .kaykit-sprite{filter:brightness(1.08) drop-shadow(0 0 5px rgba(151,214,245,.34))}
#kaykit-player-avatar:after{content:"";position:absolute;left:50%;bottom:1px;width:24px;height:7px;transform:translateX(-50%);border-radius:50%;background:rgba(0,0,0,.26);filter:blur(1px);z-index:-1}
`;
        document.head.appendChild(style);

        const root = document.createElement('div');
        root.id = 'kaykit-player-avatar';
        root.className = 'idle';
        const sprite = document.createElement('div');
        sprite.className = 'kaykit-sprite';
        root.appendChild(sprite);
        document.body.appendChild(root);
        this.root = root;
        this.sprite = sprite;

        this.preloadAnimations();
        window.addEventListener('kaetram-skill-cast', this.onSkill as EventListener);
        window.addEventListener('kaetram-player-hit', this.onHit as EventListener);
        window.addEventListener('kaetram-player-attack', this.onAttack as EventListener);
        this.lastX = Number(this.game.player.x || 0);
        this.lastY = Number(this.game.player.y || 0);
        this.loop();
    }

    private preloadAnimations(): void {
        const directions: Direction[] = ['south', 'east', 'north', 'west'];
        const animations = Object.keys(Animations) as AnimationKey[];
        for (const animation of animations)
            for (const direction of directions) {
                const image = new Image();
                image.src = this.getSheet(animation, direction);
            }
    }

    private getSheet(animation: AnimationKey, direction: Direction): string {
        // The horizontal GLB renders were exported with camera-facing east/west labels
        // reversed. Keep logical facing correct and swap only the asset lookup.
        const assetDirection: Direction = direction === 'east' ? 'west' : direction === 'west' ? 'east' : direction;
        return `/models/kaykit/anim/${animation}_${assetDirection}.png`;
    }

    private onSkill = (event: CustomEvent<{ key?: string }>) => {
        const key = event.detail?.key;
        if (key === 'whirlwind') this.playAction('spin');
        else if (key === 'warcry') this.playAction('warcry');
        else this.playAction('cleave');
    };

    private onHit = () => this.playAction('hit');
    private onAttack = (event: CustomEvent<{ targetX?: number; targetY?: number }>) => {
        const targetX = Number(event.detail?.targetX);
        const targetY = Number(event.detail?.targetY);
        if (Number.isFinite(targetX) && Number.isFinite(targetY)) {
            const playerX = Number(this.game.player.x || 0);
            const playerY = Number(this.game.player.y || 0);
            const dx = targetX - playerX;
            const dy = targetY - playerY;
            if (Math.abs(dx) + Math.abs(dy) > 0.01)
                this.facing = Math.abs(dx) > Math.abs(dy)
                    ? dx > 0 ? 'east' : 'west'
                    : dy > 0 ? 'south' : 'north';
        }
        this.playAction('attack');
    };

    public playAttack(): void {
        this.playAction('attack');
    }

    private playAction(animation: AnimationKey): void {
        const definition = Animations[animation];
        this.action = animation;
        this.actionStartedAt = performance.now();
        this.actionUntil = this.actionStartedAt + definition.duration;
    }

    private draw(animation: AnimationKey, direction: Direction, elapsed: number): void {
        if (!this.sprite) return;
        const definition = Animations[animation];
        const sheet = this.getSheet(animation, direction);
        if (sheet !== this.renderedSheet) {
            this.renderedSheet = sheet;
            this.sprite.style.backgroundImage = `url("${sheet}")`;
            this.sprite.style.backgroundSize = `${definition.frames * 100}% 100%`;
        }

        let progress = elapsed / definition.duration;
        if (definition.loop) progress -= Math.floor(progress);
        else progress = Math.max(0, Math.min(0.999999, progress));
        const frame = definition.loop
            ? Math.floor(progress * definition.frames) % definition.frames
            : Math.min(definition.frames - 1, Math.floor(progress * definition.frames));
        const position = definition.frames <= 1 ? 0 : (frame / (definition.frames - 1)) * 100;
        this.sprite.style.backgroundPosition = `${position}% 0`;
    }

    private loop = (): void => {
        if (!this.root || !this.sprite) return;
        const player = this.game.player;
        const zoom = Number(this.game.camera.zoomFactor || 1);
        const tileSize = Number(this.game.map.tileSize || 16);
        const screenX = (Number(player.x || 0) - Number(this.game.camera.x || 0)) * zoom + tileSize * zoom * 0.5;
        const screenY = (Number(player.y || 0) - Number(this.game.camera.y || 0)) * zoom + tileSize * zoom * 0.55;
        this.root.style.left = `${screenX}px`;
        this.root.style.top = `${screenY}px`;

        // V11.3: larger 2.2x KayKit while preserving the same feet anchor.
        const size = 2.2 * Math.max(38, Math.min(58, 44 * zoom));
        this.root.style.width = `${size}px`;
        this.root.style.height = `${size}px`;

        const x = Number(player.x || 0);
        const y = Number(player.y || 0);
        const dx = x - this.lastX;
        const dy = y - this.lastY;
        const now = performance.now();
        if (Math.abs(dx) + Math.abs(dy) > 0.2) {
            this.movingUntil = now + 120;
            this.facing = Math.abs(dx) > Math.abs(dy)
                ? dx > 0 ? 'east' : 'west'
                : dy > 0 ? 'south' : 'north';
        }
        this.lastX = x;
        this.lastY = y;

        const dead = Boolean(player.dead);
        let animation: AnimationKey;
        let elapsed: number;
        if (dead) {
            if (!this.wasDead) this.deathStartedAt = now;
            animation = 'death';
            elapsed = Math.min(Animations.death.duration - 1, now - this.deathStartedAt);
        } else if (this.action && now < this.actionUntil) {
            animation = this.action;
            elapsed = now - this.actionStartedAt;
        } else if (now < this.movingUntil) {
            animation = 'run';
            elapsed = now;
            this.action = undefined;
        } else {
            animation = 'idle';
            elapsed = now;
            this.action = undefined;
        }
        this.wasDead = dead;

        this.root.className = animation;
        this.draw(animation, this.facing, elapsed);
        requestAnimationFrame(this.loop);
    };
}
