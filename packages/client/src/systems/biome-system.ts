import type Game from '../game';

export type BiomeId = 'meadow' | 'ash' | 'frost' | 'desert' | 'crimson' | 'abyss';

const BIOMES: Record<BiomeId, { name: string; filter: string; tint: string; particle: string }> = {
    meadow: { name: 'Campos Verdes', filter: 'saturate(1.08) brightness(1.02)', tint: 'rgba(48,100,54,.05)', particle: '#b7d889' },
    ash: { name: 'Terras Cinzentas', filter: 'saturate(.72) sepia(.16) contrast(1.08)', tint: 'rgba(95,76,62,.11)', particle: '#b4aaa0' },
    frost: { name: 'Lagos Congelados', filter: 'saturate(.78) hue-rotate(165deg) brightness(1.06)', tint: 'rgba(80,150,190,.10)', particle: '#bfe8ff' },
    desert: { name: 'Deserto Antigo', filter: 'sepia(.28) saturate(1.15) brightness(1.03)', tint: 'rgba(177,113,49,.10)', particle: '#e6c17c' },
    crimson: { name: 'Campos Carmesim', filter: 'saturate(.95) hue-rotate(330deg) contrast(1.09)', tint: 'rgba(120,30,25,.10)', particle: '#d57a67' },
    abyss: { name: 'Abismo Submerso', filter: 'saturate(.85) hue-rotate(145deg) contrast(1.08)', tint: 'rgba(20,75,105,.15)', particle: '#78c7d8' }
};

/**
 * Lightweight biome presentation layer for the current Kaetram world.
 * It deliberately keeps map collision/layout intact while giving each warp region
 * a distinct atmosphere. This lets us iterate on biomes safely before replacing
 * map geometry/tilesets later.
 */
export default class BiomeSystem {
    private overlay?: HTMLDivElement;
    private label?: HTMLDivElement;
    private particles?: HTMLDivElement;
    private current: BiomeId = 'meadow';

    public constructor(private game: Game) {}

    public mount(): void {
        if (this.overlay) return;

        const overlay = document.createElement('div');
        overlay.id = 'arpg-biome-overlay';
        Object.assign(overlay.style, {
            position: 'fixed', inset: '0', pointerEvents: 'none', zIndex: '40',
            mixBlendMode: 'soft-light', transition: 'background 650ms ease',
            background: 'transparent'
        });

        const particles = document.createElement('div');
        particles.id = 'arpg-biome-particles';
        Object.assign(particles.style, {
            position: 'fixed', inset: '0', pointerEvents: 'none', zIndex: '41', overflow: 'hidden'
        });

        const label = document.createElement('div');
        Object.assign(label.style, {
            position: 'fixed', top: '82px', left: '50%', transform: 'translateX(-50%) translateY(-8px)',
            zIndex: '9991', pointerEvents: 'none', padding: '7px 14px', borderRadius: '999px',
            border: '1px solid rgba(213,177,104,.35)', background: 'rgba(4,7,9,.76)',
            color: '#e7d19c', font: '600 11px Arial,sans-serif', letterSpacing: '1.2px',
            opacity: '0', transition: 'opacity 250ms ease,transform 250ms ease'
        });

        document.body.append(overlay, particles, label);
        this.overlay = overlay;
        this.particles = particles;
        this.label = label;
    }

    public setBiome(id: BiomeId): void {
        this.mount();
        this.current = id;
        const biome = BIOMES[id];
        this.game.app.canvas.style.filter = biome.filter;
        if (this.overlay) this.overlay.style.background = `radial-gradient(circle at 50% 45%, transparent 35%, ${biome.tint} 100%)`;
        this.spawnAmbientParticles(biome.particle);
        this.showLabel(biome.name);
    }

    public getBiome(): BiomeId {
        return this.current;
    }

    private showLabel(name: string): void {
        if (!this.label) return;
        this.label.textContent = `BIOMA • ${name.toUpperCase()}`;
        this.label.style.opacity = '1';
        this.label.style.transform = 'translateX(-50%) translateY(0)';
        setTimeout(() => {
            if (!this.label) return;
            this.label.style.opacity = '0';
            this.label.style.transform = 'translateX(-50%) translateY(-8px)';
        }, 1800);
    }

    private spawnAmbientParticles(color: string): void {
        if (!this.particles) return;
        this.particles.innerHTML = '';
        for (let i = 0; i < 14; i++) {
            const dot = document.createElement('i');
            const size = 1 + Math.random() * 3;
            Object.assign(dot.style, {
                position: 'absolute', left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`,
                width: `${size}px`, height: `${size}px`, borderRadius: '50%', background: color,
                opacity: `${0.12 + Math.random() * .25}`, boxShadow: `0 0 ${size * 2}px ${color}`,
                animation: `arpg-biome-float ${7 + Math.random() * 9}s linear infinite`
            });
            this.particles.appendChild(dot);
        }
        if (!document.getElementById('arpg-biome-style')) {
            const style = document.createElement('style');
            style.id = 'arpg-biome-style';
            style.textContent = `@keyframes arpg-biome-float{0%{transform:translate3d(0,20px,0);opacity:.05}50%{opacity:.35}100%{transform:translate3d(30px,-80px,0);opacity:0}}`;
            document.head.appendChild(style);
        }
    }
}
