import Formulas from '../../../../info/formulas';

import { Opcodes, Modules } from '@kaetram/common/network';
import { PointsPacket, TalentPacket } from '@kaetram/common/network/impl';
import {
    WARRIOR_ASCENDANCIES,
    WARRIOR_TALENT_LINKS,
    WARRIOR_TALENT_NODES,
    WARRIOR_TALENT_START
} from '@kaetram/common/data/warrior-talents';

import type Player from './player';
import type { TalentPacketData } from '@kaetram/common/network/impl/talent';
import type { WarriorTalentEffects } from '@kaetram/common/data/warrior-talents';

export interface SerializedTalents {
    username?: string;
    selected?: string[];
    ascendancy?: string;
}

export default class Talents {
    private selected = new Set<string>([WARRIOR_TALENT_START]);
    private ascendancy = 'Warrior1';
    private effects: WarriorTalentEffects = {};
    private loaded = false;

    public constructor(private player: Player) {}

    public load(data?: SerializedTalents): void {
        const next = new Set<string>([WARRIOR_TALENT_START]);
        const requestedAscendancy = data?.ascendancy;

        if (requestedAscendancy && requestedAscendancy in WARRIOR_ASCENDANCIES)
            this.ascendancy = requestedAscendancy;

        for (const key of data?.selected || []) {
            const meta = WARRIOR_TALENT_NODES[key];

            if (!meta?.s || key === WARRIOR_TALENT_START) continue;
            if (meta.a && meta.a !== this.ascendancy) continue;

            next.add(key);
        }

        this.selected = this.sanitizeConnected(next);
        this.loaded = true;
        this.recalculate();
        this.applyDerivedStats(false);
    }

    public serialize(): SerializedTalents {
        return {
            selected: [...this.selected].filter((key) => key !== WARRIOR_TALENT_START),
            ascendancy: this.ascendancy
        };
    }

    public isLoaded(): boolean {
        return this.loaded;
    }

    public toggle(key: string): void {
        const meta = WARRIOR_TALENT_NODES[key];

        if (!meta?.s || key === WARRIOR_TALENT_START) return this.sync();
        if (meta.a && meta.a !== this.ascendancy) return this.sync();

        if (this.selected.has(key)) {
            const candidate = new Set(this.selected);
            candidate.delete(key);

            // A refund is allowed only when it does not leave purchased nodes disconnected.
            if (!this.sameSelection(candidate, this.sanitizeConnected(candidate))) return this.sync();

            this.selected = candidate;
        } else {
            if (this.getAvailablePoints() < meta.c) return this.sync();

            const neighbours = WARRIOR_TALENT_LINKS[key] || [];
            if (!neighbours.some((neighbour) => this.selected.has(neighbour))) return this.sync();

            this.selected.add(key);
        }

        this.commit();
    }

    public reset(): void {
        this.selected = new Set([WARRIOR_TALENT_START]);
        this.commit();
    }

    public setAscendancy(ascendancy: string): void {
        if (!(ascendancy in WARRIOR_ASCENDANCIES) || ascendancy === this.ascendancy) return this.sync();

        this.ascendancy = ascendancy;

        for (const key of [...this.selected]) {
            const meta = WARRIOR_TALENT_NODES[key];
            if (meta?.a) this.selected.delete(key);
        }

        this.commit();
    }

    public sync(): void {
        this.player.send(new TalentPacket(Opcodes.Talent.Sync, this.getPacketData()));
    }

    public getEffect(key: keyof WarriorTalentEffects): number {
        return Number(this.effects[key] || 0);
    }

    public getCriticalChance(): number {
        return Math.min(35, Math.max(0, this.getEffect('criticalChancePct')));
    }

    public getPhysicalDamageMultiplier(): number {
        return Math.max(0.1, 1 + this.getEffect('physicalDamagePct') / 100);
    }

    public getAttackSpeedMultiplier(): number {
        return Math.max(0.25, 1 + this.getEffect('attackSpeedPct') / 100);
    }

    public getMovementSpeedMultiplier(): number {
        return Math.max(0.25, 1 + this.getEffect('movementSpeedPct') / 100);
    }

    public getDefenseLevelMultiplier(): number {
        return Math.max(0.1, 1 + this.getEffect('defenseLevelPct') / 100);
    }

    public getDamageReductionBonus(): number {
        return Math.min(0.45, Math.max(0, this.getEffect('damageReductionPct') / 100));
    }

    public getMaxLifeMultiplier(): number {
        return Math.max(0.1, 1 + this.getEffect('maxLifePct') / 100);
    }

    public applyMaxLife(base: number): number {
        return Math.max(1, Math.floor(base * this.getMaxLifeMultiplier()));
    }

    private commit(): void {
        this.recalculate();
        this.applyDerivedStats(true);
        this.player.database.creator?.saveTalents(this.player);
        this.sync();
    }

    private recalculate(): void {
        const totals: WarriorTalentEffects = {};

        for (const key of this.selected) {
            const effects = WARRIOR_TALENT_NODES[key]?.e;
            if (!effects) continue;

            for (const [effect, value] of Object.entries(effects)) {
                const typed = effect as keyof WarriorTalentEffects;
                totals[typed] = Number(totals[typed] || 0) + Number(value || 0);
            }
        }

        this.effects = totals;
    }

    private applyDerivedStats(sendPoints: boolean): void {
        const health = this.player.skills.get(Modules.Skills.Health);
        const baseMax = Formulas.getMaxHitPoints(health?.level || 1);
        const maxHitPoints = this.applyMaxLife(baseMax);

        this.player.hitPoints.setMaxHitPoints(maxHitPoints);
        if (this.player.hitPoints.getHitPoints() > maxHitPoints)
            this.player.hitPoints.setHitPoints(maxHitPoints);

        // Recalculate movement/combat timings immediately after a talent change.
        this.player.getMovementSpeed();
        this.player.combat.updateLoop();

        if (sendPoints)
            this.player.send(
                new PointsPacket({
                    instance: this.player.instance,
                    hitPoints: this.player.hitPoints.getHitPoints(),
                    maxHitPoints,
                    mana: this.player.mana.getMana(),
                    maxMana: this.player.mana.getMaxMana()
                })
            );
    }

    private getPacketData(): TalentPacketData {
        const spentPoints = this.getSpentPoints();
        const totalPoints = this.getTotalPoints();

        return {
            selected: [...this.selected],
            ascendancy: this.ascendancy,
            totalPoints,
            spentPoints,
            availablePoints: Math.max(0, totalPoints - spentPoints),
            effects: this.effects
        };
    }

    private getTotalPoints(): number {
        // Mantém a folga de testes da árvore anterior. Depois podemos balancear para level - 1.
        return Math.max(45, Math.max(0, this.player.level - 1));
    }

    private getSpentPoints(): number {
        let spent = 0;

        for (const key of this.selected) {
            if (key === WARRIOR_TALENT_START) continue;
            spent += WARRIOR_TALENT_NODES[key]?.c || 0;
        }

        return spent;
    }

    private getAvailablePoints(): number {
        return Math.max(0, this.getTotalPoints() - this.getSpentPoints());
    }

    private sanitizeConnected(selection: Set<string>): Set<string> {
        const reachable = new Set<string>();
        const queue: string[] = [WARRIOR_TALENT_START];

        reachable.add(WARRIOR_TALENT_START);

        while (queue.length > 0) {
            const current = queue.shift()!;

            for (const neighbour of WARRIOR_TALENT_LINKS[current] || []) {
                if (!selection.has(neighbour) || reachable.has(neighbour)) continue;

                const meta = WARRIOR_TALENT_NODES[neighbour];
                if (!meta?.s || (meta.a && meta.a !== this.ascendancy)) continue;

                reachable.add(neighbour);
                queue.push(neighbour);
            }
        }

        return reachable;
    }

    private sameSelection(a: Set<string>, b: Set<string>): boolean {
        if (a.size !== b.size) return false;
        for (const key of a) if (!b.has(key)) return false;
        return true;
    }
}
