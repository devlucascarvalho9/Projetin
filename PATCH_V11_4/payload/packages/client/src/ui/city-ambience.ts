import type Game from '../game';

interface AnimationData {
    waterRegions?: Array<{id:string;kind:string;x:number;y:number;width:number;height:number;alpha?:number}>;
    treeSwayPoints?: Array<{x:number;y:number;radius:number}>;
    smokeEmitters?: Array<{x:number;y:number}>;
    lightPulses?: Array<{x:number;y:number;radius:number;color:string;alpha?:number}>;
}

interface OverlaySpec {
    id: string;
    image: string;
    width: number;
    height: number;
    originX: number;
    originY: number;
    gridWidth: number;
    gridHeight: number;
    sourceTileSize: number;
    className: string;
}

/**
 * V11.4 world-art overlays.
 * Both maps live inside runtime-valid, deliberately cleared regions of the native Kaetram world.
 * The underlying world cells are replaced with a known walkable tile; only explicit structure
 * cells are restored as collision tiles by the installer.
 */
export default class CityAmbience {
    private cityRoot?: HTMLDivElement;
    private cityWorld?: HTMLDivElement;
    private loveRoot?: HTMLDivElement;
    private loveWorld?: HTMLDivElement;
    private data?: AnimationData;

    private readonly city: OverlaySpec = {
        id: 'kaetram-city-ambience',
        image: '/maps/cidade_inicial/cidade_inicial.png',
        width: 1448,
        height: 1086,
        originX: 16,
        originY: 736,
        gridWidth: 46,
        gridHeight: 34,
        sourceTileSize: 32,
        className: 'city-world'
    };

    private readonly love: OverlaySpec = {
        id: 'kaetram-love-map',
        image: '/maps/carine-love/map.png',
        width: 1448,
        height: 1086,
        originX: 0,
        originY: 624,
        gridWidth: 91,
        gridHeight: 68,
        sourceTileSize: 16,
        className: 'love-world'
    };

    public constructor(private game: Game) {}

    public async mount(): Promise<void> {
        if (this.cityRoot || this.loveRoot) return;

        try {
            const response = await fetch('/maps/cidade_inicial/cidade_inicial.animations.json');
            this.data = response.ok ? await response.json() as AnimationData : {};
        } catch {
            this.data = {};
        }

        this.injectStyle();
        [this.cityRoot, this.cityWorld] = this.createOverlay(this.city, true);
        [this.loveRoot, this.loveWorld] = this.createOverlay(this.love, false);
        this.loop();
    }

    private createOverlay(spec: OverlaySpec, cityFx: boolean): [HTMLDivElement, HTMLDivElement] {
        const root = document.createElement('div');
        root.id = spec.id;
        root.className = 'kaetram-art-overlay';

        const world = document.createElement('div');
        world.className = spec.className;
        world.style.width = `${spec.width}px`;
        world.style.height = `${spec.height}px`;
        world.innerHTML = `<img class="world-art" src="${spec.image}" alt=""><div class="world-fx"></div>`;
        root.appendChild(world);

        const entityCanvas = document.querySelector<HTMLElement>('#entities');
        const canvasHost = document.querySelector<HTMLElement>('#canvas');
        if (entityCanvas?.parentElement) entityCanvas.parentElement.insertBefore(root, entityCanvas);
        else (canvasHost || document.body).appendChild(root);

        if (cityFx) this.populateCityFx(world.querySelector('.world-fx') as HTMLDivElement);
        else this.populateLoveFx(world.querySelector('.world-fx') as HTMLDivElement);

        return [root, world];
    }

    private populateCityFx(host: HTMLDivElement): void {
        for (const region of this.data?.waterRegions || []) {
            const el = document.createElement('i');
            el.className = 'soft-water';
            Object.assign(el.style, {
                left: `${region.x}px`,
                top: `${region.y}px`,
                width: `${region.width}px`,
                height: `${region.height}px`,
                opacity: String(Math.max(.08, region.alpha || .13))
            });
            host.appendChild(el);
        }
        for (const p of this.data?.lightPulses || []) {
            const el = document.createElement('i');
            el.className = 'soft-light';
            Object.assign(el.style, {
                left: `${p.x-p.radius}px`,
                top: `${p.y-p.radius}px`,
                width: `${p.radius*2}px`,
                height: `${p.radius*2}px`,
                background: p.color,
                opacity: String(p.alpha || .10)
            });
            host.appendChild(el);
        }
    }

    private populateLoveFx(host: HTMLDivElement): void {
        // Decorative only. Collision is exclusively server/world-data driven.
        const glow = document.createElement('i');
        glow.className = 'love-glow';
        Object.assign(glow.style, { left: '605px', top: '862px', width: '245px', height: '150px' });
        host.appendChild(glow);

        const leftFall = document.createElement('i');
        leftFall.className = 'love-waterfall';
        Object.assign(leftFall.style, { left: '71px', top: '126px', width: '95px', height: '112px' });
        host.appendChild(leftFall);

        const rightFall = document.createElement('i');
        rightFall.className = 'love-waterfall';
        Object.assign(rightFall.style, { left: '1292px', top: '322px', width: '86px', height: '128px' });
        host.appendChild(rightFall);
    }

    private updateOverlay(root: HTMLDivElement | undefined, world: HTMLDivElement | undefined, spec: OverlaySpec, gx: number, gy: number): void {
        if (!root || !world) return;
        const inside = gx >= spec.originX && gx < spec.originX + spec.gridWidth &&
            gy >= spec.originY && gy < spec.originY + spec.gridHeight;
        root.style.display = inside ? 'block' : 'none';
        if (!inside) return;

        const zoom = Number(this.game.camera.zoomFactor || 1);
        const gameTile = Number(this.game.map.tileSize || 16);
        const sourceScale = (gameTile / spec.sourceTileSize) * zoom;
        const originWorldX = spec.originX * gameTile;
        const originWorldY = spec.originY * gameTile;
        const left = (originWorldX - Number(this.game.camera.x || 0)) * zoom;
        const top = (originWorldY - Number(this.game.camera.y || 0)) * zoom;
        world.style.transform = `translate(${left}px,${top}px) scale(${sourceScale})`;
    }

    private loop = (): void => {
        const p = this.game.player;
        const gx = Number(p.gridX || 0), gy = Number(p.gridY || 0);
        this.updateOverlay(this.cityRoot, this.cityWorld, this.city, gx, gy);
        this.updateOverlay(this.loveRoot, this.loveWorld, this.love, gx, gy);
        requestAnimationFrame(this.loop);
    };

    private injectStyle(): void {
        if (document.getElementById('kaetram-world-art-style')) return;
        const style = document.createElement('style');
        style.id = 'kaetram-world-art-style';
        style.textContent = `
.kaetram-art-overlay{position:absolute;inset:0;z-index:auto;pointer-events:none;overflow:hidden;display:none}
.kaetram-art-overlay>div{position:absolute;left:0;top:0;transform-origin:0 0}
.kaetram-art-overlay .world-art{position:absolute;inset:0;width:100%;height:100%;display:block;user-select:none}
.kaetram-art-overlay .world-fx{position:absolute;inset:0}
.soft-water,.soft-light,.love-glow,.love-waterfall{position:absolute;display:block;pointer-events:none}
.soft-water{mix-blend-mode:screen;background:repeating-linear-gradient(165deg,rgba(205,244,255,.25) 0 2px,rgba(58,150,215,.03) 2px 15px);background-size:42px 30px;animation:v114Water 8s linear infinite}
.soft-light{border-radius:50%;filter:blur(10px);mix-blend-mode:screen;animation:v114Pulse 2.4s ease-in-out infinite}
.love-glow{border-radius:50%;background:radial-gradient(ellipse,rgba(255,225,165,.19),transparent 68%);mix-blend-mode:screen;filter:blur(5px);animation:v114Pulse 2.8s ease-in-out infinite}
.love-waterfall{border-radius:45%;background:repeating-linear-gradient(90deg,rgba(235,253,255,.28) 0 3px,rgba(90,185,235,.03) 3px 13px);mix-blend-mode:screen;background-size:28px 46px;animation:v114Fall 1.2s linear infinite}
@keyframes v114Water{to{background-position:84px 30px}}
@keyframes v114Fall{to{background-position:0 46px}}
@keyframes v114Pulse{50%{transform:scale(1.05);opacity:.72}}
`;
        document.head.appendChild(style);
    }
}
