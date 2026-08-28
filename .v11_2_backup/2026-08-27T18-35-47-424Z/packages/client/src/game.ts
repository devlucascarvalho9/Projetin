import AudioController from './controllers/audio';
import BubbleController from './controllers/bubble';
import EntitiesController from './controllers/entities';
import InfoController from './controllers/info';
import InputController from './controllers/input';
import MenuController from './controllers/menu';
import Pointer from './controllers/pointer';
import SpritesController from './controllers/sprites';
import Zoning from './controllers/zoning';
import JoystickController from './controllers/joystick';
import Player from './entity/character/player/player';
import Handler from './entity/character/player/handler';
import Map from './map/map';
import Connection from './network/connection';
import Socket from './network/socket';
import Camera from './renderer/camera';
import Minigame from './renderer/minigame';
import Overlays from './renderer/overlays';
import WebGL from './renderer/webgl/webgl';
import Canvas from './renderer/canvas';
import Updater from './renderer/updater';
import Pathfinder from './utils/pathfinder';
import Utils from './utils/util';
import { agent, supportsWebGl } from './utils/detect';
import TreeRenderer from './talent-tree/TreeRenderer';
import type { TalentVisualNode } from './talent-tree/TreeRenderer';

import { Packets, Opcodes } from '@kaetram/common/network';

import type App from './app';
import type Entity from './entity/entity';
import type Storage from './utils/storage';
import type Character from './entity/character/character';
import type { TileIgnore } from './utils/pathfinder';
import type Resource from './entity/objects/resource/resource';
import type { TalentPacketData } from '@kaetram/common/network/impl/talent';
import type { EnchantPacketData } from '@kaetram/common/network/impl/enchant';
import type { Enchantments } from '@kaetram/common/types/item';

import SmartAutoFarm from './systems/smart-autofarm';
import TacticalMinimap from './ui/tactical-minimap';
import CombatVfx from './ui/combat-vfx';
import BiomeSystem, { type BiomeId } from './systems/biome-system';
import WarriorSkillbar from './ui/warrior-skillbar';
import ArpgHud from './ui/arpg-hud';
import KayKitCharacter from './ui/kaykit-character';
import CityAmbience from './ui/city-ambience';
import DungeonAmbience from './ui/dungeon-ambience';
import DevPanel from './ui/dev-panel';


export default class Game {
    public player: Player;
    public storage: Storage;

    public map: Map;
    public camera: Camera;

    public zoning: Zoning = new Zoning();
    public overlays: Overlays = new Overlays();
    public pathfinder: Pathfinder = new Pathfinder();

    public info: InfoController = new InfoController();
    public sprites: SpritesController;

    public minigame: Minigame = new Minigame();

    public renderer: WebGL | Canvas;
    public input: InputController;

    public socket: Socket;
    public pointer: Pointer;
    public updater: Updater;
    public audio: AudioController;
    public entities: EntitiesController;
    public bubble: BubbleController;
    public joystick: JoystickController;
    public menu: MenuController;

    public connection: Connection;

    public time = Date.now();
    public timeDiff = Date.now();
    public timeLast = Date.now();
    public targetFPS = 1000 / 50;
    public timeOffset = 0;

    public started = false;
    public ready = false;
    public pvp = false;
    public throttle = false;
    public useWebGl = false;

    // Propriedades do Autofarm
    public autoFarmActive = false;
    private autoFarmTimer = 0;
    public smartAutoFarm: SmartAutoFarm;
    public tacticalMinimap: TacticalMinimap;
    public combatVfx: CombatVfx;
    public biomeSystem: BiomeSystem;
    public warriorSkillbar: WarriorSkillbar;
    public arpgHud: ArpgHud;
    public kayKitCharacter: KayKitCharacter;
    public cityAmbience: CityAmbience;
    public dungeonAmbience: DungeonAmbience;
    public devPanel: DevPanel;

    // Árvore de Talentos do Guerreiro - etapa 1
    // Estes modificadores ficam públicos para o sistema de combate poder consumi-los.
    public talentPhysicalDamageMultiplier = 1;
    public talentAttackSpeedMultiplier = 1;
    public talentCriticalChanceBonus = 0;

    // Estatísticas expostas pela nova Árvore Passiva do Guerreiro.
    // Os sistemas de combate/equipamento podem consumir estes valores gradualmente.
    public talentMaxLifePct = 0;
    public talentArmourPct = 0;
    public talentAllResistancePct = 0;
    public talentAxeDamagePct = 0;
    public talentSpearDamagePct = 0;
    public talentBleedDamagePct = 0;
    public talentMovementSpeedPct = 0;
    public talentPhysicalToFirePct = 0;
    public talentPhysicalToLightningPct = 0;
    public talentElementalPenetrationPct = 0;
    public talentAttackDamagePer100MaxLifePct = 0;
    public talentCannotUseShield = false;

    private readonly warriorTalentStorageKey = 'phaserquest-warrior-talents-v1';
    private importedTalentState?: TalentPacketData;
    private importedTalentFrame?: HTMLIFrameElement;
    private essenceForgePreviewId = '';
    private essenceForgeSelection?: { itemIndex: number; essenceIndex: number };

    public constructor(public app: App) {
        this.storage = app.storage;
        this.useWebGl = supportsWebGl() && this.storage.isWebGl();

        this.player = new Player('', this);

        this.map = new Map(this);
        this.camera = new Camera(this.map.width, this.map.height, this.map.tileSize);
        this.sprites = new SpritesController();

        this.renderer = this.useWebGl ? new WebGL(this) : new Canvas(this);
        this.joystick = new JoystickController(this);
        this.menu = new MenuController(this);
        this.input = new InputController(this);
        this.socket = new Socket(this);
        this.updater = new Updater(this);
        this.audio = new AudioController(this);
        this.entities = new EntitiesController(this);
        this.bubble = new BubbleController(this.renderer, this.entities);
        this.pointer = new Pointer(this.renderer, this.entities);
        this.connection = new Connection(this);

        this.smartAutoFarm = new SmartAutoFarm(this);
        this.tacticalMinimap = new TacticalMinimap(this);
        this.combatVfx = new CombatVfx(this);
        this.biomeSystem = new BiomeSystem(this);
        this.warriorSkillbar = new WarriorSkillbar(this, this.combatVfx);
        this.arpgHud = new ArpgHud(this);
        this.kayKitCharacter = new KayKitCharacter(this);
        this.cityAmbience = new CityAmbience(this);
        this.dungeonAmbience = new DungeonAmbience(this);
        this.devPanel = new DevPanel(this);

        this.map.onReady(() => {
            app.ready();
            this.renderer.load();
            this.createCleanTaskbar();
            this.tacticalMinimap.mount();
            this.combatVfx.mount();
            this.biomeSystem.mount();
            this.arpgHud.mount();
            this.warriorSkillbar.mount();
            this.kayKitCharacter.mount();
            void this.cityAmbience.mount();
            void this.dungeonAmbience.mount();
            this.devPanel.mount();
        });

        app.onLogin(this.socket.connect.bind(this.socket));
        app.onResize(this.resize.bind(this));
        app.onRespawn(this.respawn.bind(this));

        this.player.onSync(this.handlePlayerSync.bind(this));

        window.addEventListener('keydown', (e: KeyboardEvent) => {
            if (['input', 'textarea'].includes((document.activeElement?.tagName || '').toLowerCase())) {
                return;
            }

            if (e.key.toLowerCase() === 'f') {
                this.toggleAutoFarm();
            }

            if (e.key.toLowerCase() === 'm') {
                this.tacticalMinimap.toggleExpanded();
            }
        });

        window.addEventListener('blur', () => {
            if (this.player && typeof this.player.stop === 'function') {
                this.player.stop();
            }
        });
    }

    public toggleAutoFarm(): void {
        this.autoFarmActive = !this.autoFarmActive;
        
        const statusMsg = `[AutoFarm] Status: ${this.autoFarmActive ? 'ATIVADO' : 'DESATIVADO'}`;
        console.log(statusMsg);
        
        // InfoController exibe splats de combate e não possui um método de mensagem textual.
        // Mantemos o status no console e no próprio botão da barra.
        this.updateAutoFarmButtonUI();
    }

    private openWorldMapSelector(): void {
        if (document.getElementById('world-map-selector')) return;

        const destinations = [
            {
                id: -2,
                name: 'Cidade Inicial Estruturada',
                biome: 'meadow' as BiomeId,
                biomeName: 'Cidade V11.1',
                requirement: 'Teleporte /cidade',
                description: 'Cidade em região nova e vazia, com casas, rios, fonte e estruturas usando colisão real.'
            },
            {
                id: -3,
                name: 'Cripta V11.0',
                biome: 'ash' as BiomeId,
                biomeName: 'Dungeon',
                requirement: 'Teleporte /dungeon',
                description: 'Dungeon procedural com Skeletons KayKit e o boss Crypt Lord.'
            },
            {
                id: -1,
                name: 'Cidade Animada Antiga',
                biome: 'meadow' as BiomeId,
                biomeName: 'Cidade V10.x',
                requirement: 'Teleporte /cidadeantiga',
                description: 'Versão anterior mantida apenas para comparação e testes.'
            },
            {
                id: 0,
                name: 'Mudwich',
                biome: 'meadow' as BiomeId,
                biomeName: 'Campos Verdes',
                requirement: 'Liberado para teleporte',
                description: 'Cidade inicial e ponto seguro para começar sua jornada.'
            },
            {
                id: 1,
                name: 'Aynor',
                biome: 'ash' as BiomeId,
                biomeName: 'Terras Cinzentas',
                requirement: 'Liberado para teleporte',
                description: 'Região antiga acessível após avançar na história.'
            },
            {
                id: 2,
                name: 'Lakesworld',
                biome: 'frost' as BiomeId,
                biomeName: 'Lagos Congelados',
                requirement: 'Liberado para teleporte',
                description: 'Área dos lagos e rotas do deserto.'
            },
            {
                id: 3,
                name: 'Patsow',
                biome: 'crimson' as BiomeId,
                biomeName: 'Campos Carmesim',
                requirement: 'Liberado para teleporte',
                description: 'Destino avançado desbloqueado por conquista.'
            },
            {
                id: 4,
                name: 'Crullfield',
                biome: 'desert' as BiomeId,
                biomeName: 'Deserto Antigo',
                requirement: 'Liberado para teleporte',
                description: 'Campos de Crull, conectados à progressão do deserto.'
            },
            {
                id: 5,
                name: 'Undersea',
                biome: 'abyss' as BiomeId,
                biomeName: 'Abismo Submerso',
                requirement: 'Liberado para teleporte',
                description: 'Região submersa e conteúdo aquático.'
            }
        ];

        const overlay = document.createElement('div');
        overlay.id = 'world-map-selector';
        Object.assign(overlay.style, {
            position: 'fixed',
            inset: '0',
            zIndex: '999998',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
            background: 'rgba(3, 5, 8, 0.86)',
            backdropFilter: 'blur(6px)'
        });

        const panel = document.createElement('div');
        Object.assign(panel.style, {
            width: 'min(920px, 94vw)',
            maxHeight: '88vh',
            overflow: 'auto',
            border: '1px solid rgba(183, 143, 70, 0.55)',
            borderRadius: '14px',
            background: 'linear-gradient(180deg, rgba(17, 18, 21, 0.98), rgba(8, 10, 13, 0.98))',
            boxShadow: '0 24px 80px rgba(0, 0, 0, 0.65)',
            color: '#f4e3b2',
            fontFamily: 'Georgia, serif'
        });

        const header = document.createElement('div');
        Object.assign(header.style, {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            padding: '18px 20px',
            borderBottom: '1px solid rgba(183, 143, 70, 0.32)'
        });

        const heading = document.createElement('div');
        heading.innerHTML = '<div style="font-size:24px;font-weight:700;color:#e7bd64">MAPAS DO MUNDO</div><div style="margin-top:3px;font:12px Arial,sans-serif;color:#a99879">Escolha um destino. Todos os mapas estão liberados nesta fase de desenvolvimento.</div>';

        const close = document.createElement('button');
        close.type = 'button';
        close.textContent = '✕';
        Object.assign(close.style, {
            width: '42px',
            height: '42px',
            flex: '0 0 auto',
            borderRadius: '8px',
            border: '1px solid #745e38',
            background: '#0d1014',
            color: '#fff',
            cursor: 'pointer',
            fontSize: '18px'
        });

        header.appendChild(heading);
        header.appendChild(close);

        const content = document.createElement('div');
        Object.assign(content.style, {
            display: 'grid',
            gridTemplateColumns: 'minmax(240px, 0.85fr) minmax(320px, 1.35fr)',
            gap: '20px',
            padding: '20px'
        });

        const preview = document.createElement('div');
        Object.assign(preview.style, {
            minHeight: '310px',
            border: '1px solid rgba(183, 143, 70, 0.28)',
            borderRadius: '10px',
            backgroundColor: '#0a0d10',
            backgroundImage: "url('/img/interface/mapframe.png')",
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
            backgroundSize: '94% auto',
            imageRendering: 'pixelated',
            position: 'relative'
        });

        const previewCaption = document.createElement('div');
        previewCaption.textContent = 'Mapa atual do mundo de Kaetram';
        Object.assign(previewCaption.style, {
            position: 'absolute',
            left: '12px',
            right: '12px',
            bottom: '10px',
            padding: '8px 10px',
            borderRadius: '7px',
            background: 'rgba(0,0,0,.72)',
            color: '#cbb98f',
            textAlign: 'center',
            font: '12px Arial, sans-serif'
        });
        preview.appendChild(previewCaption);

        const list = document.createElement('div');
        Object.assign(list.style, {
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: '10px'
        });

        const cleanup = () => {
            document.removeEventListener('keydown', onKeyDown, true);
            overlay.remove();
        };

        const selectDestination = (id: number, biome: BiomeId) => {
            this.biomeSystem.setBiome(biome);
            if (id === -2) this.socket.send(Packets.Chat, ['/cidade']);
            else if (id === -3) this.socket.send(Packets.Chat, ['/dungeon']);
            else if (id === -1) this.socket.send(Packets.Chat, ['/cidadeantiga']);
            else this.socket.send(Packets.Warp, { id });
            cleanup();
        };

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') cleanup();
        };

        destinations.forEach((destination) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.setAttribute('aria-label', `Teleportar para ${destination.name}`);
            Object.assign(button.style, {
                minHeight: '112px',
                padding: '13px',
                border: '1px solid rgba(183, 143, 70, 0.32)',
                borderRadius: '9px',
                background: 'rgba(255,255,255,.035)',
                color: '#e8d7ad',
                textAlign: 'left',
                cursor: 'pointer',
                transition: 'background .15s ease, border-color .15s ease, transform .15s ease'
            });

            const name = document.createElement('div');
            name.textContent = destination.name;
            Object.assign(name.style, {
                color: '#efc86d',
                font: '700 16px Georgia, serif',
                marginBottom: '6px'
            });

            const description = document.createElement('div');
            description.textContent = destination.description;
            Object.assign(description.style, {
                color: '#c8b995',
                font: '12px/1.35 Arial, sans-serif',
                marginBottom: '8px'
            });

            const requirement = document.createElement('div');
            requirement.textContent = `Bioma: ${destination.biomeName} • ${destination.requirement}`;
            Object.assign(requirement.style, {
                color: '#8f9aa6',
                font: '11px Arial, sans-serif'
            });

            button.appendChild(name);
            button.appendChild(description);
            button.appendChild(requirement);
            button.addEventListener('mouseenter', () => {
                button.style.background = 'rgba(191, 144, 61, .11)';
                button.style.borderColor = 'rgba(224, 174, 84, .72)';
                button.style.transform = 'translateY(-1px)';
            });
            button.addEventListener('mouseleave', () => {
                button.style.background = 'rgba(255,255,255,.035)';
                button.style.borderColor = 'rgba(183, 143, 70, 0.32)';
                button.style.transform = 'translateY(0)';
            });
            button.addEventListener('click', () => selectDestination(destination.id, destination.biome));
            list.appendChild(button);
        });

        const responsive = document.createElement('style');
        responsive.textContent = `
            @media (max-width: 720px) {
                #world-map-selector > div > div:nth-child(2) { grid-template-columns: 1fr !important; }
                #world-map-selector > div > div:nth-child(2) > div:nth-child(2) { grid-template-columns: 1fr !important; }
            }
        `;

        close.addEventListener('click', cleanup);
        overlay.addEventListener('click', (event) => {
            if (event.target === overlay) cleanup();
        });
        document.addEventListener('keydown', onKeyDown, true);

        content.appendChild(preview);
        content.appendChild(list);
        panel.appendChild(header);
        panel.appendChild(content);
        overlay.appendChild(panel);
        overlay.appendChild(responsive);
        document.body.appendChild(overlay);
    }

    private createCleanTaskbar(): void {
        if (document.getElementById('game-taskbar')) return;

        const bar = document.createElement('div');
        bar.id = 'game-taskbar';
        Object.assign(bar.style, {
            position: 'fixed',
            top: '15px',
            right: '25px',
            zIndex: '9999',
            display: 'flex',
            flexDirection: 'row',
            flexWrap: 'wrap',
            maxWidth: 'calc(100vw - 24px)',
            gap: '8px',
            padding: '6px 12px',
            backgroundColor: 'rgba(20, 20, 20, 0.85)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '10px',
            backdropFilter: 'blur(5px)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            fontFamily: 'sans-serif',
            fontSize: '13px'
        });

        const buttons = [
            { id: 'btn-autofarm', label: '⚔️ AutoFarm: OFF', action: () => this.toggleAutoFarm() },
            { id: 'btn-talents', label: '✨ Árvore de Talentos', action: () => this.openTalentTree() },
            { id: 'btn-teleport', label: '🗺️ Mapas', action: () => this.openWorldMapSelector() },
            { id: 'btn-minimap', label: '🧭 Radar', action: () => this.tacticalMinimap.toggleExpanded() },
            { id: 'btn-craft', label: '🔨 Craft', action: () => this.openCraftForge() },
            { id: 'btn-character', label: '👤 Personagem', action: () => this.openRoadmapSystem('character') },
            { id: 'btn-skills', label: '⚡ Skills', action: () => this.warriorSkillbar.openInfo() },
            { id: 'btn-dungeon', label: '🚪 Dungeons', action: () => this.openRoadmapSystem('dungeons') },
            { id: 'btn-boss', label: '👹 Bosses', action: () => this.openRoadmapSystem('bosses') },
            { id: 'btn-endgame', label: '🏰 Endgame', action: () => this.openRoadmapSystem('endgame') },
            { id: 'btn-idle', label: '🤖 Idle', action: () => this.openRoadmapSystem('idle') }
        ];

        buttons.forEach((item) => {
            const btn = document.createElement('button');
            btn.id = item.id;
            btn.innerText = item.label;
            Object.assign(btn.style, {
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#ffffff',
                padding: '6px 12px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: '600',
                whiteSpace: 'nowrap',
                transition: 'all 0.2s ease',
                outline: 'none'
            });

            btn.onmouseover = () => { 
                if (!(item.id === 'btn-autofarm' && this.autoFarmActive)) {
                    btn.style.background = 'rgba(255, 255, 255, 0.25)'; 
                }
            };
            btn.onmouseout = () => { 
                if (item.id === 'btn-autofarm' && this.autoFarmActive) {
                    btn.style.background = '#2e7d32';
                } else {
                    btn.style.background = 'rgba(255, 255, 255, 0.1)';
                }
            };

            btn.onclick = (e) => {
                e.preventDefault();
                btn.blur();
                item.action();
            };

            bar.appendChild(btn);
        });

        document.body.appendChild(bar);
    }

    /**
     * Abre a nova Forja de Essências V8. Esta versão é uma bancada visual/testável:
     * lê os itens do inventário atual, permite escolher item + essência e gera uma
     * prévia de atributos antes/depois. A gravação permanente dos affixes no item
     * ficará para a próxima etapa do sistema de equipamentos.
     */
    private openCraftForge(): void {
        if (document.getElementById('essence-forge-modal')) return;

        type ForgeSlot = HTMLElement & {
            name?: string;
            description?: string;
            attackStats?: Record<string, number>;
            defenseStats?: Record<string, number>;
            bonuses?: Record<string, number>;
            enchantments?: Enchantments;
            count?: number;
        };

        type ForgeSelection = {
            index: number;
            key: string;
            name: string;
            image: string;
            slot: ForgeSlot;
        };

        const essenceNames: Record<string, string> = {
            essencebruta: 'Essência Bruta',
            essencesangrenta: 'Essência Sangrenta',
            essenceafiada: 'Essência Afiada',
            essenceguardia: 'Essência Guardiã',
            essencerunica: 'Essência Rúnica'
        };

        const state: { item?: ForgeSelection; essence?: ForgeSelection } = {};
        this.essenceForgePreviewId = '';
        this.essenceForgeSelection = undefined;

        const overlay = document.createElement('div');
        overlay.id = 'essence-forge-modal';
        Object.assign(overlay.style, {
            position: 'fixed', inset: '0', zIndex: '1000000', background: 'rgba(0,0,0,.62)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'serif', color: '#d8c7a3'
        });

        const style = document.createElement('style');
        style.textContent = `
            #essence-forge-modal * { box-sizing:border-box; }
            .forge-arpg { width:min(1080px,calc(100vw - 32px)); min-height:590px; display:grid; grid-template-columns:280px 1fr 350px; gap:14px; padding:16px; border:1px solid #8a6b36; border-radius:12px; background:radial-gradient(circle at 50% 15%,rgba(139,89,24,.24),transparent 34%),linear-gradient(180deg,#11171c,#07090c); box-shadow:0 28px 90px rgba(0,0,0,.76); position:relative; }
            .forge-arpg .panel { background:rgba(5,9,12,.76); border:1px solid rgba(150,113,54,.55); border-radius:10px; padding:13px; }
            .forge-arpg h2 { margin:0;color:#f0c66b;font-size:24px;letter-spacing:.06em; }
            .forge-arpg h3 { margin:0 0 9px;color:#e3b85f;font-size:14px;text-transform:uppercase;letter-spacing:.07em; }
            .forge-arpg .sub,.forge-arpg .note { color:#998a70;font:12px/1.45 sans-serif; }
            .forge-arpg .close { position:absolute;right:12px;top:12px;width:40px;height:40px;border:1px solid #8a6b36;border-radius:8px;background:#12161a;color:white;font-size:21px;cursor:pointer; }
            .forge-arpg .inventory-grid { display:grid;grid-template-columns:repeat(5,1fr);gap:7px;margin-top:12px;max-height:430px;overflow:auto; }
            .forge-arpg .inv-slot { aspect-ratio:1;border:1px solid #4f4635;border-radius:7px;background:#10161b;position:relative;cursor:pointer;padding:3px; }
            .forge-arpg .inv-slot:hover { border-color:#c4933e;box-shadow:0 0 0 1px rgba(228,174,73,.22); }
            .forge-arpg .inv-slot .img { width:100%;height:100%;background-position:center;background-repeat:no-repeat;background-size:contain;image-rendering:pixelated; }
            .forge-arpg .badge { position:absolute;right:2px;bottom:1px;font:10px sans-serif;background:#000b;padding:1px 3px;border-radius:3px;color:#fff; }
            .forge-arpg .slot { height:116px;border:1px solid rgba(216,176,88,.55);border-radius:10px;background:rgba(0,0,0,.35);display:grid;place-items:center;overflow:hidden; }
            .forge-arpg .slot .icon { width:62px;height:62px;background-repeat:no-repeat;background-position:center;background-size:contain;image-rendering:pixelated; }
            .forge-arpg .slot.empty::after { content:attr(data-label);color:#746b59;font:11px sans-serif;text-transform:uppercase;letter-spacing:.07em; }
            .forge-arpg .picked { min-height:35px;margin-top:7px;color:#f0d18b;font:13px/1.25 sans-serif; }
            .forge-arpg .formula { display:grid;grid-template-columns:1fr 48px 1fr;gap:11px;align-items:center; }
            .forge-arpg .plus { text-align:center;font-size:27px;color:#d6a43d; }
            .forge-arpg .forge-core { width:122px;height:122px;margin:18px auto;border-radius:50%;display:grid;place-items:center;border:2px solid #9e7632;box-shadow:0 0 45px rgba(207,140,35,.2),inset 0 0 30px #000;background:radial-gradient(circle,#563413 0,#17130e 45%,#07090c 74%);font-size:42px;color:#f2c464; }
            .forge-arpg .roll { width:100%;height:46px;border:1px solid #d19a3c;border-radius:8px;background:linear-gradient(#7a3b1d,#35140d);color:#ffe2a0;font-weight:800;letter-spacing:.07em;cursor:pointer; }
            .forge-arpg button:disabled { opacity:.42;cursor:not-allowed; }
            .forge-arpg .compare { display:grid;grid-template-columns:1fr 1fr;gap:10px; }
            .forge-arpg ul { margin:0;padding-left:17px; }
            .forge-arpg li { margin:5px 0;font:12px/1.3 sans-serif; }
            .forge-arpg .before li { color:#ccb38f; } .forge-arpg .after li { color:#9ee48e; }
            .forge-arpg .tier { display:inline-block;margin-right:4px;padding:1px 4px;border-radius:3px;background:#5e451d;color:#ffe199;font-weight:bold; }
            .forge-arpg .actions { display:flex;gap:8px;margin-top:13px; }.forge-arpg .actions button { flex:1;height:39px;border-radius:7px;border:1px solid #715831;background:#10151a;color:#d9c494;cursor:pointer; }
            .forge-arpg .actions .accept { border-color:#a8792e;background:linear-gradient(#60351c,#28110b);color:#ffda8e; }
            @media (max-width:850px){ .forge-arpg{grid-template-columns:1fr;max-height:94vh;overflow:auto}.forge-arpg .inventory-grid{max-height:180px} }
        `;

        const root = document.createElement('div');
        root.className = 'forge-arpg';
        root.innerHTML = `
            <button class="close" type="button">×</button>
            <section class="panel"><h3>Inventário</h3><div class="sub">Escolha um equipamento e uma Essência.</div><div id="forgeInventory" class="inventory-grid"></div><div class="note" style="margin-top:10px">Atributos da Essência são rolados e validados pelo servidor.</div></section>
            <section>
                <div class="panel"><h2>FORJA DE ESSÊNCIAS</h2><div class="sub">T1 é o melhor tier • o Item Level limita quais tiers podem aparecer</div><div class="forge-core">✦</div></div>
                <div class="panel formula" style="margin-top:12px"><div><h3>Item</h3><div id="forgeItemSlot" class="slot empty" data-label="Escolha item"><div class="icon"></div></div><div id="forgeItemName" class="picked">Nenhum item.</div></div><div class="plus">+</div><div><h3>Essência</h3><div id="forgeEssenceSlot" class="slot empty" data-label="Escolha essência"><div class="icon"></div></div><div id="forgeEssenceName" class="picked">Nenhuma essência.</div></div></div>
                <button id="forgeRoll" class="roll" style="margin-top:12px" type="button" disabled>ROLAR NO SERVIDOR</button>
                <div id="forgeStatus" class="note" style="margin-top:9px">Selecione os dois itens para começar.</div>
            </section>
            <section class="panel"><h3>Antes / Depois</h3><div class="compare"><div><h3>Antes</h3><ul id="forgeBefore" class="before"><li>Selecione um item.</li></ul></div><div><h3>Depois</h3><ul id="forgeAfter" class="after"><li>Role os atributos.</li></ul></div></div><div class="actions"><button id="forgeAccept" class="accept" type="button" disabled>ACEITAR E SALVAR</button><button id="forgeCancel" type="button">CANCELAR</button></div><div class="note" style="margin-top:10px">Aceitar consome 1 Essência e salva imediatamente no MongoDB para personagens persistentes.</div></section>`;

        const inventoryGrid = root.querySelector<HTMLElement>('#forgeInventory')!;
        const rollButton = root.querySelector<HTMLButtonElement>('#forgeRoll')!;
        const acceptButton = root.querySelector<HTMLButtonElement>('#forgeAccept')!;
        const beforeList = root.querySelector<HTMLUListElement>('#forgeBefore')!;
        const afterList = root.querySelector<HTMLUListElement>('#forgeAfter')!;
        const status = root.querySelector<HTMLElement>('#forgeStatus')!;

        const isEssence = (key: string) => key.startsWith('essence');
        const customAffixes = (slot: ForgeSlot) => Object.values(slot.enchantments || {}).filter((entry) => ['essence', 'arpg', 'unique'].includes(entry.source || ''));
        const renderBefore = () => {
            if (!state.item) { beforeList.innerHTML = '<li>Selecione um item.</li>'; return; }
            const affixes = customAffixes(state.item.slot);
            if (affixes.length) {
                beforeList.innerHTML = affixes.map((a) => `<li><span class="tier">T${a.tier || a.level}</span>${a.label || a.stat || 'Atributo'}</li>`).join('');
                return;
            }
            const b = state.item.slot.bonuses || {}, a = state.item.slot.attackStats || {}, d = state.item.slot.defenseStats || {};
            const lines: string[] = [];
            if ((b.strength || 0) > 0) lines.push(`+${b.strength} Força`);
            if ((b.accuracy || 0) > 0) lines.push(`+${b.accuracy} Precisão`);
            if ((a.slash || 0) > 0) lines.push(`+${a.slash} Corte`);
            if ((a.crush || 0) > 0) lines.push(`+${a.crush} Impacto`);
            if ((a.stab || 0) > 0) lines.push(`+${a.stab} Perfuração`);
            if ((d.crush || 0) > 0) lines.push(`+${d.crush} Defesa base`);
            beforeList.innerHTML = (lines.slice(0,5).length ? lines.slice(0,5) : ['Sem affixes ARPG.']).map((x) => `<li>${x}</li>`).join('');
        };

        const updateSlots = () => {
            const itemBox = root.querySelector<HTMLElement>('#forgeItemSlot')!, essenceBox = root.querySelector<HTMLElement>('#forgeEssenceSlot')!;
            itemBox.classList.toggle('empty', !state.item); essenceBox.classList.toggle('empty', !state.essence);
            itemBox.querySelector<HTMLElement>('.icon')!.style.backgroundImage = state.item?.image || '';
            essenceBox.querySelector<HTMLElement>('.icon')!.style.backgroundImage = state.essence?.image || '';
            root.querySelector<HTMLElement>('#forgeItemName')!.textContent = state.item?.name || 'Nenhum item.';
            root.querySelector<HTMLElement>('#forgeEssenceName')!.textContent = state.essence?.name || 'Nenhuma essência.';
            rollButton.disabled = !state.item || !state.essence;
            renderBefore();
        };

        const select = (choice: ForgeSelection) => {
            if (isEssence(choice.key)) state.essence = choice; else state.item = choice;
            this.essenceForgePreviewId = '';
            acceptButton.disabled = true; afterList.innerHTML = '<li>Role os atributos.</li>';
            status.textContent = 'Pronto para gerar uma prévia no servidor.';
            updateSlots();
        };

        for (const slot of Array.from(document.querySelectorAll<ForgeSlot>('#inventory-container > ul > li'))) {
            const key = slot.dataset.key || ''; if (!key) continue;
            const image = slot.querySelector<HTMLElement>('.item-image')?.style.backgroundImage || '';
            const button = document.createElement('button'); button.className='inv-slot'; button.type='button'; button.title=slot.name || key;
            button.innerHTML = `<div class="img"></div>${Number(slot.dataset.count || 0)>1?`<span class="badge">${slot.dataset.count}</span>`:''}`;
            button.querySelector<HTMLElement>('.img')!.style.backgroundImage=image;
            const itemIndex = Number(slot.querySelector<HTMLElement>('.item-slot')?.dataset.index || -1);
            button.onclick=()=>select({index:itemIndex,key,name:isEssence(key)?essenceNames[key]||slot.name||key:slot.name||key,image,slot}); inventoryGrid.appendChild(button);
        }
        if (!inventoryGrid.children.length) inventoryGrid.innerHTML='<div class="sub">Inventário vazio.</div>';

        rollButton.onclick = () => {
            if (!state.item || !state.essence) return;
            this.essenceForgeSelection = { itemIndex: state.item.index, essenceIndex: state.essence.index };
            this.essenceForgePreviewId = '';
            acceptButton.disabled = true; status.textContent = 'Rolando tiers no servidor…';
            this.socket.send(Packets.Enchant, { opcode: Opcodes.Enchant.EssencePreview, index: state.item.index, shardIndex: state.essence.index });
        };
        acceptButton.onclick = () => {
            if (!this.essenceForgePreviewId) return;
            acceptButton.disabled = true; status.textContent = 'Aplicando e salvando…';
            this.socket.send(Packets.Enchant, { opcode: Opcodes.Enchant.EssenceApply, previewId: this.essenceForgePreviewId });
        };
        const close = () => {
            if (this.essenceForgePreviewId) this.socket.send(Packets.Enchant, { opcode: Opcodes.Enchant.EssenceCancel, previewId: this.essenceForgePreviewId });
            this.essenceForgePreviewId=''; this.essenceForgeSelection=undefined; overlay.remove();
        };
        root.querySelector<HTMLButtonElement>('.close')!.onclick=close;
        root.querySelector<HTMLButtonElement>('#forgeCancel')!.onclick=close;
        overlay.append(style,root); document.body.appendChild(overlay); updateSlots();
    }

    /** Receives authoritative Essence Forge previews/results from the server. */
    public handleEssenceForgePacket(opcode: Opcodes.Enchant, info: EnchantPacketData): void {
        const modal=document.getElementById('essence-forge-modal'); if(!modal) return;
        const after=modal.querySelector<HTMLUListElement>('#forgeAfter'), status=modal.querySelector<HTMLElement>('#forgeStatus'), accept=modal.querySelector<HTMLButtonElement>('#forgeAccept');
        if(!after||!status||!accept) return;
        if(opcode===Opcodes.Enchant.EssencePreview){
            this.essenceForgePreviewId=info.previewId||'';
            const affixes=info.affixes||[];
            after.innerHTML=affixes.length?affixes.map(a=>`<li><span class="tier">T${a.tier||a.level}</span>${a.label||a.stat||'Atributo'}</li>`).join(''):'<li>Sem atributos.</li>';
            status.textContent=info.message||'Prévia recebida.'; accept.disabled=!this.essenceForgePreviewId;
        } else if(opcode===Opcodes.Enchant.EssenceApply){
            status.textContent=info.message||'Reforja aplicada e salva.'; accept.disabled=true; this.essenceForgePreviewId='';
        } else if(opcode===Opcodes.Enchant.EssenceCancel){
            status.textContent=info.message||'Prévia cancelada.'; accept.disabled=true; this.essenceForgePreviewId='';
        }
    }

    private openRoadmapSystem(kind: 'character'|'skills'|'dungeons'|'bosses'|'endgame'|'idle'): void {
        if(document.getElementById('roadmap-system-modal')) return;
        const overlay=document.createElement('div'); overlay.id='roadmap-system-modal'; Object.assign(overlay.style,{position:'fixed',inset:'0',zIndex:'999999',background:'rgba(0,0,0,.55)',display:'grid',placeItems:'center'});
        const panel=document.createElement('div'); Object.assign(panel.style,{width:'min(720px,calc(100vw - 30px))',maxHeight:'80vh',overflow:'auto',background:'linear-gradient(180deg,#111820,#080b0f)',border:'1px solid #806436',borderRadius:'12px',padding:'18px',color:'#d9c79f',fontFamily:'serif',boxShadow:'0 25px 70px #000b'});
        const username=this.player.name||'Jogador', level=this.player.level||1, xp=this.player.getTotalExperience?.()||0;
        const arpgSettings=(window as any).__kaetramArpgSettings || {supports:{cleave:[],whirlwind:[],warcry:[]},lootFilter:{minRarity:'normal',autoSellAtOrBelow:'off'}};
        const mapTier=Math.max(1,Math.min(10,Math.ceil(level/10)));
        const supportCount=Object.values(arpgSettings.supports||{}).reduce((total:number,list:any)=>total+(Array.isArray(list)?list.length:0),0);
        const commandButton=(label:string,command:string)=>`<button data-arpg-cmd="${command}" style="margin:4px 5px 4px 0;padding:7px 10px;border:1px solid #765a2f;border-radius:6px;background:#15130f;color:#e9cc83;cursor:pointer">${label}</button>`;
        const content:Record<string,{title:string;html:string}>={
            character:{title:'👤 Personagem / Progressão',html:`<p><b>${username}</b> • Level ${level}</p><p>XP total: ${xp.toLocaleString('pt-BR')}</p><p>Itens ARPG agora usam raridade, Item Level, prefixos/sufixos e tiers de affix condicionados ao ilvl.</p>`},
            skills:{title:'⚡ Skills + Supports',html:`<p>Active Skills de guerreiro: <b>Cleave, Steelstorm e Warcry</b>.</p><p>Supports vinculados: <b>${supportCount}/6</b>. Cada skill aceita até 2 supports compatíveis.</p><p>Abra o painel Skills para ver mana, cooldown e Supports resultantes.</p>`},
            dungeons:{title:'🚪 Dungeons — Cripta V11.0',html:`<p>A primeira dungeon procedural já está ativa: <b>Cripta V11.0</b>, gerada com rot.js e ambientada com assets KayKit Dungeon.</p><p><b>Conteúdo:</b> 9 salas conectadas, corredores, colisões reais, 15 esqueletos KayKit e o boss <b>Crypt Lord</b>.</p><p>${commandButton('Entrar na Cripta','/dungeon')}${commandButton('Voltar para a Cidade Estruturada','/cidade')}</p><p style="color:#8f8268">Elimine os esqueletos e avance até a sala do boss. A dungeon é uma área isolada do mapa principal.</p>`},
            bosses:{title:'👹 Bosses',html:'<p>Bosses e minibosses agora recebem bônus de quantidade/raridade de loot ARPG e têm chance maior de equipamentos Raros/Únicos.</p><p>Elites aparecem dinamicamente em tiers maiores.</p>'},
            endgame:{title:'🏰 Endgame — Map Tiers / Elites',html:`<p>Tier estimado pelo seu nível atual: <b style="color:#d7a7ff">T${mapTier}</b>.</p><p>Elites podem rolar modificadores <b>Brutal</b>, <b>Fortificado</b>, <b>Veloz</b> e <b>Arcano</b>, alterando HP, dano, defesa e velocidade.</p><p>Tiers maiores aumentam quantidade e raridade dos drops. Use <b>/maptier</b> para consultar pelo servidor.</p>`},
            idle:{title:'🤖 Idle / Farm — Loot Filter',html:`<p>AutoFarm: <b>${this.autoFarmActive?'ATIVO':'DESATIVADO'}</b> • filtro mínimo: <b>${arpgSettings.lootFilter?.minRarity||'normal'}</b> • auto-sell: <b>${arpgSettings.lootFilter?.autoSellAtOrBelow||'off'}</b>.</p><p><b>Coletar a partir de:</b><br>${commandButton('Normal','/lootfilter normal')}${commandButton('Magic','/lootfilter magic')}${commandButton('Rare','/lootfilter rare')}${commandButton('Unique','/lootfilter unique')}</p><p><b>Auto-Sell:</b><br>${commandButton('OFF','/autosell off')}${commandButton('Normal ou pior','/autosell normal')}${commandButton('Magic ou pior','/autosell magic')}${commandButton('Rare ou pior','/autosell rare')}</p><p style="color:#8f8268">Essências e itens legados/quest não são descartados pelo filtro/auto-sell.</p>`}
        };
        const info=content[kind]; panel.innerHTML=`<div style="display:flex;justify-content:space-between;gap:14px;align-items:center"><h2 style="margin:0;color:#efc566">${info.title}</h2><button id="roadmapClose" style="width:38px;height:38px;background:#13171b;border:1px solid #806436;border-radius:7px;color:white;cursor:pointer">×</button></div><div style="font:14px/1.6 sans-serif;margin-top:14px;color:#c8b994">${info.html}</div>`;
        panel.querySelector<HTMLButtonElement>('#roadmapClose')!.onclick=()=>overlay.remove();
        panel.querySelectorAll<HTMLButtonElement>('[data-arpg-cmd]').forEach((button)=>button.onclick=()=>{
            const command=button.dataset.arpgCmd;
            if(command) this.socket.send(Packets.Chat,[command]);
        });
        overlay.onclick=e=>{if(e.target===overlay)overlay.remove()}; overlay.appendChild(panel); document.body.appendChild(overlay);
    }

    private openImportedPoeTree(): void {
        if (document.getElementById('talent-tree-imported-modal')) return;

        const modal = document.createElement('div');
        modal.id = 'talent-tree-imported-modal';
        Object.assign(modal.style, {
            position: 'fixed',
            inset: '0',
            width: '100vw',
            height: '100vh',
            zIndex: '999999',
            background: '#07090c',
            overflow: 'hidden'
        });

        const iframe = document.createElement('iframe');
        iframe.src = '/poe2-tree/index-kaetram-v7-1.html?v=20260825-2230';
        iframe.title = 'Árvore Passiva Completa';
        iframe.setAttribute('allow', 'fullscreen');
        Object.assign(iframe.style, {
            position: 'absolute',
            inset: '0',
            width: '100%',
            height: '100%',
            border: '0',
            background: '#07090c'
        });

        const close = document.createElement('button');
        close.type = 'button';
        close.innerText = '✕';
        close.title = 'Fechar árvore';
        Object.assign(close.style, {
            position: 'absolute',
            top: '14px',
            right: '14px',
            zIndex: '5',
            width: '44px',
            height: '44px',
            borderRadius: '8px',
            border: '1px solid #745e38',
            background: 'rgba(10,12,16,.94)',
            color: '#fff',
            fontSize: '20px',
            cursor: 'pointer',
            boxShadow: '0 8px 24px rgba(0,0,0,.45)'
        });

        const postTalentState = () => {
            if (!this.importedTalentState || !iframe.contentWindow) return;
            iframe.contentWindow.postMessage(
                { type: 'kaetram-talents-sync', payload: this.importedTalentState },
                window.location.origin
            );
        };

        const onTreeMessage = (event: MessageEvent) => {
            if (event.origin !== window.location.origin || event.source !== iframe.contentWindow) return;

            const message = event.data as { type?: string; node?: string; ascendancy?: string };

            switch (message?.type) {
                case 'kaetram-talents-ready': {
                    this.importedTalentFrame = iframe;
                    postTalentState();
                    this.socket.send(Packets.Talent, { opcode: Opcodes.Talent.Sync });
                    break;
                }
                case 'kaetram-talents-toggle': {
                    if (message.node)
                        this.socket.send(Packets.Talent, { opcode: Opcodes.Talent.Toggle, node: message.node });
                    break;
                }
                case 'kaetram-talents-reset': {
                    this.socket.send(Packets.Talent, { opcode: Opcodes.Talent.Reset });
                    break;
                }
                case 'kaetram-talents-ascendancy': {
                    if (message.ascendancy)
                        this.socket.send(Packets.Talent, { opcode: Opcodes.Talent.Ascendancy, ascendancy: message.ascendancy });
                    break;
                }
            }
        };

        const cleanup = () => {
            document.removeEventListener('keydown', onKeyDown, true);
            window.removeEventListener('message', onTreeMessage);
            if (this.importedTalentFrame === iframe) this.importedTalentFrame = undefined;
            modal.remove();
        };
        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') cleanup();
        };

        close.onclick = cleanup;
        document.addEventListener('keydown', onKeyDown, true);
        window.addEventListener('message', onTreeMessage);
        modal.appendChild(iframe);
        modal.appendChild(close);
        document.body.appendChild(modal);
    }

    /** Recebe o estado validado pelo servidor e o encaminha ao viewer preservando o layout. */
    public updateImportedTalentState(data: TalentPacketData): void {
        this.importedTalentState = data;

        this.importedTalentFrame?.contentWindow?.postMessage(
            { type: 'kaetram-talents-sync', payload: data },
            window.location.origin
        );
    }

    /**
     * Entrada única da árvore de talentos. Durante a migração, TODAS as chamadas
     * abrem a árvore focada do Guerreiro; a árvore antiga fica apenas como legado.
     */
    private openTalentTree(): void {
        this.openImportedPoeTree();
    }

    private openLegacyTalentTree(): void {
        if (document.getElementById('talent-tree-modal')) return;

        type Effect = {
            strength?: number;
            dexterity?: number;
            intelligence?: number;
            lifeFlat?: number;
            lifePct?: number;
            physicalDamagePct?: number;
            attackSpeedPct?: number;
            criticalChancePct?: number;
            criticalMultiplierPct?: number;
            armourPct?: number;
            allResistancePct?: number;
            fireDamagePct?: number;
            lightningDamagePct?: number;
            elementalDamagePct?: number;
            weaponDamagePct?: number;
            axeDamagePct?: number;
            spearDamagePct?: number;
            bleedDamagePct?: number;
            postureDamagePct?: number;
            armourPenPct?: number;
            movementSpeedPct?: number;
            lifeLeechPct?: number;
            lifeRegenPct?: number;
            physicalToFirePct?: number;
            physicalToLightningPct?: number;
            elementalPenetrationPct?: number;
            attackDamagePer100MaxLifePct?: number;
        };

        type NodeType = 'minor' | 'notable' | 'mastery' | 'keystone';

        type MasteryOption = {
            name: string;
            desc: string;
            effect: Effect;
        };

        type TalentNode = {
            id: string;
            name: string;
            desc: string;
            x: number;
            y: number;
            type: NodeType;
            cluster: string;
            tags: string[];
            cost: number;
            icon: string;
            effect?: Effect;
            masteryOptions?: MasteryOption[];
            masteryRequired?: number;
            masteryNotableId?: string;
            specialRules?: string[];
        };

        type SavedState = {
            unlocked: string[];
            masteries: Record<string, number>;
        };

        type RingPassive = {
            name: string;
            desc: string;
            effect: Effect;
            icon?: string;
            notable?: boolean;
        };

        type ClusterSpec = {
            id: string;
            title: string;
            cx: number;
            cy: number;
            radius?: number;
            startAngle?: number;
            color: string;
            tags: string[];
            passives: RingPassive[];
            mastery: {
                name: string;
                desc: string;
                icon: string;
                options: MasteryOption[];
            };
        };

        const STORAGE_KEY = 'phaserquest-warrior-tree-v5-radial-web';
        const rawLevel = Number((this.player as unknown as { level?: number }).level || 1);

        // Desenvolvimento: mínimo de 45 pontos para conseguirmos testar rotas híbridas.
        // Em produção, troque por: const totalPoints = Math.max(0, rawLevel - 1);
        const pointsFromLevel = Math.max(0, rawLevel - 1);
        const totalPoints = Math.max(45, pointsFromLevel);

        let saved: SavedState = { unlocked: [], masteries: {} };

        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw) as SavedState;
                saved = {
                    unlocked: Array.isArray(parsed.unlocked) ? parsed.unlocked : [],
                    masteries: parsed.masteries && typeof parsed.masteries === 'object' ? parsed.masteries : {}
                };
            }
        } catch {
            saved = { unlocked: [], masteries: {} };
        }

        const state: Record<string, boolean> = { center: true };
        saved.unlocked.forEach((id) => state[id] = true);
        const masterySelections: Record<string, number> = { ...saved.masteries };

        const WORLD_W = 3400;
        const WORLD_H = 2500;
        const CENTER_X = 1700;
        const CENTER_Y = 1250;

        const nodes: TalentNode[] = [];
        const byId: Record<string, TalentNode> = {};
        const adjacency: Record<string, Set<string>> = { center: new Set<string>() };
        const edgePairs: Array<[string, string]> = [];
        const edgeSet = new Set<string>();

        const polar = (cx: number, cy: number, distance: number, angleDeg: number) => {
            const r = angleDeg * Math.PI / 180;
            return { x: cx + Math.cos(r) * distance, y: cy + Math.sin(r) * distance };
        };

        const addNode = (node: TalentNode) => {
            nodes.push(node);
            byId[node.id] = node;
            if (!adjacency[node.id]) adjacency[node.id] = new Set<string>();
            return node;
        };

        const connect = (a: string, b: string) => {
            if (a === b) return;
            const key = [a, b].sort().join('::');
            if (edgeSet.has(key)) return;
            edgeSet.add(key);
            edgePairs.push([a, b]);
            if (!adjacency[a]) adjacency[a] = new Set<string>();
            if (!adjacency[b]) adjacency[b] = new Set<string>();
            adjacency[a].add(b);
            adjacency[b].add(a);
        };

        const iconFromEffect = (effect: Effect, fallback = '•') => {
            if (effect.lifePct || effect.lifeFlat) return '♥';
            if (effect.axeDamagePct) return '🪓';
            if (effect.spearDamagePct) return '🔱';
            if (effect.bleedDamagePct) return '🩸';
            if (effect.armourPct) return '⬢';
            if (effect.fireDamagePct || effect.physicalToFirePct) return '🔥';
            if (effect.lightningDamagePct || effect.physicalToLightningPct) return '⚡';
            if (effect.criticalChancePct || effect.criticalMultiplierPct) return '✦';
            if (effect.attackSpeedPct || effect.movementSpeedPct) return '➤';
            if (effect.physicalDamagePct || effect.weaponDamagePct) return '⚔';
            if (effect.allResistancePct) return '✥';
            if (effect.strength) return 'S';
            if (effect.dexterity) return 'D';
            if (effect.intelligence) return 'I';
            return fallback;
        };

        // ============================================================
        // 1) CENTRO — FUNDAMENTOS DO GUERREIRO
        // ============================================================
        // O centro não escolhe a build. Ele é uma malha curta e interconectada.
        // Dano pode desviar para Vida; Vida pode sair em Técnica; Defesa pode
        // atravessar para dano físico sem precisar voltar ao Spawn.
        const coreInner = [
            { id: 'core_power', angle: -90, name: 'Força Bruta', desc: '+10 STR e +4% Dano Físico.', effect: { strength: 10, physicalDamagePct: 4 }, icon: 'S', tags: ['core','attack'] },
            { id: 'core_vital', angle: -30, name: 'Corpo Treinado', desc: '+4% Vida Máxima e +5 STR.', effect: { lifePct: 4, strength: 5 }, icon: '♥', tags: ['core','life'] },
            { id: 'core_technique', angle: 30, name: 'Instinto Guerreiro', desc: '+8 DEX e +3% Velocidade de Ataque.', effect: { dexterity: 8, attackSpeedPct: 3 }, icon: 'D', tags: ['core','attack','spear'] },
            { id: 'core_guard', angle: 90, name: 'Pele de Ferro', desc: '+10% Armadura e +2% Vida Máxima.', effect: { armourPct: 10, lifePct: 2 }, icon: '⬢', tags: ['core','defense','life'] },
            { id: 'core_resolve', angle: 150, name: 'Veterano de Batalha', desc: '+4% Vida Máxima e +5% Dano Físico.', effect: { lifePct: 4, physicalDamagePct: 5 }, icon: '⚔', tags: ['core','life','attack'] },
            { id: 'core_adaptation', angle: 210, name: 'Disciplina Marcial', desc: '+4% Velocidade de Ataque e +8% Armadura.', effect: { attackSpeedPct: 4, armourPct: 8 }, icon: '✦', tags: ['core','defense','attack'] }
        ] as const;

        coreInner.forEach((spec) => {
            const p = polar(CENTER_X, CENTER_Y, 165, spec.angle);
            addNode({
                id: spec.id,
                name: spec.name,
                desc: spec.desc,
                x: p.x,
                y: p.y,
                type: 'minor',
                cluster: 'core',
                tags: [...spec.tags],
                cost: 1,
                icon: spec.icon,
                effect: { ...spec.effect }
            });
            connect('center', spec.id);
        });

        for (let i = 0; i < coreInner.length; i++) {
            connect(coreInner[i].id, coreInner[(i + 1) % coreInner.length].id);
        }

        const coreOuter = [
            { id: 'core_outer_0', angle: -112, name: 'Potência Sustentada', desc: '+6% Dano Físico e +2% Vida Máxima.', effect: { physicalDamagePct: 6, lifePct: 2 }, icon: '⚔', tags: ['core','attack','life'] },
            { id: 'core_outer_1', angle: -75, name: 'Força Vital', desc: '+10 STR e +3% Vida Máxima.', effect: { strength: 10, lifePct: 3 }, icon: 'S', tags: ['core','life'] },
            { id: 'core_outer_2', angle: -38, name: 'Precisão Marcial', desc: '+8 DEX e +5% Chance de Crítico.', effect: { dexterity: 8, criticalChancePct: 5 }, icon: '✦', tags: ['core','attack','spear'] },
            { id: 'core_outer_3', angle: 0, name: 'Ritmo de Combate', desc: '+5% Velocidade de Ataque e +3% Dano com Armas.', effect: { attackSpeedPct: 5, weaponDamagePct: 3 }, icon: '➤', tags: ['core','attack'] },
            { id: 'core_outer_4', angle: 38, name: 'Guarda Móvel', desc: '+8% Armadura, +2% Vida e +2% Velocidade de Movimento.', effect: { armourPct: 8, lifePct: 2, movementSpeedPct: 2 }, icon: '⬢', tags: ['core','defense','life'] },
            { id: 'core_outer_5', angle: 75, name: 'Corpo e Aço', desc: '+12% Armadura, +3% Vida Máxima e +5 STR.', effect: { armourPct: 12, lifePct: 3, strength: 5 }, icon: '⬢', tags: ['core','defense','life'] },
            { id: 'core_outer_6', angle: 112, name: 'Sangue do Guerreiro', desc: '+5% Vida Máxima e +3% Dano Físico.', effect: { lifePct: 5, physicalDamagePct: 3 }, icon: '♥', tags: ['core','life','attack'] },
            { id: 'core_outer_7', angle: 150, name: 'Postura Ofensiva', desc: '+6% Dano Físico e +8% Armadura.', effect: { physicalDamagePct: 6, armourPct: 8 }, icon: '⚔', tags: ['core','attack','defense'] },
            { id: 'core_outer_8', angle: 188, name: 'Treino de Campo', desc: '+5 STR, +5 DEX e +2% Vida Máxima.', effect: { strength: 5, dexterity: 5, lifePct: 2 }, icon: 'S', tags: ['core','life','attack'] },
            { id: 'core_outer_9', angle: 225, name: 'Muralha Agressiva', desc: '+10% Armadura e +4% Dano com Armas.', effect: { armourPct: 10, weaponDamagePct: 4 }, icon: '⬢', tags: ['core','defense','attack'] }
        ] as const;

        coreOuter.forEach((spec, index) => {
            const p = polar(CENTER_X, CENTER_Y, 345, spec.angle);
            addNode({
                id: spec.id,
                name: spec.name,
                desc: spec.desc,
                x: p.x,
                y: p.y,
                type: index === 0 || index === 5 ? 'notable' : 'minor',
                cluster: 'core',
                tags: [...spec.tags],
                cost: 1,
                icon: spec.icon,
                effect: { ...spec.effect }
            });

            // Liga ao node interno angularmente mais próximo.
            const closestInner = coreInner.reduce((best, candidate) => {
                const dBest = Math.abs((((spec.angle - best.angle) % 360) + 540) % 360 - 180);
                const dCandidate = Math.abs((((spec.angle - candidate.angle) % 360) + 540) % 360 - 180);
                return dCandidate < dBest ? candidate : best;
            }, coreInner[0]);
            connect(spec.id, closestInner.id);
        });

        for (let i = 0; i < coreOuter.length; i++) {
            connect(coreOuter[i].id, coreOuter[(i + 1) % coreOuter.length].id);
        }

        // ============================================================
        // 2) CLUSTERS NO ESTILO POE
        // ============================================================
        // Ring de passivas = rota real. Mastery fica no centro do círculo e NÃO
        // recebe estrada. Ela é liberada pelo Notável + 4 passivas do cluster.
        const clusters: Record<string, {
            spec: ClusterSpec;
            ringIds: string[];
            notableId: string;
            masteryId: string;
        }> = {};

        const makeCluster = (spec: ClusterSpec) => {
            const radius = spec.radius || 112;
            const startAngle = spec.startAngle === undefined ? -150 : spec.startAngle;
            const ringIds: string[] = [];
            let notableId = '';

            spec.passives.forEach((passive, index) => {
                const angle = startAngle + index * (360 / spec.passives.length);
                const p = polar(spec.cx, spec.cy, radius, angle);
                const id = `${spec.id}_node_${index}`;
                const isNotable = !!passive.notable;

                addNode({
                    id,
                    name: passive.name,
                    desc: passive.desc,
                    x: p.x,
                    y: p.y,
                    type: isNotable ? 'notable' : 'minor',
                    cluster: spec.id,
                    tags: [...spec.tags],
                    cost: 1,
                    icon: passive.icon || iconFromEffect(passive.effect, isNotable ? '✦' : '•'),
                    effect: { ...passive.effect }
                });

                ringIds.push(id);
                if (isNotable) notableId = id;
            });

            ringIds.forEach((id, index) => connect(id, ringIds[(index + 1) % ringIds.length]));

            if (!notableId) notableId = ringIds[Math.floor(ringIds.length / 2)];

            const masteryId = `${spec.id}_mastery`;
            addNode({
                id: masteryId,
                name: spec.mastery.name,
                desc: spec.mastery.desc,
                x: spec.cx,
                y: spec.cy,
                type: 'mastery',
                cluster: spec.id,
                tags: [...spec.tags, 'mastery'],
                cost: 1,
                icon: spec.mastery.icon,
                masteryOptions: spec.mastery.options,
                masteryRequired: 4,
                masteryNotableId: notableId
            });

            clusters[spec.id] = { spec, ringIds, notableId, masteryId };
        };

        // ---------- MACHADOS / IMPACTO ----------
        makeCluster({
            id: 'axe_impact',
            title: 'Machados — Impacto',
            cx: 930,
            cy: 610,
            color: '#b56b3e',
            tags: ['axe','attack','physical'],
            startAngle: -165,
            passives: [
                { name: 'Lâmina Pesada', desc: '+7% Dano com Machado.', effect: { axeDamagePct: 7 }, icon: '🪓' },
                { name: 'Braços Fortes', desc: '+10 STR e +3% Dano com Machado.', effect: { strength: 10, axeDamagePct: 3 }, icon: 'S' },
                { name: 'Impacto', desc: '+8% Dano Físico e +8% Dano de Postura.', effect: { physicalDamagePct: 8, postureDamagePct: 8 }, icon: '⚔' },
                { name: 'Peso da Montanha', desc: '+22% Dano com Machado e +15% Dano de Postura.', effect: { axeDamagePct: 22, postureDamagePct: 15 }, icon: '🪓', notable: true },
                { name: 'Golpe Demolidor', desc: '+9% Dano com Machado; -2% Velocidade de Ataque.', effect: { axeDamagePct: 9, attackSpeedPct: -2 }, icon: '🪓' },
                { name: 'Rachadura', desc: '+10% Penetração de Armadura.', effect: { armourPenPct: 10 }, icon: '✹' }
            ],
            mastery: {
                name: 'Mastery de Machado',
                desc: 'Especialize o comportamento dos golpes com Machado.',
                icon: '🪓',
                options: [
                    { name: 'Machado Brutal', desc: '+18% Dano com Machado.', effect: { axeDamagePct: 18 } },
                    { name: 'Golpe de Ruptura', desc: '+20% Dano de Postura.', effect: { postureDamagePct: 20 } },
                    { name: 'Veterano de Duas Mãos', desc: '+10% Dano com Armas e +6% Dano Físico.', effect: { weaponDamagePct: 10, physicalDamagePct: 6 } }
                ]
            }
        });

        // ---------- SANGRAMENTO ----------
        makeCluster({
            id: 'bleed',
            title: 'Feridas e Sangramento',
            cx: 1240,
            cy: 390,
            color: '#a83939',
            tags: ['bleed','attack','physical'],
            startAngle: -145,
            passives: [
                { name: 'Corte Aberto', desc: '+10% Dano de Sangramento.', effect: { bleedDamagePct: 10 }, icon: '🩸' },
                { name: 'Sangue Exposto', desc: '+12% Dano de Sangramento.', effect: { bleedDamagePct: 12 }, icon: '🩸' },
                { name: 'Pressão Constante', desc: '+5% Dano Físico e +8% Sangramento.', effect: { physicalDamagePct: 5, bleedDamagePct: 8 }, icon: '⚔' },
                { name: 'Ferida Profunda', desc: '+28% Dano de Sangramento e +5% Dano Físico.', effect: { bleedDamagePct: 28, physicalDamagePct: 5 }, icon: '🩸', notable: true },
                { name: 'Hemorragia', desc: '+14% Dano de Sangramento.', effect: { bleedDamagePct: 14 }, icon: '🩸' },
                { name: 'Carnificina', desc: '+6% Dano com Machado e +8% Sangramento.', effect: { axeDamagePct: 6, bleedDamagePct: 8 }, icon: '🪓' }
            ],
            mastery: {
                name: 'Mastery de Sangramento',
                desc: 'Escolha como as feridas escalam.',
                icon: '🩸',
                options: [
                    { name: 'Sangue sem Fim', desc: '+25% Dano de Sangramento.', effect: { bleedDamagePct: 25 } },
                    { name: 'Ferida e Força', desc: '+15% Sangramento e +10 STR.', effect: { bleedDamagePct: 15, strength: 10 } },
                    { name: 'Sanguessuga Cruel', desc: '+1% de Dano Físico recuperado como Vida e +10% Sangramento.', effect: { lifeLeechPct: 1, bleedDamagePct: 10 } }
                ]
            }
        });

        // ---------- FÍSICO HÍBRIDO ----------
        makeCluster({
            id: 'physical_hybrid',
            title: 'Veterano Marcial',
            cx: 1180,
            cy: 910,
            color: '#c09a55',
            tags: ['physical','attack','life'],
            passives: [
                { name: 'Golpe Treinado', desc: '+6% Dano Físico.', effect: { physicalDamagePct: 6 } },
                { name: 'Corpo de Guerra', desc: '+3% Vida Máxima e +4% Dano Físico.', effect: { lifePct: 3, physicalDamagePct: 4 }, icon: '♥' },
                { name: 'Força de Combate', desc: '+10 STR e +4% Dano com Armas.', effect: { strength: 10, weaponDamagePct: 4 }, icon: 'S' },
                { name: 'Veterano de Cem Batalhas', desc: '+7% Vida Máxima e +12% Dano Físico.', effect: { lifePct: 7, physicalDamagePct: 12 }, icon: '⚔', notable: true },
                { name: 'Ritmo Pesado', desc: '+4% Velocidade de Ataque e +4% Dano Físico.', effect: { attackSpeedPct: 4, physicalDamagePct: 4 }, icon: '➤' },
                { name: 'Fôlego de Guerra', desc: '+3% Vida Máxima e +0.4% Regeneração de Vida.', effect: { lifePct: 3, lifeRegenPct: 0.4 }, icon: '♥' }
            ],
            mastery: {
                name: 'Mastery Marcial',
                desc: 'Misture dano, corpo e ritmo sem fechar a build.',
                icon: '⚔',
                options: [
                    { name: 'Corpo e Dano', desc: '+5% Vida Máxima e +10% Dano Físico.', effect: { lifePct: 5, physicalDamagePct: 10 } },
                    { name: 'Força Bruta', desc: '+20 STR e +6% Dano com Armas.', effect: { strength: 20, weaponDamagePct: 6 } },
                    { name: 'Ritmo Marcial', desc: '+8% Velocidade de Ataque e +4% Dano Físico.', effect: { attackSpeedPct: 8, physicalDamagePct: 4 } }
                ]
            }
        });

        // ---------- VIDA / JUGGERNAUT DE SANGUE ----------
        makeCluster({
            id: 'blood_life',
            title: 'Juggernaut de Sangue',
            cx: 2040,
            cy: 500,
            color: '#b04a4a',
            tags: ['life','blood','attack'],
            startAngle: -155,
            passives: [
                { name: 'Constituição', desc: '+4% Vida Máxima.', effect: { lifePct: 4 }, icon: '♥' },
                { name: 'Sangue Forte', desc: '+30 Vida e +5 STR.', effect: { lifeFlat: 30, strength: 5 }, icon: '♥' },
                { name: 'Carne de Guerra', desc: '+4% Vida Máxima e +3% Dano Físico.', effect: { lifePct: 4, physicalDamagePct: 3 }, icon: '♥' },
                { name: 'Corpo de Guerra', desc: '+8% Vida Máxima e +8% Dano Físico.', effect: { lifePct: 8, physicalDamagePct: 8 }, icon: '♥', notable: true },
                { name: 'Pulso Violento', desc: '+3% Vida Máxima e +4% Velocidade de Ataque.', effect: { lifePct: 3, attackSpeedPct: 4 }, icon: '➤' },
                { name: 'Recuperação Brutal', desc: '+0.8% Regeneração de Vida e +2% Vida Máxima.', effect: { lifeRegenPct: 0.8, lifePct: 2 }, icon: '♥' }
            ],
            mastery: {
                name: 'Mastery de Vida',
                desc: 'Transforme Vida em sustentação ou potência.',
                icon: '♥',
                options: [
                    { name: 'Reserva de Sangue', desc: '+8% Vida Máxima.', effect: { lifePct: 8 } },
                    { name: 'Sangue Guerreiro', desc: '+1% Dano Físico recuperado como Vida.', effect: { lifeLeechPct: 1 } },
                    { name: 'Vida Ofensiva', desc: '+4% Vida Máxima e +8% Dano Físico.', effect: { lifePct: 4, physicalDamagePct: 8 } }
                ]
            }
        });

        // ---------- REGEN / RESILIÊNCIA ----------
        makeCluster({
            id: 'blood_recovery',
            title: 'Resiliência',
            cx: 2310,
            cy: 790,
            color: '#8d5b4c',
            tags: ['life','defense'],
            passives: [
                { name: 'Fôlego', desc: '+0.4% Regeneração de Vida.', effect: { lifeRegenPct: 0.4 }, icon: '♥' },
                { name: 'Pele Grossa', desc: '+8% Armadura e +2% Vida Máxima.', effect: { armourPct: 8, lifePct: 2 }, icon: '⬢' },
                { name: 'Persistência', desc: '+3% Vida Máxima e +4% Resistências.', effect: { lifePct: 3, allResistancePct: 4 }, icon: '♥' },
                { name: 'Sangue de Ferro', desc: '+6% Vida Máxima, +12% Armadura e +0.5% Regeneração.', effect: { lifePct: 6, armourPct: 12, lifeRegenPct: 0.5 }, icon: '⬢', notable: true },
                { name: 'Fortitude', desc: '+10 STR e +5% Armadura.', effect: { strength: 10, armourPct: 5 }, icon: 'S' },
                { name: 'Recuperação', desc: '+0.5% Regeneração e +20 Vida.', effect: { lifeRegenPct: 0.5, lifeFlat: 20 }, icon: '♥' }
            ],
            mastery: {
                name: 'Mastery de Recuperação',
                desc: 'Escolha uma camada defensiva baseada em Vida.',
                icon: '♥',
                options: [
                    { name: 'Carne Resistente', desc: '+5% Vida Máxima e +8% Armadura.', effect: { lifePct: 5, armourPct: 8 } },
                    { name: 'Regeneração Profunda', desc: '+1.2% Regeneração de Vida.', effect: { lifeRegenPct: 1.2 } },
                    { name: 'Resiliência Elemental', desc: '+5% Vida Máxima e +6% Resistências.', effect: { lifePct: 5, allResistancePct: 6 } }
                ]
            }
        });

        // ---------- LANÇA / PENETRAÇÃO ----------
        makeCluster({
            id: 'spear_precision',
            title: 'Lanças — Penetração',
            cx: 2790,
            cy: 970,
            color: '#4c9294',
            tags: ['spear','attack','crit'],
            startAngle: -160,
            passives: [
                { name: 'Estocada', desc: '+7% Dano com Lança.', effect: { spearDamagePct: 7 }, icon: '🔱' },
                { name: 'Ponta Perfurante', desc: '+8% Penetração de Armadura e +5% Dano com Lança.', effect: { armourPenPct: 8, spearDamagePct: 5 }, icon: '🔱' },
                { name: 'Precisão', desc: '+10 DEX e +4% Chance de Crítico.', effect: { dexterity: 10, criticalChancePct: 4 }, icon: 'D' },
                { name: 'Distância Mortal', desc: '+18% Dano com Lança e +10% Chance de Crítico.', effect: { spearDamagePct: 18, criticalChancePct: 10 }, icon: '🔱', notable: true },
                { name: 'Perfuração', desc: '+12% Penetração de Armadura.', effect: { armourPenPct: 12 }, icon: '✹' },
                { name: 'Estocada Rápida', desc: '+5% Velocidade de Ataque e +5% Dano com Lança.', effect: { attackSpeedPct: 5, spearDamagePct: 5 }, icon: '➤' }
            ],
            mastery: {
                name: 'Mastery de Lança',
                desc: 'Especialize alcance, perfuração ou ritmo.',
                icon: '🔱',
                options: [
                    { name: 'Alcance Mortal', desc: '+20% Dano com Lança.', effect: { spearDamagePct: 20 } },
                    { name: 'Perfuração Superior', desc: '+18% Penetração de Armadura.', effect: { armourPenPct: 18 } },
                    { name: 'Lança Rápida', desc: '+10% Velocidade de Ataque e +8% Dano com Lança.', effect: { attackSpeedPct: 10, spearDamagePct: 8 } }
                ]
            }
        });

        // ---------- LANÇA / MOBILIDADE ----------
        makeCluster({
            id: 'spear_mobility',
            title: 'Caçador Móvel',
            cx: 2860,
            cy: 1390,
            color: '#5686a2',
            tags: ['spear','mobility','attack'],
            passives: [
                { name: 'Passo Rápido', desc: '+3% Velocidade de Movimento.', effect: { movementSpeedPct: 3 }, icon: '➤' },
                { name: 'Reflexos', desc: '+8 DEX e +3% Velocidade de Ataque.', effect: { dexterity: 8, attackSpeedPct: 3 }, icon: 'D' },
                { name: 'Investida', desc: '+4% Velocidade de Movimento e +4% Dano com Lança.', effect: { movementSpeedPct: 4, spearDamagePct: 4 }, icon: '➤' },
                { name: 'Passo do Caçador', desc: '+7% Movimento, +8% Ataque e +8% Dano com Lança.', effect: { movementSpeedPct: 7, attackSpeedPct: 8, spearDamagePct: 8 }, icon: '➤', notable: true },
                { name: 'Mãos Leves', desc: '+5% Velocidade de Ataque.', effect: { attackSpeedPct: 5 }, icon: '➤' },
                { name: 'Golpe Fluido', desc: '+6% Dano com Lança e +3% Chance de Crítico.', effect: { spearDamagePct: 6, criticalChancePct: 3 }, icon: '🔱' }
            ],
            mastery: {
                name: 'Mastery de Mobilidade',
                desc: 'Escolha velocidade pura ou ataque em movimento.',
                icon: '➤',
                options: [
                    { name: 'Caçador', desc: '+7% Velocidade de Movimento.', effect: { movementSpeedPct: 7 } },
                    { name: 'Ritmo de Estocada', desc: '+10% Velocidade de Ataque.', effect: { attackSpeedPct: 10 } },
                    { name: 'Mobilidade Letal', desc: '+4% Movimento e +8% Chance de Crítico.', effect: { movementSpeedPct: 4, criticalChancePct: 8 } }
                ]
            }
        });

        // ---------- CRÍTICO HÍBRIDO ----------
        makeCluster({
            id: 'crit_hybrid',
            title: 'Precisão Letal',
            cx: 2440,
            cy: 1190,
            color: '#7b69b8',
            tags: ['crit','attack','spear'],
            passives: [
                { name: 'Olho Afiado', desc: '+4% Chance de Crítico.', effect: { criticalChancePct: 4 }, icon: '✦' },
                { name: 'Golpe Preciso', desc: '+5% Chance de Crítico e +3% Dano com Armas.', effect: { criticalChancePct: 5, weaponDamagePct: 3 }, icon: '✦' },
                { name: 'Ritmo Letal', desc: '+4% Velocidade de Ataque e +4% Crítico.', effect: { attackSpeedPct: 4, criticalChancePct: 4 }, icon: '➤' },
                { name: 'Assassino Marcial', desc: '+14% Chance de Crítico e +15% Multiplicador Crítico.', effect: { criticalChancePct: 14, criticalMultiplierPct: 15 }, icon: '✦', notable: true },
                { name: 'Ponto Fraco', desc: '+10% Multiplicador Crítico.', effect: { criticalMultiplierPct: 10 }, icon: '✦' },
                { name: 'Força e Precisão', desc: '+8 STR, +8 DEX e +3% Crítico.', effect: { strength: 8, dexterity: 8, criticalChancePct: 3 }, icon: 'S' }
            ],
            mastery: {
                name: 'Mastery de Crítico',
                desc: 'Escolha chance, multiplicador ou híbrido.',
                icon: '✦',
                options: [
                    { name: 'Olho Mortal', desc: '+12% Chance de Crítico.', effect: { criticalChancePct: 12 } },
                    { name: 'Golpe Devastador', desc: '+25% Multiplicador Crítico.', effect: { criticalMultiplierPct: 25 } },
                    { name: 'Duelista', desc: '+7% Ataque e +7% Crítico.', effect: { attackSpeedPct: 7, criticalChancePct: 7 } }
                ]
            }
        });

        // ---------- RÚNICO / FOGO ----------
        makeCluster({
            id: 'runic_fire',
            title: 'Guerreiro Rúnico — Fogo',
            cx: 2310,
            cy: 1940,
            color: '#c65b38',
            tags: ['runic','fire','elemental','attack'],
            startAngle: -150,
            passives: [
                { name: 'Brasa Marcial', desc: '+8% Dano de Fogo.', effect: { fireDamagePct: 8 }, icon: '🔥' },
                { name: 'Runa Rubra', desc: '+8 INT e +5% Dano Elemental.', effect: { intelligence: 8, elementalDamagePct: 5 }, icon: 'I' },
                { name: 'Arma Incandescente', desc: '10% do Físico convertido para Fogo e +6% Fogo.', effect: { physicalToFirePct: 10, fireDamagePct: 6 }, icon: '🔥' },
                { name: 'Forja Ardente', desc: '15% do Físico convertido para Fogo e +16% Dano de Fogo.', effect: { physicalToFirePct: 15, fireDamagePct: 16 }, icon: '🔥', notable: true },
                { name: 'Calor de Batalha', desc: '+5% Velocidade de Ataque e +7% Fogo.', effect: { attackSpeedPct: 5, fireDamagePct: 7 }, icon: '🔥' },
                { name: 'Penetração Ígnea', desc: '+6% Penetração Elemental.', effect: { elementalPenetrationPct: 6 }, icon: '✹' }
            ],
            mastery: {
                name: 'Mastery Rúnica de Fogo',
                desc: 'Aprofunde conversão ou dano elemental.',
                icon: '🔥',
                options: [
                    { name: 'Arma em Chamas', desc: '+15% Dano de Fogo e 10% conversão adicional para Fogo.', effect: { fireDamagePct: 15, physicalToFirePct: 10 } },
                    { name: 'Runa Penetrante', desc: '+10% Penetração Elemental.', effect: { elementalPenetrationPct: 10 } },
                    { name: 'Sangue Quente', desc: '+10% Fogo e +4% Vida Máxima.', effect: { fireDamagePct: 10, lifePct: 4 } }
                ]
            }
        });

        // ---------- RÚNICO / RAIO ----------
        makeCluster({
            id: 'runic_lightning',
            title: 'Guerreiro Rúnico — Raio',
            cx: 2740,
            cy: 1930,
            color: '#4f79c7',
            tags: ['runic','lightning','elemental','attack'],
            passives: [
                { name: 'Carga', desc: '+8% Dano de Raio.', effect: { lightningDamagePct: 8 }, icon: '⚡' },
                { name: 'Runa Azul', desc: '+8 INT e +5% Dano Elemental.', effect: { intelligence: 8, elementalDamagePct: 5 }, icon: 'I' },
                { name: 'Condutor de Guerra', desc: '10% do Físico convertido para Raio e +4% Ataque.', effect: { physicalToLightningPct: 10, attackSpeedPct: 4 }, icon: '⚡' },
                { name: 'Tempestade Marcial', desc: '15% do Físico convertido para Raio, +15% Raio e +5% Ataque.', effect: { physicalToLightningPct: 15, lightningDamagePct: 15, attackSpeedPct: 5 }, icon: '⚡', notable: true },
                { name: 'Golpe Elétrico', desc: '+8% Raio e +4% Chance de Crítico.', effect: { lightningDamagePct: 8, criticalChancePct: 4 }, icon: '⚡' },
                { name: 'Descarga Precisa', desc: '+6% Penetração Elemental.', effect: { elementalPenetrationPct: 6 }, icon: '✹' }
            ],
            mastery: {
                name: 'Mastery Rúnica de Raio',
                desc: 'Aprofunde conversão, velocidade ou crítico.',
                icon: '⚡',
                options: [
                    { name: 'Arma Trovejante', desc: '+15% Raio e 10% conversão adicional para Raio.', effect: { lightningDamagePct: 15, physicalToLightningPct: 10 } },
                    { name: 'Condutor Marcial', desc: '+10% Velocidade de Ataque e +8% Raio.', effect: { attackSpeedPct: 10, lightningDamagePct: 8 } },
                    { name: 'Precisão Elétrica', desc: '+10% Raio e +8% Chance de Crítico.', effect: { lightningDamagePct: 10, criticalChancePct: 8 } }
                ]
            }
        });

        // ---------- ELEMENTAL HÍBRIDO ----------
        makeCluster({
            id: 'runic_hybrid',
            title: 'Forja Rúnica',
            cx: 2340,
            cy: 1580,
            color: '#8c6fb1',
            tags: ['runic','elemental','attack'],
            passives: [
                { name: 'Marca Rúnica', desc: '+6% Dano Elemental com Ataques.', effect: { elementalDamagePct: 6 }, icon: '✦' },
                { name: 'Força Rúnica', desc: '+10 STR e +6 INT.', effect: { strength: 10, intelligence: 6 }, icon: 'S' },
                { name: 'Arma Encantada', desc: '+5% Dano com Armas e +5% Elemental.', effect: { weaponDamagePct: 5, elementalDamagePct: 5 }, icon: '⚔' },
                { name: 'Forja Rúnica', desc: '+14% Dano Elemental, +8% Dano com Armas e +4% Penetração.', effect: { elementalDamagePct: 14, weaponDamagePct: 8, elementalPenetrationPct: 4 }, icon: '✦', notable: true },
                { name: 'Runas Gêmeas', desc: '+7% Fogo e +7% Raio.', effect: { fireDamagePct: 7, lightningDamagePct: 7 }, icon: '✦' },
                { name: 'Afinidade', desc: '+5% Elemental e +3% Vida Máxima.', effect: { elementalDamagePct: 5, lifePct: 3 }, icon: '♥' }
            ],
            mastery: {
                name: 'Mastery Rúnica',
                desc: 'Misture dano elemental com atributos ou defesa.',
                icon: '✦',
                options: [
                    { name: 'Força da Forja', desc: '+12% Elemental e +10 STR.', effect: { elementalDamagePct: 12, strength: 10 } },
                    { name: 'Mente da Forja', desc: '+12% Elemental e +10 INT.', effect: { elementalDamagePct: 12, intelligence: 10 } },
                    { name: 'Armadura Rúnica', desc: '+10% Armadura, +6% Resistências e +6% Elemental.', effect: { armourPct: 10, allResistancePct: 6, elementalDamagePct: 6 } }
                ]
            }
        });

        // ---------- SENTINELA / ARMADURA ----------
        makeCluster({
            id: 'sentinel_armour',
            title: 'Sentinela — Armadura',
            cx: 980,
            cy: 1920,
            color: '#6f8f54',
            tags: ['sentinel','defense','armour','life'],
            startAngle: -160,
            passives: [
                { name: 'Placas', desc: '+10% Armadura.', effect: { armourPct: 10 }, icon: '⬢' },
                { name: 'Corpo Blindado', desc: '+3% Vida Máxima e +8% Armadura.', effect: { lifePct: 3, armourPct: 8 }, icon: '⬢' },
                { name: 'Fortitude', desc: '+10 STR e +6% Armadura.', effect: { strength: 10, armourPct: 6 }, icon: 'S' },
                { name: 'Muralha Viva', desc: '+25% Armadura e +5% Vida Máxima.', effect: { armourPct: 25, lifePct: 5 }, icon: '🛡', notable: true },
                { name: 'Postura', desc: '+10% Armadura e +3% Resistências.', effect: { armourPct: 10, allResistancePct: 3 }, icon: '⬢' },
                { name: 'Aço Vivo', desc: '+8% Armadura e +0.4% Regeneração de Vida.', effect: { armourPct: 8, lifeRegenPct: 0.4 }, icon: '♥' }
            ],
            mastery: {
                name: 'Mastery de Armadura',
                desc: 'Escolha Armadura pura, Vida ou Resistências.',
                icon: '🛡',
                options: [
                    { name: 'Fortaleza', desc: '+28% Armadura.', effect: { armourPct: 28 } },
                    { name: 'Defensor', desc: '+14% Armadura e +5% Vida Máxima.', effect: { armourPct: 14, lifePct: 5 } },
                    { name: 'Aço Elemental', desc: '+12% Armadura e +8% Resistências.', effect: { armourPct: 12, allResistancePct: 8 } }
                ]
            }
        });

        // ---------- SENTINELA / GUARDA ----------
        makeCluster({
            id: 'sentinel_guard',
            title: 'Sentinela — Guarda',
            cx: 620,
            cy: 1510,
            color: '#5e7e63',
            tags: ['sentinel','defense','life'],
            passives: [
                { name: 'Defensor', desc: '+8% Armadura e +2% Vida Máxima.', effect: { armourPct: 8, lifePct: 2 }, icon: '🛡' },
                { name: 'Resistência', desc: '+5% Resistências.', effect: { allResistancePct: 5 }, icon: '✥' },
                { name: 'Corpo Protetor', desc: '+4% Vida Máxima.', effect: { lifePct: 4 }, icon: '♥' },
                { name: 'Guardião da Companhia', desc: '+6% Vida, +12% Armadura e +6% Resistências.', effect: { lifePct: 6, armourPct: 12, allResistancePct: 6 }, icon: '🛡', notable: true },
                { name: 'Interposição', desc: '+10% Armadura e +3% Vida Máxima.', effect: { armourPct: 10, lifePct: 3 }, icon: '🛡' },
                { name: 'Resiliência', desc: '+6% Resistências e +0.3% Regeneração.', effect: { allResistancePct: 6, lifeRegenPct: 0.3 }, icon: '✥' }
            ],
            mastery: {
                name: 'Mastery de Sentinela',
                desc: 'Aprofunde o papel de protetor.',
                icon: '🛡',
                options: [
                    { name: 'Muralha', desc: '+20% Armadura e +4% Vida Máxima.', effect: { armourPct: 20, lifePct: 4 } },
                    { name: 'Proteção Elemental', desc: '+10% Resistências.', effect: { allResistancePct: 10 } },
                    { name: 'Regeneração de Guarda', desc: '+1% Regeneração de Vida e +3% Vida Máxima.', effect: { lifeRegenPct: 1, lifePct: 3 } }
                ]
            }
        });

        // ---------- SENTINELA / RESISTÊNCIA HÍBRIDA ----------
        makeCluster({
            id: 'sentinel_resist',
            title: 'Bastião Elemental',
            cx: 1260,
            cy: 1570,
            color: '#5c8c72',
            tags: ['sentinel','defense','elemental'],
            passives: [
                { name: 'Proteção', desc: '+5% Resistências.', effect: { allResistancePct: 5 }, icon: '✥' },
                { name: 'Armadura Rúnica', desc: '+8% Armadura e +4% Resistências.', effect: { armourPct: 8, allResistancePct: 4 }, icon: '⬢' },
                { name: 'Pele Elemental', desc: '+6% Resistências e +2% Vida Máxima.', effect: { allResistancePct: 6, lifePct: 2 }, icon: '✥' },
                { name: 'Bastião Elemental', desc: '+12% Resistências, +10% Armadura e +3% Vida.', effect: { allResistancePct: 12, armourPct: 10, lifePct: 3 }, icon: '✥', notable: true },
                { name: 'Defesa da Forja', desc: '+6% Resistências e +5% Dano Elemental.', effect: { allResistancePct: 6, elementalDamagePct: 5 }, icon: '✦' },
                { name: 'Corpo Rúnico', desc: '+3% Vida e +5% Dano Elemental.', effect: { lifePct: 3, elementalDamagePct: 5 }, icon: '♥' }
            ],
            mastery: {
                name: 'Mastery de Bastião',
                desc: 'Misture defesa e rota rúnica.',
                icon: '✥',
                options: [
                    { name: 'Muralha Elemental', desc: '+12% Resistências.', effect: { allResistancePct: 12 } },
                    { name: 'Bastião Vivo', desc: '+6% Vida Máxima e +6% Resistências.', effect: { lifePct: 6, allResistancePct: 6 } },
                    { name: 'Defesa Rúnica', desc: '+8% Resistências e +10% Dano Elemental.', effect: { allResistancePct: 8, elementalDamagePct: 10 } }
                ]
            }
        });

        // ============================================================
        // 3) PONTES CURTAS ENTRE ARQUÉTIPOS
        // ============================================================
        const addBridge = (
            id: string,
            fromId: string,
            toId: string,
            count: number,
            passives: Array<{ name: string; desc: string; effect: Effect; tags: string[]; icon?: string }>
        ) => {
            const from = fromId === 'center' ? { x: CENTER_X, y: CENTER_Y } : byId[fromId];
            const to = toId === 'center' ? { x: CENTER_X, y: CENTER_Y } : byId[toId];
            if (!from || !to || count <= 0) return;

            let previous = fromId;
            for (let i = 0; i < count; i++) {
                const t = (i + 1) / (count + 1);
                const curve = Math.sin(Math.PI * t) * 18;
                const dx = to.x - from.x;
                const dy = to.y - from.y;
                const len = Math.hypot(dx, dy) || 1;
                const nx = -dy / len;
                const ny = dx / len;
                const p = {
                    x: from.x + dx * t + nx * curve,
                    y: from.y + dy * t + ny * curve
                };
                const source = passives[i % passives.length];
                const nodeId = `${id}_${i}`;
                addNode({
                    id: nodeId,
                    name: source.name,
                    desc: source.desc,
                    x: p.x,
                    y: p.y,
                    type: 'minor',
                    cluster: id,
                    tags: [...source.tags, 'bridge'],
                    cost: 1,
                    icon: source.icon || iconFromEffect(source.effect),
                    effect: { ...source.effect }
                });
                connect(previous, nodeId);
                previous = nodeId;
            }
            connect(previous, toId);
        };

        // Centro -> regiões: rotas curtas e híbridas.
        addBridge('path_core_axe', 'core_outer_9', clusters.physical_hybrid.ringIds[2], 2, [
            { name: 'Força Marcial', desc: '+8 STR e +4% Dano Físico.', effect: { strength: 8, physicalDamagePct: 4 }, tags: ['attack','physical'] },
            { name: 'Corpo Ofensivo', desc: '+3% Vida e +4% Dano Físico.', effect: { lifePct: 3, physicalDamagePct: 4 }, tags: ['attack','life'] }
        ]);

        addBridge('path_physical_axe', clusters.physical_hybrid.ringIds[5], clusters.axe_impact.ringIds[4], 2, [
            { name: 'Treino de Machado', desc: '+5% Dano com Machado e +4% Dano Físico.', effect: { axeDamagePct: 5, physicalDamagePct: 4 }, tags: ['axe','attack'] },
            { name: 'Impacto Brutal', desc: '+6% Dano de Postura e +4% Dano Físico.', effect: { postureDamagePct: 6, physicalDamagePct: 4 }, tags: ['axe','physical'] }
        ]);

        addBridge('path_axe_bleed', clusters.axe_impact.ringIds[1], clusters.bleed.ringIds[5], 2, [
            { name: 'Lâmina Serrilhada', desc: '+5% Machado e +7% Sangramento.', effect: { axeDamagePct: 5, bleedDamagePct: 7 }, tags: ['axe','bleed'] },
            { name: 'Corte Pesado', desc: '+6% Físico e +6% Sangramento.', effect: { physicalDamagePct: 6, bleedDamagePct: 6 }, tags: ['physical','bleed'] }
        ]);

        addBridge('path_core_life', 'core_outer_1', clusters.blood_life.ringIds[0], 2, [
            { name: 'Força Vital', desc: '+8 STR e +3% Vida Máxima.', effect: { strength: 8, lifePct: 3 }, tags: ['life'] },
            { name: 'Sangue Marcial', desc: '+3% Vida e +4% Dano Físico.', effect: { lifePct: 3, physicalDamagePct: 4 }, tags: ['life','attack'] }
        ]);

        addBridge('path_life_recovery', clusters.blood_life.ringIds[4], clusters.blood_recovery.ringIds[0], 2, [
            { name: 'Recuperação de Guerra', desc: '+0.4% Regen e +2% Vida.', effect: { lifeRegenPct: 0.4, lifePct: 2 }, tags: ['life','defense'] },
            { name: 'Carne Resistente', desc: '+3% Vida e +6% Armadura.', effect: { lifePct: 3, armourPct: 6 }, tags: ['life','defense'] }
        ]);

        addBridge('path_bleed_life', clusters.bleed.ringIds[2], clusters.blood_life.ringIds[5], 3, [
            { name: 'Sangue e Carne', desc: '+3% Vida e +6% Sangramento.', effect: { lifePct: 3, bleedDamagePct: 6 }, tags: ['life','bleed'] },
            { name: 'Corpo Ferido', desc: '+4% Vida e +4% Dano Físico.', effect: { lifePct: 4, physicalDamagePct: 4 }, tags: ['life','physical'] }
        ]);

        addBridge('path_core_spear', 'core_outer_3', clusters.crit_hybrid.ringIds[1], 2, [
            { name: 'Técnica Marcial', desc: '+8 DEX e +4% Chance de Crítico.', effect: { dexterity: 8, criticalChancePct: 4 }, tags: ['spear','crit'] },
            { name: 'Ataque Fluido', desc: '+4% Velocidade de Ataque e +4% Dano com Armas.', effect: { attackSpeedPct: 4, weaponDamagePct: 4 }, tags: ['attack','spear'] }
        ]);

        addBridge('path_crit_spear', clusters.crit_hybrid.ringIds[4], clusters.spear_precision.ringIds[0], 2, [
            { name: 'Precisão do Lanceiro', desc: '+5% Lança e +4% Crítico.', effect: { spearDamagePct: 5, criticalChancePct: 4 }, tags: ['spear','crit'] },
            { name: 'Ponta Rápida', desc: '+4% Ataque e +5% Lança.', effect: { attackSpeedPct: 4, spearDamagePct: 5 }, tags: ['spear','attack'] }
        ]);

        addBridge('path_spear_mobility', clusters.spear_precision.ringIds[4], clusters.spear_mobility.ringIds[0], 2, [
            { name: 'Passo Perfurante', desc: '+3% Movimento e +5% Penetração.', effect: { movementSpeedPct: 3, armourPenPct: 5 }, tags: ['spear','mobility'] },
            { name: 'Caçador', desc: '+3% Movimento e +4% Lança.', effect: { movementSpeedPct: 3, spearDamagePct: 4 }, tags: ['spear','mobility'] }
        ]);

        addBridge('path_life_spear', clusters.blood_recovery.ringIds[3], clusters.spear_precision.ringIds[5], 3, [
            { name: 'Vitalidade Ágil', desc: '+3% Vida e +6 DEX.', effect: { lifePct: 3, dexterity: 6 }, tags: ['life','spear'] },
            { name: 'Corpo Ágil', desc: '+2% Vida e +3% Ataque.', effect: { lifePct: 2, attackSpeedPct: 3 }, tags: ['life','spear'] }
        ]);

        addBridge('path_core_runic', 'core_outer_4', clusters.runic_hybrid.ringIds[0], 2, [
            { name: 'Disciplina Rúnica', desc: '+6 INT e +5% Elemental.', effect: { intelligence: 6, elementalDamagePct: 5 }, tags: ['runic','elemental'] },
            { name: 'Arma Mística', desc: '+4% Armas e +4% Elemental.', effect: { weaponDamagePct: 4, elementalDamagePct: 4 }, tags: ['runic','attack'] }
        ]);

        addBridge('path_runic_fire', clusters.runic_hybrid.ringIds[4], clusters.runic_fire.ringIds[0], 2, [
            { name: 'Runa de Brasa', desc: '+7% Fogo e +4% Elemental.', effect: { fireDamagePct: 7, elementalDamagePct: 4 }, tags: ['runic','fire'] },
            { name: 'Fogo Marcial', desc: '+5% Fogo e +3% Dano com Armas.', effect: { fireDamagePct: 5, weaponDamagePct: 3 }, tags: ['runic','fire'] }
        ]);

        addBridge('path_runic_lightning', clusters.runic_hybrid.ringIds[3], clusters.runic_lightning.ringIds[0], 2, [
            { name: 'Runa de Tempestade', desc: '+7% Raio e +4% Elemental.', effect: { lightningDamagePct: 7, elementalDamagePct: 4 }, tags: ['runic','lightning'] },
            { name: 'Raio Marcial', desc: '+5% Raio e +3% Velocidade de Ataque.', effect: { lightningDamagePct: 5, attackSpeedPct: 3 }, tags: ['runic','lightning'] }
        ]);

        addBridge('path_spear_runic', clusters.spear_mobility.ringIds[3], clusters.runic_lightning.ringIds[5], 3, [
            { name: 'Lança Condutora', desc: '+5% Lança e +5% Raio.', effect: { spearDamagePct: 5, lightningDamagePct: 5 }, tags: ['spear','runic','lightning'] },
            { name: 'Técnica Rúnica', desc: '+6 DEX, +6 INT e +3% Elemental.', effect: { dexterity: 6, intelligence: 6, elementalDamagePct: 3 }, tags: ['spear','runic'] }
        ]);

        addBridge('path_core_sentinel', 'core_outer_7', clusters.sentinel_resist.ringIds[1], 2, [
            { name: 'Guarda de Guerra', desc: '+8% Armadura e +3% Dano Físico.', effect: { armourPct: 8, physicalDamagePct: 3 }, tags: ['sentinel','defense','attack'] },
            { name: 'Corpo Defensivo', desc: '+3% Vida e +6% Armadura.', effect: { lifePct: 3, armourPct: 6 }, tags: ['sentinel','life'] }
        ]);

        addBridge('path_sentinel_armour', clusters.sentinel_resist.ringIds[4], clusters.sentinel_armour.ringIds[1], 2, [
            { name: 'Aço Elemental', desc: '+7% Armadura e +4% Resistências.', effect: { armourPct: 7, allResistancePct: 4 }, tags: ['sentinel','defense'] },
            { name: 'Fortitude', desc: '+8 STR e +6% Armadura.', effect: { strength: 8, armourPct: 6 }, tags: ['sentinel','defense'] }
        ]);

        addBridge('path_sentinel_guard', clusters.sentinel_armour.ringIds[4], clusters.sentinel_guard.ringIds[0], 2, [
            { name: 'Interposição', desc: '+8% Armadura e +2% Vida.', effect: { armourPct: 8, lifePct: 2 }, tags: ['sentinel','life'] },
            { name: 'Muralha', desc: '+10% Armadura.', effect: { armourPct: 10 }, tags: ['sentinel','defense'] }
        ]);

        addBridge('path_axe_sentinel', clusters.physical_hybrid.ringIds[0], clusters.sentinel_guard.ringIds[4], 3, [
            { name: 'Aço Ofensivo', desc: '+6% Armadura e +4% Dano Físico.', effect: { armourPct: 6, physicalDamagePct: 4 }, tags: ['attack','defense'] },
            { name: 'Força Blindada', desc: '+8 STR, +5% Armadura e +3% Armas.', effect: { strength: 8, armourPct: 5, weaponDamagePct: 3 }, tags: ['attack','sentinel'] }
        ]);

        addBridge('path_sentinel_runic', clusters.sentinel_resist.ringIds[3], clusters.runic_fire.ringIds[5], 3, [
            { name: 'Aço Rúnico', desc: '+6% Armadura e +5% Elemental.', effect: { armourPct: 6, elementalDamagePct: 5 }, tags: ['sentinel','runic'] },
            { name: 'Defesa da Forja', desc: '+4% Resistências e +5% Elemental.', effect: { allResistancePct: 4, elementalDamagePct: 5 }, tags: ['sentinel','runic'] }
        ]);

        // Pontes transversais: fazem a árvore se comportar como uma teia, e não
        // como vários galhos isolados. São rotas opcionais para builds híbridas.
        addBridge('path_physical_life', clusters.physical_hybrid.ringIds[1], clusters.blood_life.ringIds[4], 2, [
            { name: 'Potência Vital', desc: '+3% Vida e +5% Dano Físico.', effect: { lifePct: 3, physicalDamagePct: 5 }, tags: ['life','physical'] },
            { name: 'Veterano Implacável', desc: '+8 STR, +2% Vida e +4% Dano com Armas.', effect: { strength: 8, lifePct: 2, weaponDamagePct: 4 }, tags: ['life','attack'] }
        ]);

        addBridge('path_physical_sentinel', clusters.physical_hybrid.ringIds[3], clusters.sentinel_resist.ringIds[0], 2, [
            { name: 'Aço de Batalha', desc: '+8% Armadura e +4% Dano Físico.', effect: { armourPct: 8, physicalDamagePct: 4 }, tags: ['physical','sentinel'] },
            { name: 'Linha de Frente', desc: '+3% Vida e +5% Armadura.', effect: { lifePct: 3, armourPct: 5 }, tags: ['life','sentinel'] }
        ]);

        addBridge('path_recovery_crit', clusters.blood_recovery.ringIds[4], clusters.crit_hybrid.ringIds[0], 2, [
            { name: 'Fôlego Preciso', desc: '+2% Vida e +4% Chance de Crítico.', effect: { lifePct: 2, criticalChancePct: 4 }, tags: ['life','crit'] },
            { name: 'Ritmo Resiliente', desc: '+3% Ataque e +0.3% Regeneração.', effect: { attackSpeedPct: 3, lifeRegenPct: 0.3 }, tags: ['life','attack'] }
        ]);

        addBridge('path_crit_runic', clusters.crit_hybrid.ringIds[3], clusters.runic_hybrid.ringIds[1], 2, [
            { name: 'Precisão Rúnica', desc: '+5% Crítico e +4% Dano Elemental.', effect: { criticalChancePct: 5, elementalDamagePct: 4 }, tags: ['crit','runic'] },
            { name: 'Golpe Imbuído', desc: '+4% Armas e +5% Elemental.', effect: { weaponDamagePct: 4, elementalDamagePct: 5 }, tags: ['attack','runic'] }
        ]);

        addBridge('path_runic_sentinel_inner', clusters.runic_hybrid.ringIds[5], clusters.sentinel_resist.ringIds[5], 2, [
            { name: 'Forja Defensiva', desc: '+5% Elemental e +6% Armadura.', effect: { elementalDamagePct: 5, armourPct: 6 }, tags: ['runic','sentinel'] },
            { name: 'Runa de Proteção', desc: '+5% Resistências e +3% Dano Elemental.', effect: { allResistancePct: 5, elementalDamagePct: 3 }, tags: ['runic','sentinel'] }
        ]);

        addBridge('path_fire_armour', clusters.runic_fire.ringIds[4], clusters.sentinel_armour.ringIds[2], 2, [
            { name: 'Aço Temperado', desc: '+7% Armadura e +5% Dano de Fogo.', effect: { armourPct: 7, fireDamagePct: 5 }, tags: ['runic','sentinel','fire'] },
            { name: 'Forja Viva', desc: '+2% Vida, +4% Resistências e +4% Fogo.', effect: { lifePct: 2, allResistancePct: 4, fireDamagePct: 4 }, tags: ['runic','sentinel','fire'] }
        ]);

        addBridge('path_bleed_physical', clusters.bleed.ringIds[4], clusters.physical_hybrid.ringIds[2], 1, [
            { name: 'Carne Rasgada', desc: '+5% Físico e +7% Sangramento.', effect: { physicalDamagePct: 5, bleedDamagePct: 7 }, tags: ['physical','bleed'] }
        ]);

        addBridge('path_life_crit', clusters.blood_life.ringIds[3], clusters.crit_hybrid.ringIds[5], 2, [
            { name: 'Instinto Predador', desc: '+3% Vida e +4% Chance de Crítico.', effect: { lifePct: 3, criticalChancePct: 4 }, tags: ['life','crit'] },
            { name: 'Sangue Acelerado', desc: '+2% Vida e +4% Velocidade de Ataque.', effect: { lifePct: 2, attackSpeedPct: 4 }, tags: ['life','attack'] }
        ]);

        // ============================================================
        // 4) KEYSTONES — mudanças reais de regra / risco x recompensa
        // ============================================================
        const addKeystone = (
            id: string,
            name: string,
            desc: string,
            x: number,
            y: number,
            icon: string,
            colorTag: string,
            effect: Effect,
            specialRules: string[],
            connectTo: string
        ) => {
            addNode({
                id,
                name,
                desc,
                x,
                y,
                type: 'keystone',
                cluster: `keystone_${colorTag}`,
                tags: ['keystone', colorTag],
                cost: 1,
                icon,
                effect,
                specialRules
            });
            connect(id, connectTo);
        };

        addKeystone(
            'keystone_colossus',
            'Coração do Colosso',
            '+20% Vida Máxima. Cada 100 de Vida Máxima concede +1% Dano de Ataque. Você não pode usar Escudos e sofre -30% Armadura de equipamentos.',
            1880,
            225,
            '♥',
            'life',
            { lifePct: 20, armourPct: -30, attackDamagePer100MaxLifePct: 1 },
            ['Não pode equipar Escudo.', 'Cada 100 de Vida Máxima: +1% Dano de Ataque.', '-30% Armadura proveniente de equipamentos.'],
            clusters.blood_life.ringIds[2]
        );

        addKeystone(
            'keystone_irrevocable',
            'Golpe Irrevogável',
            '+60% Dano com Machado, porém -25% Velocidade de Ataque.',
            610,
            330,
            '🪓',
            'axe',
            { axeDamagePct: 60, attackSpeedPct: -25 },
            ['Especialização extrema em golpes lentos e pesados.'],
            clusters.axe_impact.ringIds[0]
        );

        addKeystone(
            'keystone_ranged_predator',
            'Predador à Distância',
            '+40% Chance de Crítico e +30% Multiplicador Crítico com Lança contra alvos distantes. Ataques corpo a corpo causam 25% menos dano.',
            3160,
            930,
            '🔱',
            'spear',
            { criticalChancePct: 40, criticalMultiplierPct: 30 },
            ['Contra inimigos muito próximos: 25% menos dano.', 'O bônus crítico máximo exige distância.'],
            clusters.spear_precision.ringIds[3]
        );

        addKeystone(
            'keystone_blade_dance',
            'Dança da Lâmina',
            'Acertos com Lança acumulam velocidade de ataque até 20 vezes. Receber dano remove todos os acúmulos.',
            3150,
            1530,
            '✦',
            'spear',
            { spearDamagePct: 10, movementSpeedPct: 4 },
            ['Cada acerto recente com Lança concede 1 acúmulo de Dança.', 'Máximo: 20 acúmulos.', 'Receber dano remove os acúmulos.'],
            clusters.spear_mobility.ringIds[3]
        );

        addKeystone(
            'keystone_avatar_forge',
            'Avatar da Forja',
            '50% do Dano Físico é convertido para Fogo e 50% para Raio. Você não causa Dano Físico. +15% Penetração Elemental.',
            3030,
            2200,
            '✦',
            'runic',
            { physicalToFirePct: 50, physicalToLightningPct: 50, elementalPenetrationPct: 15 },
            ['Você não causa Dano Físico não convertido.', 'Conversão total: 50% Fogo + 50% Raio.'],
            clusters.runic_lightning.ringIds[3]
        );

        addKeystone(
            'keystone_human_fortress',
            'Fortaleza Humana',
            '+40% Armadura e +15% Vida Máxima. -25% Velocidade de Movimento.',
            520,
            2160,
            '🛡',
            'sentinel',
            { armourPct: 40, lifePct: 15, movementSpeedPct: -25 },
            ['Especialização de tanque puro.', 'Investidas devem ter recarga maior quando o sistema de skills consumir esta regra.'],
            clusters.sentinel_armour.ringIds[3]
        );

        addKeystone(
            'keystone_flesh_before_steel',
            'Carne Antes do Aço',
            '+30% Vida Máxima e +1.5% Regeneração de Vida. -40% Armadura.',
            820,
            1260,
            '♥',
            'life',
            { lifePct: 30, lifeRegenPct: 1.5, armourPct: -40 },
            ['Troca mitigação por HP bruto e regeneração.'],
            clusters.sentinel_guard.ringIds[2]
        );

        addKeystone(
            'keystone_last_man',
            'Último Homem de Pé',
            'Enquanto abaixo de 35% da Vida, o Guerreiro entra em estado de Último Homem. Não pode recuperar acima de 80% da Vida enquanto a Keystone estiver ativa.',
            2360,
            260,
            '✹',
            'blood',
            { physicalDamagePct: 10, attackSpeedPct: 5 },
            ['Abaixo de 35% da Vida: bônus de dano, velocidade e redução de dano devem ser aplicados pelo combate.', 'Vida máxima recuperável limitada a 80% enquanto ativa.'],
            clusters.blood_recovery.ringIds[2]
        );

        // ============================================================
        // 4.5) LAYOUT EM TEIA — inspirado no princípio visual do PoE
        // ============================================================
        // A árvore continua sendo 100% do Guerreiro e mantém os mesmos IDs,
        // efeitos, masteries e keystones. Aqui mudamos somente a geometria:
        // rodas menores, anéis próximos e pontes curtas entre arquétipos.
        // Isso evita as antigas "ilhas" e os grandes vazios sem finalidade.
        const clusterLayout: Record<string, { cx: number; cy: number; radius: number }> = {
            // Anel interno: temas híbridos que conversam diretamente com o centro.
            physical_hybrid: { cx: 1280, cy: 1040, radius: 96 },
            blood_life: { cx: 1680, cy: 715, radius: 98 },
            blood_recovery: { cx: 2070, cy: 860, radius: 96 },
            crit_hybrid: { cx: 2170, cy: 1210, radius: 96 },
            runic_hybrid: { cx: 2050, cy: 1570, radius: 98 },
            sentinel_resist: { cx: 1360, cy: 1580, radius: 98 },

            // Anel externo: especializações fortes, ainda próximas o bastante
            // para formar uma única malha visual.
            axe_impact: { cx: 955, cy: 800, radius: 100 },
            bleed: { cx: 1240, cy: 555, radius: 98 },
            spear_precision: { cx: 2490, cy: 990, radius: 100 },
            spear_mobility: { cx: 2500, cy: 1435, radius: 100 },
            runic_fire: { cx: 1920, cy: 1900, radius: 100 },
            runic_lightning: { cx: 2380, cy: 1850, radius: 100 },
            sentinel_armour: { cx: 1110, cy: 1890, radius: 100 },
            sentinel_guard: { cx: 820, cy: 1470, radius: 100 }
        };

        // Núcleo menor e legível. As duas coroas continuam preservando a
        // essência de "fundamentos do guerreiro", porém sem ocupar metade do mapa.
        coreInner.forEach((spec) => {
            const node = byId[spec.id];
            if (!node) return;
            const p = polar(CENTER_X, CENTER_Y, 118, spec.angle);
            node.x = p.x;
            node.y = p.y;
        });

        coreOuter.forEach((spec) => {
            const node = byId[spec.id];
            if (!node) return;
            const p = polar(CENTER_X, CENTER_Y, 238, spec.angle);
            node.x = p.x;
            node.y = p.y;
        });

        // Reposiciona cada wheel preservando a ordem angular de suas passivas.
        Object.entries(clusters).forEach(([clusterId, cluster]) => {
            const layout = clusterLayout[clusterId];
            if (!layout) return;

            const oldCx = cluster.spec.cx;
            const oldCy = cluster.spec.cy;
            cluster.ringIds.forEach((id) => {
                const node = byId[id];
                if (!node) return;
                const angle = Math.atan2(node.y - oldCy, node.x - oldCx);
                node.x = layout.cx + Math.cos(angle) * layout.radius;
                node.y = layout.cy + Math.sin(angle) * layout.radius;
            });

            const mastery = byId[cluster.masteryId];
            if (mastery) {
                mastery.x = layout.cx;
                mastery.y = layout.cy;
            }

            cluster.spec.cx = layout.cx;
            cluster.spec.cy = layout.cy;
            cluster.spec.radius = layout.radius;
        });

        // Depois de mover os wheels, recalculamos todas as pontes para que os
        // pequenos nodes preencham o espaço entre regiões em vez de ficarem
        // presos às coordenadas antigas.
        const bridgeClusterIds = Array.from(new Set(
            nodes.filter((node) => node.cluster.startsWith('path_')).map((node) => node.cluster)
        ));

        bridgeClusterIds.forEach((clusterId) => {
            const bridgeNodes = nodes
                .filter((node) => node.cluster === clusterId)
                .sort((a, b) => Number(a.id.split('_').pop() || 0) - Number(b.id.split('_').pop() || 0));
            if (!bridgeNodes.length) return;

            const bridgeIds = new Set(bridgeNodes.map((node) => node.id));
            const firstExternal = Array.from(adjacency[bridgeNodes[0].id] || []).find((id) => !bridgeIds.has(id));
            const lastExternal = Array.from(adjacency[bridgeNodes[bridgeNodes.length - 1].id] || []).find((id) => !bridgeIds.has(id));
            if (!firstExternal || !lastExternal) return;

            const from = firstExternal === 'center' ? { x: CENTER_X, y: CENTER_Y } : byId[firstExternal];
            const to = lastExternal === 'center' ? { x: CENTER_X, y: CENTER_Y } : byId[lastExternal];
            if (!from || !to) return;

            const dx = to.x - from.x;
            const dy = to.y - from.y;
            const len = Math.hypot(dx, dy) || 1;
            const nx = -dy / len;
            const ny = dx / len;
            const hash = clusterId.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
            const bend = (hash % 2 === 0 ? 1 : -1) * Math.min(42, len * 0.08);

            bridgeNodes.forEach((node, index) => {
                const t = (index + 1) / (bridgeNodes.length + 1);
                const arc = Math.sin(Math.PI * t) * bend;
                node.x = from.x + dx * t + nx * arc;
                node.y = from.y + dy * t + ny * arc;
            });
        });

        // Keystones ficam como satélites dos wheels aos quais pertencem. Isso
        // mantém os grandes pontos de decisão na periferia sem criar corredores
        // vazios gigantes só para alcançá-los.
        nodes.filter((node) => node.type === 'keystone').forEach((node) => {
            const neighbourId = Array.from(adjacency[node.id] || [])[0];
            const neighbour = neighbourId === 'center' ? { x: CENTER_X, y: CENTER_Y } : byId[neighbourId];
            if (!neighbour) return;
            const dx = neighbour.x - CENTER_X;
            const dy = neighbour.y - CENTER_Y;
            const len = Math.hypot(dx, dy) || 1;
            const distance = 205;
            node.x = neighbour.x + dx / len * distance;
            node.y = neighbour.y + dy / len * distance;
        });

        // ============================================================
        // 5) ESTADO, PONTOS E EFEITOS
        // ============================================================
        // Remove IDs antigos ou inválidos que possam existir no save.
        Object.keys(state).forEach((id) => {
            if (id !== 'center' && !byId[id]) delete state[id];
        });
        Object.keys(masterySelections).forEach((id) => {
            const node = byId[id];
            if (!node || node.type !== 'mastery') delete masterySelections[id];
        });

        const getClusterSpent = (clusterId: string) =>
            nodes.filter((node) => node.cluster === clusterId && node.type !== 'mastery' && !!state[node.id]).length;

        const getSpentPoints = () => {
            const normalPoints = nodes.reduce((sum, node) => sum + (state[node.id] ? node.cost : 0), 0);
            const masteryPoints = Object.keys(masterySelections).reduce((sum, masteryId) => {
                const node = byId[masteryId];
                return sum + (node && node.type === 'mastery' ? node.cost : 0);
            }, 0);
            return normalPoints + masteryPoints;
        };

        const getAvailablePoints = () => Math.max(0, totalPoints - getSpentPoints());

        const save = () => {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                unlocked: nodes.filter((node) => !!state[node.id]).map((node) => node.id),
                masteries: masterySelections
            }));
        };

        const totals: Effect = {};

        const addEffect = (effect?: Effect) => {
            if (!effect) return;
            (Object.keys(effect) as (keyof Effect)[]).forEach((key) => {
                totals[key] = Number(totals[key] || 0) + Number(effect[key] || 0);
            });
        };

        const hasKeystone = (id: string) => !!state[id];

        const recalcEffects = () => {
            (Object.keys(totals) as (keyof Effect)[]).forEach((key) => delete totals[key]);

            nodes.forEach((node) => {
                if (state[node.id]) addEffect(node.effect);

                if (node.type === 'mastery' && masterySelections[node.id] !== undefined && node.masteryOptions) {
                    const option = node.masteryOptions[masterySelections[node.id]];
                    if (option) addEffect(option.effect);
                }
            });

            // Ponte já existente para o combate atual.
            this.talentPhysicalDamageMultiplier = Math.max(0, 1 + Number(totals.physicalDamagePct || 0) / 100);
            this.talentAttackSpeedMultiplier = Math.max(0.1, 1 + Number(totals.attackSpeedPct || 0) / 100);
            this.talentCriticalChanceBonus = Number(totals.criticalChancePct || 0);

            // Novos valores públicos para os próximos sistemas de combate/equipamento.
            this.talentMaxLifePct = Number(totals.lifePct || 0);
            this.talentArmourPct = Number(totals.armourPct || 0);
            this.talentAllResistancePct = Number(totals.allResistancePct || 0);
            this.talentAxeDamagePct = Number(totals.axeDamagePct || 0);
            this.talentSpearDamagePct = Number(totals.spearDamagePct || 0);
            this.talentBleedDamagePct = Number(totals.bleedDamagePct || 0);
            this.talentMovementSpeedPct = Number(totals.movementSpeedPct || 0);
            this.talentPhysicalToFirePct = Math.min(100, Number(totals.physicalToFirePct || 0));
            this.talentPhysicalToLightningPct = Math.min(100, Number(totals.physicalToLightningPct || 0));
            this.talentElementalPenetrationPct = Number(totals.elementalPenetrationPct || 0);
            this.talentAttackDamagePer100MaxLifePct = Number(totals.attackDamagePer100MaxLifePct || 0);
            this.talentCannotUseShield = hasKeystone('keystone_colossus');
        };

        recalcEffects();

        const isMasterySelected = (node: TalentNode) =>
            node.type === 'mastery' && masterySelections[node.id] !== undefined;

        const isActive = (id: string) => id === 'center' || !!state[id];

        const canBuyNode = (node: TalentNode) => {
            if (node.type === 'mastery') {
                const alreadyChosen = masterySelections[node.id] !== undefined;
                if (alreadyChosen) return true;
                if (getAvailablePoints() < node.cost) return false;
                if (getClusterSpent(node.cluster) < Number(node.masteryRequired || 4)) return false;
                if (node.masteryNotableId && !state[node.masteryNotableId]) return false;
                return true;
            }

            if (state[node.id]) return false;
            if (getAvailablePoints() < node.cost) return false;

            const neighbours = adjacency[node.id];
            if (!neighbours || neighbours.size === 0) return false;
            return Array.from(neighbours).some((id) => isActive(id));
        };

        // ============================================================
        // 6) INTERFACE — canvas em teia, sem labels de regiões na borda
        // ============================================================
        const modal = document.createElement('div');
        modal.id = 'talent-tree-modal';
        Object.assign(modal.style, {
            position: 'fixed',
            inset: '0',
            width: '100vw',
            height: '100vh',
            zIndex: '999999',
            background: '#030509',
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'stretch',
            justifyContent: 'flex-start',
            overflow: 'hidden',
            fontFamily: 'Georgia, Arial, sans-serif',
            color: '#e6dfcf'
        });

        const sidebar = document.createElement('div');
        Object.assign(sidebar.style, {
            width: '300px',
            flexShrink: '0',
            height: '100vh',
            padding: '18px',
            boxSizing: 'border-box',
            borderRight: '1px solid #3e3424',
            background: 'linear-gradient(180deg,#0b0d11,#07080b)',
            overflowY: 'auto',
            zIndex: '4'
        });

        const stage = document.createElement('div');
        Object.assign(stage.style, {
            position: 'relative',
            flex: '1 1 0',
            minWidth: '0',
            height: '100vh',
            overflow: 'hidden',
            background: '#030509'
        });

        const tooltip = document.createElement('div');
        Object.assign(tooltip.style, {
            position: 'absolute',
            zIndex: '90',
            minWidth: '245px',
            maxWidth: '360px',
            padding: '12px',
            border: '1px solid #665135',
            background: 'rgba(8,9,12,.985)',
            borderRadius: '7px',
            color: '#ddd3c2',
            fontSize: '12px',
            lineHeight: '1.45',
            display: 'none',
            pointerEvents: 'none',
            boxShadow: '0 12px 34px rgba(0,0,0,.72)'
        });
        stage.appendChild(tooltip);

        const masteryPanel = document.createElement('div');
        Object.assign(masteryPanel.style, {
            position: 'absolute',
            right: '18px',
            top: '72px',
            width: '310px',
            zIndex: '95',
            padding: '14px',
            border: '1px solid #665135',
            background: 'rgba(8,9,12,.985)',
            borderRadius: '8px',
            display: 'none',
            color: '#ded4c3',
            boxShadow: '0 12px 34px rgba(0,0,0,.72)'
        });
        stage.appendChild(masteryPanel);

        const title = document.createElement('div');
        Object.assign(title.style, {
            position: 'absolute',
            top: '17px',
            left: '22px',
            zIndex: '80',
            pointerEvents: 'none'
        });
        title.innerHTML = `
            <div style="font-size:22px;font-weight:900;color:#d9b368;letter-spacing:.8px;text-shadow:0 2px 8px #000;">ÁRVORE PASSIVA — GUERREIRO</div>
            <div style="font-size:10px;color:#8f816d;margin-top:3px;">wheel clusters • rotas híbridas • prévia do menor caminho</div>
        `;
        stage.appendChild(title);

        const close = document.createElement('button');
        close.innerText = '✕';
        Object.assign(close.style, {
            position: 'absolute',
            top: '14px',
            right: '14px',
            zIndex: '100',
            width: '42px',
            height: '42px',
            borderRadius: '7px',
            border: '1px solid #6a5837',
            background: '#111318',
            color: '#fff',
            fontSize: '20px',
            cursor: 'pointer'
        });
        stage.appendChild(close);

        const navControls = document.createElement('div');
        Object.assign(navControls.style, {
            position: 'absolute',
            right: '18px',
            bottom: '16px',
            zIndex: '85',
            display: 'flex',
            gap: '7px'
        });

        const makeNavButton = (label: string, titleText: string) => {
            const button = document.createElement('button');
            button.innerText = label;
            button.title = titleText;
            Object.assign(button.style, {
                width: '46px',
                height: '42px',
                borderRadius: '6px',
                border: '1px solid rgba(105,82,43,.72)',
                background: '#0d0f13',
                color: '#dfc48b',
                fontSize: '18px',
                cursor: 'pointer'
            });
            return button;
        };

        const fitBtn = makeNavButton('⌂', 'Mostrar árvore inteira');
        const recenterBtn = makeNavButton('◎', 'Centralizar no Guerreiro');
        const zoomOutBtn = makeNavButton('−', 'Diminuir zoom');
        const zoomInBtn = makeNavButton('+', 'Aumentar zoom');
        navControls.appendChild(fitBtn);
        navControls.appendChild(recenterBtn);
        navControls.appendChild(zoomOutBtn);
        navControls.appendChild(zoomInBtn);
        stage.appendChild(navControls);

        const clusterColor = (node: TalentNode) => {
            if (node.cluster === 'core') return '#c9a45e';
            if (clusters[node.cluster]) return clusters[node.cluster].spec.color;
            if (node.tags.includes('axe')) return '#b56b3e';
            if (node.tags.includes('spear')) return '#4c9294';
            if (node.tags.includes('runic')) return '#7b68ad';
            if (node.tags.includes('sentinel')) return '#6f8f54';
            if (node.tags.includes('life') || node.tags.includes('blood')) return '#b04a4a';
            if (node.tags.includes('crit')) return '#8a75c5';
            return '#b99a62';
        };

        const formatBonus = (value: number, suffix = '') => `${value >= 0 ? '+' : ''}${Number(value.toFixed(1))}${suffix}`;
        let activeFilter = 'Todos';

        const matchesFilter = (node: TalentNode) => {
            if (activeFilter === 'Todos') return true;
            if (activeFilter === 'Vida') return node.tags.includes('life') || node.tags.includes('blood');
            if (activeFilter === 'Ataque') return node.tags.includes('attack') || node.tags.includes('physical') || node.tags.includes('crit');
            if (activeFilter === 'Machado') return node.tags.includes('axe') || node.tags.includes('bleed');
            if (activeFilter === 'Lança') return node.tags.includes('spear') || node.tags.includes('mobility');
            if (activeFilter === 'Rúnico') return node.tags.includes('runic') || node.tags.includes('elemental') || node.tags.includes('fire') || node.tags.includes('lightning');
            if (activeFilter === 'Sentinela') return node.tags.includes('sentinel') || node.tags.includes('defense');
            if (activeFilter === 'Keystones') return node.type === 'keystone';
            return true;
        };

        const renderMasteryPanel = (node: TalentNode) => {
            const alreadyChosen = masterySelections[node.id] !== undefined;
            if (!alreadyChosen && !canBuyNode(node)) return;

            masteryPanel.style.display = 'block';
            masteryPanel.innerHTML = `
                <div style="font-size:16px;font-weight:900;color:#cda7ff;margin-bottom:4px;">${node.name}</div>
                <div style="font-size:11px;color:#9d92aa;margin-bottom:12px;line-height:1.45;">Mastery não faz parte da estrada. Escolha um efeito depois de cumprir o Notável e o requisito do wheel.</div>
                <div id="mastery-options"></div>
                <button id="mastery-close" style="margin-top:10px;width:100%;padding:8px;border:1px solid #4b4055;background:#15111b;color:#ddd;border-radius:5px;cursor:pointer;">FECHAR</button>
            `;

            const optionsContainer = masteryPanel.querySelector('#mastery-options') as HTMLDivElement | null;
            if (optionsContainer && node.masteryOptions) {
                node.masteryOptions.forEach((option, index) => {
                    const button = document.createElement('button');
                    const selected = masterySelections[node.id] === index;
                    button.innerHTML = `<b>${option.name}</b><br><span style="font-size:11px;">${option.desc}</span>`;
                    Object.assign(button.style, {
                        width: '100%',
                        textAlign: 'left',
                        marginBottom: '7px',
                        padding: '9px',
                        border: selected ? '1px solid #b58be9' : '1px solid #3f3548',
                        background: selected ? '#24172d' : '#111017',
                        color: '#ddd',
                        borderRadius: '5px',
                        cursor: 'pointer'
                    });
                    button.onclick = () => {
                        const hadSelection = masterySelections[node.id] !== undefined;
                        if (!hadSelection && getAvailablePoints() < node.cost) return;
                        masterySelections[node.id] = index;
                        save();
                        masteryPanel.style.display = 'none';
                        renderAll();
                    };
                    optionsContainer.appendChild(button);
                });
            }

            const masteryClose = masteryPanel.querySelector('#mastery-close') as HTMLButtonElement | null;
            if (masteryClose) masteryClose.onclick = () => masteryPanel.style.display = 'none';
        };

        let treeRenderer: TreeRenderer;

        const renderSidebar = () => {
            recalcEffects();
            const rows = ([
                ['STR', Number(totals.strength || 0), ''],
                ['DEX', Number(totals.dexterity || 0), ''],
                ['INT', Number(totals.intelligence || 0), ''],
                ['Vida', Number(totals.lifePct || 0), '%'],
                ['Vida flat', Number(totals.lifeFlat || 0), ''],
                ['Dano Físico', Number(totals.physicalDamagePct || 0), '%'],
                ['Dano Machado', Number(totals.axeDamagePct || 0), '%'],
                ['Dano Lança', Number(totals.spearDamagePct || 0), '%'],
                ['Sangramento', Number(totals.bleedDamagePct || 0), '%'],
                ['Vel. Ataque', Number(totals.attackSpeedPct || 0), '%'],
                ['Crítico', Number(totals.criticalChancePct || 0), '%'],
                ['Armadura', Number(totals.armourPct || 0), '%'],
                ['Resistências', Number(totals.allResistancePct || 0), '%'],
                ['Movimento', Number(totals.movementSpeedPct || 0), '%'],
                ['Fogo', Number(totals.fireDamagePct || 0), '%'],
                ['Raio', Number(totals.lightningDamagePct || 0), '%'],
                ['Elemental', Number(totals.elementalDamagePct || 0), '%']
            ] as Array<[string, number, string]>).filter((row) => row[1] !== 0);

            const activeKeystones = nodes.filter((node) => node.type === 'keystone' && state[node.id]);
            sidebar.innerHTML = `
                <div style="font-size:23px;font-weight:900;color:#d7ad58;margin-bottom:4px;text-shadow:0 2px 7px #000;">⚔ GUERREIRO</div>
                <div style="font-size:11px;color:#857865;margin-bottom:16px;line-height:1.45;">Uma única teia: wheels próximos, atalhos entre especializações e liberdade para misturar defesa, físico, crítico, armas e runas.</div>

                <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;">
                    <div style="padding:10px;border:1px solid #30291f;background:#0e1014;border-radius:6px;"><div style="font-size:10px;color:#8c8272;">NÍVEL</div><div style="font-size:19px;font-weight:800;">${rawLevel}</div></div>
                    <div style="padding:10px;border:1px solid #5b4728;background:#15110c;border-radius:6px;"><div style="font-size:10px;color:#a58c62;">PONTOS</div><div style="font-size:24px;font-weight:900;color:#f0c35e;">${getAvailablePoints()}</div></div>
                </div>
                <div style="font-size:10px;color:#837968;margin-bottom:12px;">Usados: ${getSpentPoints()} • Passivas: ${nodes.length} • Masteries: ${Object.keys(masterySelections).length}</div>

                <div style="display:flex;gap:10px;align-items:center;padding:8px 0 12px;border-bottom:1px solid #342c20;font-size:10px;color:#8f846f;">
                    <span style="color:#c6a15d;">● passiva</span><span style="color:#d9b25d;">✦ notável</span><span style="color:#b58be9;">◆ mastery</span>
                </div>

                <div style="padding-top:12px;font-size:13px;font-weight:900;color:#d5aa55;margin-bottom:9px;">BÔNUS ATIVOS</div>
                <div style="display:grid;grid-template-columns:1fr auto;gap:5px 10px;font-size:11px;">${rows.length ? rows.map((row) => `<span>${row[0]}</span><b style="color:${row[1] >= 0 ? '#77d486' : '#e27c70'};">${formatBonus(row[1], row[2])}</b>`).join('') : '<span style="grid-column:1/3;color:#776f62;">Nenhum talento aprendido ainda.</span>'}</div>

                <div style="border-top:1px solid #342c20;margin-top:14px;padding-top:12px;font-size:13px;font-weight:900;color:#d5aa55;">KEYSTONES ATIVAS</div>
                <div style="margin-top:7px;font-size:10px;color:#9f927f;line-height:1.45;">${activeKeystones.length ? activeKeystones.map((node) => `<div style="margin-bottom:5px;color:#e0a45a;">◆ ${node.name}</div>`).join('') : 'Nenhuma.'}</div>

                <div style="border-top:1px solid #342c20;margin-top:14px;padding-top:12px;font-size:13px;font-weight:900;color:#d5aa55;">FILTRO</div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:8px;">${['Todos','Vida','Ataque','Machado','Lança','Rúnico','Sentinela','Keystones'].map((filter) => `<button class="talent-filter" data-filter="${filter}" style="padding:6px;border-radius:5px;border:1px solid ${activeFilter === filter ? '#7b4930' : '#3c3428'};background:${activeFilter === filter ? '#2a140e' : '#111216'};color:${activeFilter === filter ? '#f1c47a' : '#b8aa91'};font-size:10px;cursor:pointer;">${filter}</button>`).join('')}</div>

                <button id="talent-reset-btn" style="width:100%;margin-top:17px;padding:10px;border-radius:6px;border:1px solid #7b382e;background:#24100d;color:#f0b2a5;font-weight:900;cursor:pointer;">REDEFINIR TALENTOS</button>
                <div style="font-size:10px;color:#716859;margin-top:10px;line-height:1.5;">Passe o mouse num node distante para ver a menor rota até ele. Arraste para mover; scroll para zoom; duplo clique recentraliza.</div>
            `;

            const resetBtn = sidebar.querySelector('#talent-reset-btn') as HTMLButtonElement | null;
            if (resetBtn) resetBtn.onclick = () => {
                Object.keys(state).forEach((key) => { if (key !== 'center') delete state[key]; });
                Object.keys(masterySelections).forEach((key) => delete masterySelections[key]);
                state.center = true;
                save();
                renderAll();
            };

            const filterButtons = Array.from(sidebar.querySelectorAll('.talent-filter')) as HTMLButtonElement[];
            filterButtons.forEach((button) => {
                button.onclick = () => {
                    activeFilter = button.dataset.filter || 'Todos';
                    renderAll();
                };
            });
        };

        const showTooltip = (visualNode: TalentVisualNode, clientX: number, clientY: number, previewPath: readonly string[] | null) => {
            const node = byId[visualNode.id];
            if (!node) return;
            const rect = stage.getBoundingClientRect();
            const neighbourNames = node.type === 'mastery' ? '' : Array.from(adjacency[node.id] || [])
                .filter((id) => id !== 'center')
                .map((id) => byId[id]?.name)
                .filter(Boolean)
                .slice(0, 4)
                .join(' • ');
            const routeNodes = previewPath?.filter((id) => id !== 'center' && !state[id]) || [];

            tooltip.style.display = 'block';
            tooltip.style.left = `${Math.min(rect.width - 375, Math.max(10, clientX - rect.left + 15))}px`;
            tooltip.style.top = `${Math.min(rect.height - 245, Math.max(10, clientY - rect.top + 15))}px`;
            tooltip.innerHTML = `
                <div style="font-size:15px;font-weight:900;color:${node.type === 'keystone' ? '#e5a053' : node.type === 'mastery' ? '#cda7ff' : '#f0c35e'};">${node.name}</div>
                <div style="font-size:9px;color:#8e8372;margin:2px 0 7px;text-transform:uppercase;letter-spacing:.8px;">${node.type}</div>
                <div>${node.desc}</div>
                ${node.specialRules?.length ? `<div style="margin-top:8px;border-top:1px solid #30271d;padding-top:7px;color:#d6a56d;">${node.specialRules.map((rule) => `• ${rule}`).join('<br>')}</div>` : ''}
                ${node.type === 'mastery' ? `<div style="margin-top:8px;color:#a999be;">Cluster: ${getClusterSpent(node.cluster)}/${node.masteryRequired || 4} • Notável: ${node.masteryNotableId && state[node.masteryNotableId] ? 'OK' : 'necessário'}</div>` : `<div style="margin-top:8px;color:#8e8372;">Custo: ${node.cost} ponto${node.cost === 1 ? '' : 's'}</div>`}
                ${routeNodes.length > 1 ? `<div style="margin-top:7px;color:#e1b75f;">Menor rota: ${routeNodes.length} pontos até este node.</div>` : ''}
                ${neighbourNames ? `<div style="margin-top:6px;color:#6f675d;font-size:10px;">Conecta com: ${neighbourNames}</div>` : ''}
            `;
        };

        treeRenderer = new TreeRenderer({
            host: stage,
            nodes,
            edges: edgePairs,
            clusters: Object.entries(clusters).map(([id, cluster]) => ({
                id,
                cx: cluster.spec.cx,
                cy: cluster.spec.cy,
                radius: Number(cluster.spec.radius || 100),
                color: cluster.spec.color
            })),
            center: { x: CENTER_X, y: CENTER_Y },
            getNodeState: (visualNode) => {
                const node = byId[visualNode.id];
                return {
                    active: !!state[visualNode.id],
                    available: node ? canBuyNode(node) : false,
                    masterySelected: node ? isMasterySelected(node) : false,
                    visible: node ? matchesFilter(node) : true
                };
            },
            isActiveId: (id) => isActive(id),
            clusterColor: (visualNode) => clusterColor(byId[visualNode.id] || visualNode as TalentNode),
            onNodeHover: showTooltip,
            onNodeLeave: () => { tooltip.style.display = 'none'; },
            onNodeClick: (visualNode) => {
                const node = byId[visualNode.id];
                if (!node) return;

                if (node.type === 'mastery') {
                    renderMasteryPanel(node);
                    return;
                }

                if (!canBuyNode(node)) return;
                state[node.id] = true;
                save();
                renderAll();
                console.info(`[Talento] ${node.name} desbloqueado.`);
            }
        });

        const renderAll = () => {
            recalcEffects();
            renderSidebar();
            treeRenderer.setFilter((visualNode) => {
                const node = byId[visualNode.id];
                return node ? matchesFilter(node) : true;
            });
            treeRenderer.refresh();
        };

        fitBtn.onclick = () => treeRenderer.fitToTree();
        recenterBtn.onclick = () => treeRenderer.centerOnWarrior();
        zoomOutBtn.onclick = () => treeRenderer.zoomBy(0.86);
        zoomInBtn.onclick = () => treeRenderer.zoomBy(1.16);

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') cleanup();
        };

        const cleanup = () => {
            window.removeEventListener('keydown', onKeyDown);
            treeRenderer.destroy();
            modal.remove();
        };

        close.onclick = cleanup;
        window.addEventListener('keydown', onKeyDown);

        modal.appendChild(sidebar);
        modal.appendChild(stage);
        document.body.appendChild(modal);
        renderAll();
        requestAnimationFrame(() => treeRenderer.fitToTree());
    }


    // Estes getters são a ponte para o sistema de combate.
    // Exemplo futuro: danoFinal = danoBase * game.getTalentPhysicalDamageMultiplier()
    public getTalentPhysicalDamageMultiplier(): number {
        return this.talentPhysicalDamageMultiplier;
    }

    public getTalentAttackSpeedMultiplier(): number {
        return this.talentAttackSpeedMultiplier;
    }

    public getTalentCriticalChanceBonus(): number {
        return this.talentCriticalChanceBonus;
    }

    public getTalentMaxLifeMultiplier(): number {
        return Math.max(0.1, 1 + this.talentMaxLifePct / 100);
    }

    public getTalentArmourMultiplier(): number {
        return Math.max(0, 1 + this.talentArmourPct / 100);
    }

    public getTalentAxeDamageMultiplier(): number {
        return Math.max(0, 1 + this.talentAxeDamagePct / 100);
    }

    public getTalentSpearDamageMultiplier(): number {
        return Math.max(0, 1 + this.talentSpearDamagePct / 100);
    }

    public getTalentBleedDamageMultiplier(): number {
        return Math.max(0, 1 + this.talentBleedDamagePct / 100);
    }

    public getTalentMovementSpeedMultiplier(): number {
        return Math.max(0.1, 1 + this.talentMovementSpeedPct / 100);
    }

    private updateAutoFarmButtonUI(): void {
        const btn = document.getElementById('btn-autofarm');
        if (!btn) return;

        if (this.autoFarmActive) {
            btn.innerText = '⚔️ AutoFarm: ON';
            btn.style.backgroundColor = '#2e7d32';
            btn.style.borderColor = '#4caf50';
        } else {
            btn.innerText = '⚔️ AutoFarm: OFF';
            btn.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            btn.style.borderColor = 'rgba(255, 255, 255, 0.15)';
        }
    }

    public start(): void {
        if (this.started) return;
        this.started = true;
        this.tick();
    }

    private tick(): void {
        if (this.started) requestAnimationFrame(() => this.tick());

        this.time = Date.now();

        if (this.throttle) {
            this.timeDiff = this.time - this.timeLast;
            if (this.timeDiff < this.targetFPS) return;
            this.timeLast = this.time - (this.timeDiff % this.targetFPS);
        }

        this.runAutoFarm();
        this.tacticalMinimap.update();

        this.updater.update();
        this.renderer.render();
    }

    private runAutoFarm(): void {
        this.smartAutoFarm.update(this.autoFarmActive);
    }

    public handleDisconnection(): void {
        if (!this.app.isMenuHidden()) return;
        location.reload();
    }

    private handlePlayerSync(): void {
        this.menu.synchronize();
        this.player.setSprite(this.sprites.get(this.player.getSpriteName()));
    }

    public postLoad(): void {
        this.entities.addEntity(this.player);

        this.player.setSprite(this.sprites.get(this.player.getSpriteName()));
        this.player.idle();

        if (this.storage) {
            this.player.setOrientation(this.storage.data.player.orientation);
            this.camera.setZoom(this.storage.data.player.zoom);

            this.renderer.resize();
            this.pointer.resize();
            this.bubble.resize();
        }

        this.camera.centreOn(this.player);

        this.player.handler = new Handler(this.player);

        this.socket.send(Packets.Ready, {
            regionsLoaded: this.map.regionsLoaded,
            userAgent: agent
        });

        if (this.storage.isNew()) this.menu.getWelcome().show();

        if (this.storage.data.new) {
            this.storage.data.new = false;
            this.storage.save();
        }

        if (this.map.hasCachedDate()) this.app.fadeMenu();

        this.menu.synchronize();

        this.forceRendering();
    }

    public findPath(
        character: Character,
        x: number,
        y: number,
        ignores: TileIgnore[] = [],
        cursor = ''
    ): number[][] {
        let path: number[][] = [];

        path = this.pathfinder.find(this.map.grid, character.gridX, character.gridY, x, y, ignores);

        if (path.length === 0) return path;

        if (cursor === 'fishing') {
            let last = path.at(-2)!;
            if (this.map.isColliding(last[0], last[1])) path.pop();
        }

        return path;
    }

    public findAdjacentTile(character: Character): void {
        if (!this.map.isColliding(character.gridX + 1, character.gridY))
            character.go(character.gridX + 1, character.gridY);
        else if (!this.map.isColliding(character.gridX - 1, character.gridY))
            character.go(character.gridX - 1, character.gridY);
        else if (!this.map.isColliding(character.gridX, character.gridY + 1))
            character.go(character.gridX, character.gridY + 1);
        else if (!this.map.isColliding(character.gridX, character.gridY - 1))
            character.go(character.gridX, character.gridY - 1);
    }

    public updateCameraBounds(): void {
        if (!this.zoning) return;

        let x = this.player.gridX - this.camera.gridX,
            y = this.player.gridY - this.camera.gridY;

        if (x === 0) this.zoning.setLeft();
        else if (x === this.camera.gridWidth - 2) this.zoning.setRight();
        else if (y === 0) this.zoning.setUp();
        else if (y === this.camera.gridHeight - 2) this.zoning.setDown();

        if (this.zoning.direction === null) return;

        this.camera.zone(this.zoning.getDirection());
        this.zoning.reset();
    }

    public respawn(): void {
        this.audio.playSound('revive');
        this.app.body.classList.remove('death');

        this.socket.send(Packets.Respawn, []);
    }

    public resize(): void {
        this.renderer.resize();
        this.pointer.resize();
        this.bubble.resize();
        this.menu.resize();
    }

    public getEntityAt(x: number, y: number): Entity | undefined {
        if (!this.entities) return;

        let entities = this.entities.grids.renderingGrid[y][x],
            keys = Object.keys(entities),
            index = keys.indexOf(this.player.instance);

        if (index !== -1) keys.splice(index, 1);

        return entities[keys[0]];
    }

    public searchForEntityAt(position: Position, radius = 3): Entity | undefined {
        let entities = this.entities.grids.getEntitiesAround(
                position.gridX!,
                position.gridY!,
                radius
            ),
            closest: Entity | undefined;

        for (let entity of entities) {
            if (entity.isProjectile() || entity.isPet() || this.isMainPlayer(entity.instance))
                continue;

            if (entity.isResource() && (entity as Resource).exhausted) continue;

            let boundingBox = entity.getBoundingBox(),
                centreX = boundingBox.x + boundingBox.width / 2,
                centreY = boundingBox.y + boundingBox.height / 2,
                distance = Utils.distance(position.x, position.y, centreX, centreY),
                threshold =
                    (entity.sprite.width < entity.sprite.height
                        ? entity.sprite.width
                        : entity.sprite.height) / 2;

            if (distance > threshold) continue;

            if (!closest || distance < closest.distance) {
                closest = entity;
                closest.distance = distance;
            }
        }

        return closest;
    }

    public teleport(character: Character, gridX: number, gridY: number): void {
        this.entities.unregisterPosition(character);

        character.setGridPosition(gridX, gridY);

        this.entities.registerPosition(character);

        character.frozen = false;
        character.teleporting = false;

        if (character.instance === this.player.instance) {
            character.clearHealthBar();

            this.player.moving = false;
            this.player.disableAction = false;
            this.camera.centreOn(this.player);
        }

        this.forceRendering();
    }

    public zoom(amount: number): void {
        this.camera.zoom(amount);
        this.storage.setZoom(this.camera.zoomFactor);
        this.pointer.resize();

        this.renderer.resize();
    }

    public isLowPowerMode(): boolean {
        return !this.camera.isCentered() && !this.renderer.animateTiles;
    }

    public isMainPlayer(instance: string): boolean {
        return this.player.instance === instance;
    }

    public forceRendering(): void {
        let count = 0,
            interval = setInterval(() => {
                this.renderer.forceRendering = true;
                count++;
                if (count > 10) clearInterval(interval);
            }, 100);
    }
}