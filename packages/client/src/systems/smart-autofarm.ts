import Utils from '../utils/util';
import { pathLength } from './smart-path-utils';

import { Packets, Opcodes } from '@kaetram/common/network';

import type Game from '../game';
import type Entity from '../entity/entity';
import type Character from '../entity/character/character';

interface Candidate {
    entity: Entity;
    distance: number;
    pathCost: number;
    score: number;
}

/**
 * Idle-focused auto farm controller.
 *
 * Goals:
 * - prefer reachable loot and combat targets instead of Euclidean-only distance;
 * - recover when the player is stuck;
 * - patrol locally when the area is empty so farming does not stall forever;
 * - avoid packet spam by keeping a single decision cadence.
 *
 * The path-cost/scoring approach is inspired by grid-game usage patterns from
 * PathFinding.js (MIT). Kaetram's own A* remains the authoritative pathfinder.
 */
export default class SmartAutoFarm {
    public lootRadius = 11;
    public combatRadius = 15;
    public patrolRadius = 7;
    public preferLoot = true;

    private lastDecision = 0;
    private lastProgressCheck = 0;
    private lastX = -1;
    private lastY = -1;
    private stuckTicks = 0;
    private patrolUntil = 0;
    private lastCleave = 0;
    private lastWhirlwind = 0;
    private lastWarcry = 0;
    private easyStarLoading = false;
    private easyStarReady = false;
    private easyStarFailures = 0;

    public constructor(private game: Game) {}

    public update(active: boolean): void {
        if (!active || !this.game.started || !this.game.player || this.game.player.dead) {
            this.resetProgress();
            return;
        }

        const now = Date.now();
        this.ensureEasyStar();
        this.trackProgress(now);

        // A slightly faster cadence than the old implementation, but still far
        // below frame rate so it cannot spam pathfinding/network packets.
        if (now - this.lastDecision < 325) return;
        this.lastDecision = now;

        if (this.stuckTicks >= 4) {
            this.recoverFromStuck();
            this.stuckTicks = 0;
            return;
        }

        const entities = Object.values(this.game.entities.getAll());
        const loot = this.findBestLoot(entities);
        const mob = this.findBestMob(entities);

        if (this.preferLoot && loot) {
            this.moveToLoot(loot.entity);
            return;
        }

        if (mob) {
            this.engageMob(mob.entity as Character);
            return;
        }

        if (loot) {
            this.moveToLoot(loot.entity);
            return;
        }

        this.patrol(now);
    }

    private passesLootFilter(entity: Entity): boolean {
        const name = (entity.name || '').toLocaleLowerCase('pt-BR');
        if (name.includes('essência') || name.includes('essence')) return true;

        const settings = (window as any).__kaetramArpgSettings;
        const minRarity = settings?.lootFilter?.minRarity || 'normal';
        const enchantments = (entity as any).enchantments || {};
        const meta = enchantments[9900];
        if (!meta || meta.source !== 'arpg-meta') return true;

        const rank: Record<string, number> = { normal: 0, magic: 1, rare: 2, unique: 3 };
        return (rank[meta.rarity || 'normal'] || 0) >= (rank[minRarity] || 0);
    }

    private findBestLoot(entities: Entity[]): Candidate | null {
        let best: Candidate | null = null;

        for (const entity of entities) {
            if (!entity || !entity.isItem()) continue;
            if (!this.passesLootFilter(entity)) continue;

            const distance = Utils.distance(
                this.game.player.gridX,
                this.game.player.gridY,
                entity.gridX,
                entity.gridY
            );

            if (distance > this.lootRadius) continue;

            const pathCost = this.pathCost(entity.gridX, entity.gridY);
            if (!Number.isFinite(pathCost)) continue;

            const name = (entity.name || '').toLocaleLowerCase('pt-BR');
            const essenceBonus = name.includes('essência') || name.includes('essence') ? 9 : 0;
            const forgeBonus = name.includes('teste') || name.includes('forja') ? 4 : 0;
            const score = 100 + essenceBonus + forgeBonus - pathCost * 2.2 - distance * 0.5;

            if (!best || score > best.score) best = { entity, distance, pathCost, score };
        }

        return best;
    }

    private findBestMob(entities: Entity[]): Candidate | null {
        let best: Candidate | null = null;

        for (const entity of entities) {
            if (!entity || !entity.isMob() || entity.dead) continue;

            const distance = Utils.distance(
                this.game.player.gridX,
                this.game.player.gridY,
                entity.gridX,
                entity.gridY
            );

            if (distance > this.combatRadius) continue;

            const pathCost = this.pathCost(entity.gridX, entity.gridY, true);
            if (!Number.isFinite(pathCost)) continue;

            // Slight preference for targets around the player's level, while still
            // allowing the idle loop to clear weaker mobs efficiently.
            const levelDelta = Math.abs((entity.level || 1) - (this.game.player.level || 1));
            const levelPenalty = Math.min(8, levelDelta) * 0.7;
            const score = 70 - pathCost * 1.8 - distance * 0.35 - levelPenalty;

            if (!best || score > best.score) best = { entity, distance, pathCost, score };
        }

        return best;
    }

    private pathCost(x: number, y: number, allowAdjacent = false): number {
        const p = this.game.player;

        // A target that is already inside melee range is always valid, even when
        // its own tile is not pathable (common for shoreline mobs such as Crab).
        if (allowAdjacent && Utils.distance(p.gridX, p.gridY, x, y) <= Math.max(1.5, p.attackRange || 1))
            return 0;

        const direct = this.game.findPath(p, x, y);
        if (direct.length > 1) return pathLength(direct);

        // EasyStar is vendored locally (MIT) and acts as a second planner when the
        // legacy Kaetram A* cannot resolve a route.  This is especially useful in
        // dense city/dungeon geometry where the idle controller used to give up.
        const easyDirect = this.easyFindPath(p.gridX, p.gridY, x, y);
        if (easyDirect && easyDirect.length > 1) return easyDirect.length - 1;

        if (!allowAdjacent) return Infinity;

        // Check the complete 8-tile ring. Some mobs sit next to shoreline/
        // decorative collision where only a diagonal attack position is reachable.
        const candidates = [
            [x + 1, y],
            [x - 1, y],
            [x, y + 1],
            [x, y - 1],
            [x + 1, y + 1],
            [x + 1, y - 1],
            [x - 1, y + 1],
            [x - 1, y - 1]
        ];

        let best = Infinity;
        for (const [cx, cy] of candidates) {
            if (cx < 0 || cy < 0 || cx >= this.game.map.width || cy >= this.game.map.height) continue;
            if (this.game.map.isColliding(cx, cy)) continue;
            const path = this.game.findPath(p, cx, cy);
            if (path.length > 1) best = Math.min(best, pathLength(path));
            else {
                const easy = this.easyFindPath(p.gridX, p.gridY, cx, cy);
                if (easy && easy.length > 1) best = Math.min(best, easy.length - 1);
            }
        }

        return best;
    }

    private ensureEasyStar(): void {
        if (this.easyStarReady || this.easyStarLoading || typeof document === 'undefined') return;
        const globalEasy = (globalThis as any).EasyStar;
        if (globalEasy?.js) {
            this.easyStarReady = true;
            return;
        }

        this.easyStarLoading = true;
        const existing = document.querySelector<HTMLScriptElement>('script[data-kaetram-easystar]');
        if (existing) {
            existing.addEventListener('load', () => { this.easyStarReady = Boolean((globalThis as any).EasyStar?.js); });
            existing.addEventListener('error', () => { this.easyStarLoading = false; this.easyStarFailures++; });
            return;
        }

        const script = document.createElement('script');
        script.src = '/vendor/easystar-0.4.4.min.js';
        script.async = true;
        script.dataset.kaetramEasystar = '1';
        script.addEventListener('load', () => {
            this.easyStarReady = Boolean((globalThis as any).EasyStar?.js);
            this.easyStarLoading = false;
        });
        script.addEventListener('error', () => {
            this.easyStarLoading = false;
            this.easyStarFailures++;
        });
        document.head.appendChild(script);
    }

    private easyFindPath(startX: number, startY: number, endX: number, endY: number): Array<{x:number;y:number}> | null {
        if (!this.easyStarReady || this.easyStarFailures > 2) return null;
        const EasyStar = (globalThis as any).EasyStar;
        if (!EasyStar?.js) return null;
        try {
            const planner = new EasyStar.js();
            planner.setGrid(this.game.map.grid);
            planner.setAcceptableTiles([0]);
            planner.disableDiagonals();
            planner.enableSync();
            planner.setIterationsPerCalculation(150000);
            let result: Array<{x:number;y:number}> | null = null;
            planner.findPath(startX, startY, endX, endY, (path: Array<{x:number;y:number}> | null) => { result = path; });
            planner.calculate();
            return result;
        } catch {
            this.easyStarFailures++;
            return null;
        }
    }

    private moveToLoot(entity: Entity): void {
        this.game.player.go(entity.gridX, entity.gridY, true);
    }

    private engageMob(mob: Character): void {
        const player = this.game.player;

        player.follow(mob, true);
        mob.addAttacker(player);
        player.lastTarget = mob.instance;

        if (player.canAttackTarget()) {
            const now = Date.now();
            const hpRatio = player.maxHitPoints > 0 ? player.hitPoints / player.maxHitPoints : 1;
            const nearbyMobs = Object.values(this.game.entities.getAll()).filter((entity) =>
                entity?.isMob() &&
                !entity.dead &&
                Utils.distance(player.gridX, player.gridY, entity.gridX, entity.gridY) <= 2.5
            ).length;

            // Idle rotation: sustain first, large AoE for packs, cleave for single targets.
            if (hpRatio < 0.5 && now - this.lastWarcry >= 10_000) {
                this.game.socket.send(Packets.Ability, { opcode: Opcodes.Ability.Use, key: 'warcry' });
                this.lastWarcry = now;
            } else if (nearbyMobs >= 3 && now - this.lastWhirlwind >= 6_000) {
                this.game.socket.send(Packets.Ability, { opcode: Opcodes.Ability.Use, key: 'whirlwind' });
                this.lastWhirlwind = now;
            } else if (now - this.lastCleave >= 2_500) {
                this.game.socket.send(Packets.Ability, { opcode: Opcodes.Ability.Use, key: 'cleave' });
                this.lastCleave = now;
            }

            this.game.socket.send(Packets.Target, [
                Opcodes.Target.Attack,
                mob.instance,
                mob.gridX,
                mob.gridY
            ]);
        }
    }

    private trackProgress(now: number): void {
        if (now - this.lastProgressCheck < 700) return;
        this.lastProgressCheck = now;

        const { gridX, gridY } = this.game.player;
        if (gridX === this.lastX && gridY === this.lastY && this.game.player.hasPath()) this.stuckTicks++;
        else this.stuckTicks = 0;

        this.lastX = gridX;
        this.lastY = gridY;
    }

    private recoverFromStuck(): void {
        const p = this.game.player;
        const candidates: [number, number][] = [];

        for (let radius = 1; radius <= 4; radius++) {
            for (let dy = -radius; dy <= radius; dy++) {
                for (let dx = -radius; dx <= radius; dx++) {
                    if (Math.abs(dx) !== radius && Math.abs(dy) !== radius) continue;
                    const x = p.gridX + dx;
                    const y = p.gridY + dy;
                    if (x < 0 || y < 0 || x >= this.game.map.width || y >= this.game.map.height) continue;
                    if (this.game.map.isColliding(x, y)) continue;
                    if (this.game.findPath(p, x, y).length > 1) candidates.push([x, y]);
                }
            }
            if (candidates.length) break;
        }

        if (!candidates.length) return;
        const [x, y] = candidates[Math.floor(Math.random() * candidates.length)];
        p.go(x, y, true);
    }

    private patrol(now: number): void {
        if (now < this.patrolUntil || this.game.player.hasPath()) return;

        const p = this.game.player;
        const candidates: [number, number][] = [];

        for (let attempt = 0; attempt < 18; attempt++) {
            const dx = Math.floor(Math.random() * (this.patrolRadius * 2 + 1)) - this.patrolRadius;
            const dy = Math.floor(Math.random() * (this.patrolRadius * 2 + 1)) - this.patrolRadius;
            const x = p.gridX + dx;
            const y = p.gridY + dy;
            if (x < 0 || y < 0 || x >= this.game.map.width || y >= this.game.map.height) continue;
            if (this.game.map.isColliding(x, y)) continue;
            const path = this.game.findPath(p, x, y);
            if (path.length > 2) candidates.push([x, y]);
        }

        if (!candidates.length) {
            this.patrolUntil = now + 1200;
            return;
        }

        const [x, y] = candidates[Math.floor(Math.random() * candidates.length)];
        p.go(x, y, true);
        this.patrolUntil = now + 1500;
    }

    private resetProgress(): void {
        this.lastX = -1;
        this.lastY = -1;
        this.stuckTicks = 0;
    }
}
