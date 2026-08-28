import type Game from '../game';

interface DungeonLayout {
    width: number;
    height: number;
    tileArtSize: number;
    origin: { x: number; y: number };
    spawn: { x: number; y: number };
    boss: { x: number; y: number };
    torches: Array<{ x: number; y: number }>;
}

/**
 * V11.0 visual layer for the first procedural crypt.
 *
 * The layout was generated with rot.js Digger (BSD-3-Clause), then flattened
 * using CC0 KayKit Dungeon Remastered assets. Collision and mobs remain fully
 * authoritative in the server world map; this class only renders atmosphere.
 */
export default class DungeonAmbience {
    private root?: HTMLDivElement;
    private world?: HTMLDivElement;
    private layout?: DungeonLayout;
    private raf = 0;

    public constructor(private game: Game) {}

    public async mount(): Promise<void> {
        if (this.root) return;
        try {
            const response = await fetch('/maps/crypt_v110/layout.json');
            if (!response.ok) return;
            this.layout = (await response.json()) as DungeonLayout;
        } catch {
            return;
        }

        this.injectStyle();
        const root = document.createElement('div');
        root.id = 'kaetram-dungeon-ambience';
        const world = document.createElement('div');
        world.className = 'dungeon-world';
        world.innerHTML = `<img class="dungeon-art" src="/maps/crypt_v110/crypt.png" alt=""><div class="dungeon-fx"></div>`;
        root.appendChild(world);

        const entityCanvas = document.querySelector<HTMLElement>('#entities');
        const canvasHost = document.querySelector<HTMLElement>('#canvas');
        if (entityCanvas?.parentElement) entityCanvas.parentElement.insertBefore(root, entityCanvas);
        else (canvasHost || document.body).appendChild(root);

        this.root = root;
        this.world = world;
        this.populateFx(world.querySelector('.dungeon-fx') as HTMLDivElement);
        this.loop();
    }

    private populateFx(host: HTMLDivElement): void {
        if (!this.layout) return;
        const size = this.layout.tileArtSize;
        for (const [index, torch] of this.layout.torches.entries()) {
            const glow = document.createElement('i');
            glow.className = 'dungeon-torch-glow';
            glow.style.left = `${torch.x * size + size / 2 - 34}px`;
            glow.style.top = `${torch.y * size + size / 2 - 34}px`;
            glow.style.animationDelay = `${-(index % 5) * 0.21}s`;
            host.appendChild(glow);
        }

        const boss = document.createElement('i');
        boss.className = 'dungeon-boss-aura';
        boss.style.left = `${this.layout.boss.x * size + size / 2 - 54}px`;
        boss.style.top = `${this.layout.boss.y * size + size / 2 - 54}px`;
        host.appendChild(boss);

        const entrance = document.createElement('i');
        entrance.className = 'dungeon-entrance-aura';
        entrance.style.left = `${this.layout.spawn.x * size + size / 2 - 34}px`;
        entrance.style.top = `${this.layout.spawn.y * size + size / 2 - 34}px`;
        host.appendChild(entrance);
    }

    private loop = (): void => {
        if (!this.root || !this.world || !this.layout) return;
        const player = this.game.player;
        const gx = Number(player.gridX || 0);
        const gy = Number(player.gridY || 0);
        const { origin, width, height, tileArtSize } = this.layout;
        const inside = gx >= origin.x && gx < origin.x + width && gy >= origin.y && gy < origin.y + height;
        this.root.style.display = inside ? 'block' : 'none';

        if (inside) {
            const zoom = Number(this.game.camera.zoomFactor || 1);
            const gameTile = Number(this.game.map.tileSize || 16);
            const sourceScale = (gameTile / tileArtSize) * zoom;
            const originWorldX = origin.x * gameTile;
            const originWorldY = origin.y * gameTile;
            const left = (originWorldX - Number(this.game.camera.x || 0)) * zoom;
            const top = (originWorldY - Number(this.game.camera.y || 0)) * zoom;
            this.world.style.transform = `translate(${left}px,${top}px) scale(${sourceScale})`;
        }

        this.raf = requestAnimationFrame(this.loop);
    };

    private injectStyle(): void {
        if (document.getElementById('kaetram-dungeon-style')) return;
        const style = document.createElement('style');
        style.id = 'kaetram-dungeon-style';
        style.textContent = `
#kaetram-dungeon-ambience{position:absolute;inset:0;z-index:auto;pointer-events:none;overflow:hidden;display:none;background:rgba(2,3,5,.36)}
#kaetram-dungeon-ambience .dungeon-world{position:absolute;left:0;top:0;width:1728px;height:1344px;transform-origin:0 0;filter:saturate(.9) contrast(1.06)}
#kaetram-dungeon-ambience .dungeon-art{position:absolute;inset:0;width:1728px;height:1344px;display:block}
#kaetram-dungeon-ambience .dungeon-fx{position:absolute;inset:0}
.dungeon-torch-glow,.dungeon-boss-aura,.dungeon-entrance-aura{position:absolute;display:block;pointer-events:none;border-radius:50%;mix-blend-mode:screen}
.dungeon-torch-glow{width:68px;height:68px;background:radial-gradient(circle,rgba(255,197,92,.42),rgba(255,105,35,.17) 37%,transparent 72%);filter:blur(5px);animation:dungeonTorch 1.1s ease-in-out infinite alternate}
.dungeon-boss-aura{width:108px;height:108px;border:4px solid rgba(208,52,44,.45);box-shadow:0 0 28px rgba(210,30,23,.32),inset 0 0 24px rgba(130,13,12,.2);animation:dungeonBoss 1.6s ease-in-out infinite}
.dungeon-entrance-aura{width:68px;height:68px;border:2px solid rgba(78,205,255,.42);box-shadow:0 0 22px rgba(36,171,227,.27);animation:dungeonEntrance 2s ease-in-out infinite}
@keyframes dungeonTorch{0%{transform:scale(.92);opacity:.7}45%{transform:scale(1.06);opacity:1}100%{transform:scale(.98);opacity:.82}}
@keyframes dungeonBoss{50%{transform:scale(1.08);opacity:.7}}
@keyframes dungeonEntrance{50%{transform:scale(1.12);opacity:.55}}
`;
        document.head.appendChild(style);
    }
}
