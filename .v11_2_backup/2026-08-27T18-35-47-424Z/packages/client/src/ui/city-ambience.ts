import type Game from '../game';

interface AnimationData {
    waterRegions?: Array<{id:string;kind:string;x:number;y:number;width:number;height:number;alpha?:number}>;
    treeSwayPoints?: Array<{x:number;y:number;radius:number}>;
    smokeEmitters?: Array<{x:number;y:number}>;
    lightPulses?: Array<{x:number;y:number;radius:number;color:string;alpha?:number}>;
}

/**
 * Lightweight animated presentation layer for the supplied city artwork.
 * It is intentionally client-only: existing Kaetram collisions/entities stay authoritative.
 */
export default class CityAmbience {
    private root?: HTMLDivElement;
    private world?: HTMLDivElement;
    private raf = 0;
    private data?: AnimationData;
    // Chosen to cover the original starter/Mudwich area without touching distant zones.
    private readonly originGridX = 168;
    private readonly originGridY = 140;
    private readonly sourceTileSize = 32;

    public constructor(private game: Game) {}

    public async mount(): Promise<void> {
        if (this.root) return;
        try {
            const response = await fetch('/maps/cidade_inicial/cidade_inicial.animations.json');
            this.data = response.ok ? await response.json() as AnimationData : {};
        } catch { this.data = {}; }
        this.injectStyle();

        const root = document.createElement('div');
        root.id = 'kaetram-city-ambience';
        const world = document.createElement('div');
        world.className = 'city-world';
        world.innerHTML = `<img class="city-art" src="/maps/cidade_inicial/cidade_inicial.png" alt=""><div class="city-fx"></div>`;
        root.appendChild(world);
        const entityCanvas = document.querySelector<HTMLElement>('#entities');
        const canvasHost = document.querySelector<HTMLElement>('#canvas');
        if (entityCanvas?.parentElement) entityCanvas.parentElement.insertBefore(root, entityCanvas);
        else (canvasHost || document.body).appendChild(root);
        this.root = root; this.world = world;
        this.populateFx(world.querySelector('.city-fx') as HTMLDivElement);
        this.loop();
    }

    private populateFx(host: HTMLDivElement): void {
        for (const region of this.data?.waterRegions || []) {
            const el = document.createElement('i');
            el.className = `city-water ${region.kind === 'waterfall' ? 'waterfall' : region.kind === 'lake' ? 'lake' : 'river'}`;
            Object.assign(el.style,{left:`${region.x}px`,top:`${region.y}px`,width:`${region.width}px`,height:`${region.height}px`,opacity:String(Math.max(.12, region.alpha || .18))});
            host.appendChild(el);
            if (region.kind === 'waterfall') {
                const foam=document.createElement('b'); foam.className='waterfall-foam'; foam.style.left=`${region.x}px`; foam.style.top=`${region.y+region.height-12}px`; foam.style.width=`${region.width}px`; host.appendChild(foam);
            }
        }
        (this.data?.treeSwayPoints || []).forEach((p,i)=>{const el=document.createElement('i');el.className='tree-sway';Object.assign(el.style,{left:`${p.x-p.radius}px`,top:`${p.y-p.radius*.7}px`,width:`${p.radius*2}px`,height:`${p.radius*1.4}px`,animationDelay:`${(i%7)*-.31}s`});host.appendChild(el);});
        (this.data?.smokeEmitters || []).forEach((p,i)=>{const el=document.createElement('i');el.className='chimney-smoke';Object.assign(el.style,{left:`${p.x}px`,top:`${p.y}px`,animationDelay:`${i*-.8}s`});host.appendChild(el);});
        (this.data?.lightPulses || []).forEach((p,i)=>{const el=document.createElement('i');el.className='city-light';Object.assign(el.style,{left:`${p.x-p.radius}px`,top:`${p.y-p.radius}px`,width:`${p.radius*2}px`,height:`${p.radius*2}px`,background:p.color,opacity:String(p.alpha||.13),animationDelay:`${i*-.45}s`});host.appendChild(el);});
        // Fountain animation, flowers/grass, and small window lights are deliberately subtle.
        const fountain=document.createElement('i'); fountain.className='city-fountain'; Object.assign(fountain.style,{left:'688px',top:'507px'});host.appendChild(fountain);
        for(let i=0;i<18;i++){const g=document.createElement('i');g.className='city-grass';g.style.left=`${70+(i*79)%1300}px`;g.style.top=`${300+(i*137)%720}px`;g.style.animationDelay=`${-i*.27}s`;host.appendChild(g);}
    }

    private loop = (): void => {
        if (!this.root || !this.world) return;
        const p=this.game.player;
        const gx=Number(p.gridX||0),gy=Number(p.gridY||0);
        const inside=gx>=this.originGridX&&gx<=this.originGridX+46&&gy>=this.originGridY&&gy<=this.originGridY+35;
        this.root.style.display=inside?'block':'none';
        if(inside){
            const zoom=Number(this.game.camera.zoomFactor||1);
            const gameTile=Number(this.game.map.tileSize||16);
            const sourceScale=(gameTile/this.sourceTileSize)*zoom;
            const originWorldX=this.originGridX*gameTile, originWorldY=this.originGridY*gameTile;
            const left=(originWorldX-Number(this.game.camera.x||0))*zoom;
            const top=(originWorldY-Number(this.game.camera.y||0))*zoom;
            this.world.style.transform=`translate(${left}px,${top}px) scale(${sourceScale})`;
        }
        this.raf=requestAnimationFrame(this.loop);
    };

    private injectStyle():void{
        if(document.getElementById('kaetram-city-style'))return;
        const s=document.createElement('style');s.id='kaetram-city-style';s.textContent=`
#kaetram-city-ambience{position:absolute;inset:0;z-index:auto;pointer-events:none;overflow:hidden;display:none}#kaetram-city-ambience .city-world{position:absolute;left:0;top:0;width:1448px;height:1086px;transform-origin:0 0}.city-art{position:absolute;inset:0;width:1448px;height:1086px;display:block}.city-fx{position:absolute;inset:0}.city-water,.tree-sway,.chimney-smoke,.city-light,.city-fountain,.city-grass,.waterfall-foam{position:absolute;display:block;pointer-events:none}.city-water{overflow:hidden;mix-blend-mode:screen;background:repeating-linear-gradient(165deg,rgba(200,244,255,.34) 0 2px,rgba(58,150,215,.05) 2px 15px);animation:riverFlow 8s linear infinite;background-size:42px 30px}.city-water.lake{border-radius:45%;background:repeating-radial-gradient(ellipse at center,rgba(205,246,255,.22) 0 2px,transparent 3px 15px);animation:lakeRipple 3.8s ease-in-out infinite}.city-water.waterfall{background:repeating-linear-gradient(90deg,rgba(240,252,255,.42) 0 3px,rgba(89,184,235,.08) 3px 12px);animation:fallFlow 1.15s linear infinite;background-size:28px 46px}.waterfall-foam{height:18px;border-radius:50%;background:radial-gradient(ellipse,rgba(245,254,255,.5),transparent 68%);animation:foam 1.1s ease-in-out infinite}.tree-sway{border-radius:50%;background:radial-gradient(ellipse,rgba(93,177,86,.13),transparent 70%);animation:treeSway 4.4s ease-in-out infinite;transform-origin:50% 90%}.chimney-smoke{width:10px;height:10px;border-radius:50%;background:rgba(220,220,215,.25);box-shadow:0 -13px 0 rgba(210,210,205,.17),5px -28px 1px rgba(200,200,198,.11);animation:smoke 2.7s ease-out infinite}.city-light{border-radius:50%;filter:blur(9px);mix-blend-mode:screen;animation:lightPulse 2.2s ease-in-out infinite}.city-fountain{width:66px;height:64px;border-radius:50%;background:radial-gradient(ellipse at 50% 75%,rgba(95,215,255,.28),transparent 55%);border-top:3px solid rgba(215,249,255,.34);animation:fountain 1.7s ease-in-out infinite}.city-grass{width:18px;height:8px;border-radius:50%;background:rgba(120,190,95,.07);animation:grass 5.8s ease-in-out infinite}@keyframes riverFlow{to{background-position:84px 30px}}@keyframes fallFlow{to{background-position:0 46px}}@keyframes lakeRipple{50%{transform:scale(1.006);opacity:.26}}@keyframes foam{50%{transform:scaleX(1.08);opacity:.65}}@keyframes treeSway{0%,100%{transform:translateX(-1px) rotate(-.25deg)}50%{transform:translateX(2px) rotate(.35deg)}}@keyframes smoke{0%{transform:translate(0,0) scale(.8);opacity:0}20%{opacity:1}100%{transform:translate(7px,-42px) scale(1.8);opacity:0}}@keyframes lightPulse{50%{transform:scale(1.09);opacity:.22}}@keyframes fountain{50%{transform:scaleY(1.06);filter:brightness(1.15)}}@keyframes grass{0%,85%,100%{transform:translateX(0)}92%{transform:translateX(1.5px) rotate(.5deg)}}
`;
        document.head.appendChild(s);
    }
}
