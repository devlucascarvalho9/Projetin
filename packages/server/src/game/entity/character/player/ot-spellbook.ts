import Data from '../../../../../data/ot-spells.json';

import type Entity from '../../entity';
import type Player from './player';

interface OtSpell {
    key: string;
    name: string;
    category: string;
    words: string;
    level: number;
    mana: number;
    cooldown: number;
    range: number;
    vocations: string[];
    effect: string;
    shape: string;
    offensive: boolean;
}

const Spells = Data as OtSpell[];
const SpellIndex = new Map(Spells.map((spell) => [spell.key, spell]));

export default class OtSpellbook {
    private cooldowns = new Map<string, number>();

    public constructor(private player: Player) {}

    public use(key: string): boolean {
        const spell = SpellIndex.get(key);

        if (!spell) {
            this.player.notify(`OT Skill nao encontrada: ${key}`);
            return false;
        }

        const now = Date.now();
        const readyAt = this.cooldowns.get(key) || 0;

        if (now < readyAt) {
            const seconds = Math.max(0.1, (readyAt - now) / 1000).toFixed(1);
            this.player.notify(`${spell.name}: aguarde ${seconds}s.`);
            return false;
        }

        const maxMana = Math.max(1, this.player.mana.getMaxMana());
        const adaptedMana = Math.min(
            Math.max(1, Math.floor(maxMana * 0.35)),
            Math.max(1, Math.round((spell.mana || 1) * 0.15))
        );

        if (this.player.mana.getMana() < adaptedMana) {
            this.player.notify('Mana insuficiente para esta OT Skill.');
            return false;
        }

        this.player.mana.decrement(adaptedMana);

        const cooldown = Math.max(350, Math.min(30_000, spell.cooldown || 1000));
        this.cooldowns.set(key, now + cooldown);

        if (spell.offensive) this.castOffensive(spell);
        else this.castUtility(spell);

        this.player.notify(
            `${spell.name} [${spell.effect}] • mana ${adaptedMana} • cd ${(cooldown / 1000).toFixed(1)}s`
        );

        return true;
    }

    private castOffensive(spell: OtSpell): void {
        const combatLevel = Math.max(1, this.player.skills.getCombatLevel());
        const skillLevel = Math.max(1, spell.level || 1);
        const baseDamage = Math.max(
            2,
            Math.round(4 + combatLevel * 1.65 + Math.min(120, skillLevel) * 0.35)
        );

        const radius =
            spell.shape === 'area'
                ? 3
                : spell.shape === 'wave'
                  ? 4
                  : spell.shape === 'beam'
                    ? 5
                    : spell.shape === 'self'
                      ? 2
                      : 0;

        if (radius > 0) {
            const hit = new Set<string>();

            this.player.world.map.grids.forEachEntityNear(
                this.player.x,
                this.player.y,
                (entity: Entity) => {
                    if (!entity.isMob() || entity.dead || hit.has(entity.instance)) return;

                    hit.add(entity.instance);

                    const distance = Math.max(1, this.player.getDistance(entity));
                    const scaled = Math.max(1, Math.round(baseDamage / Math.max(1, distance * 0.55)));

                    entity.hit(scaled, this.player);
                },
                radius
            );

            // If the area has no mob but the player already selected one, keep combat responsive.
            if (hit.size === 0 && this.player.target?.isMob() && !this.player.target.dead)
                this.player.target.hit(baseDamage, this.player);

            return;
        }

        let target = this.player.target?.isMob() ? this.player.target : undefined;

        // Find the nearest mob when there is no selected target.
        if (!target) {
            let bestDistance = Number.POSITIVE_INFINITY;

            this.player.world.map.grids.forEachEntityNear(
                this.player.x,
                this.player.y,
                (entity: Entity) => {
                    if (!entity.isMob() || entity.dead) return;

                    const distance = this.player.getDistance(entity);

                    if (distance < bestDistance) {
                        bestDistance = distance;
                        target = entity;
                    }
                },
                Math.max(1, spell.range || 6)
            );
        }

        if (!target) {
            this.player.notify(`${spell.name}: nenhum monstro no alcance.`);
            return;
        }

        if (this.player.getDistance(target) > Math.max(1, spell.range || 6)) {
            this.player.notify(`${spell.name}: alvo fora do alcance.`);
            return;
        }

        target.hit(baseDamage, this.player);
    }

    private castUtility(spell: OtSpell): void {
        const maxHp = Math.max(1, this.player.hitPoints.getMaxHitPoints());
        const maxMana = Math.max(1, this.player.mana.getMaxMana());

        if (spell.effect === 'heal' || spell.category === 'healing' || spell.category === 'party') {
            const heal = Math.max(1, Math.round(maxHp * (spell.category === 'party' ? 0.12 : 0.18)));
            this.player.heal(heal, 'hitpoints');
            return;
        }

        // Support, conjuring, familiar, summon and house spells are adapted as a short sustain pulse.
        const mana = Math.max(1, Math.round(maxMana * 0.08));
        const hp = Math.max(1, Math.round(maxHp * 0.05));

        this.player.mana.increment(mana);
        this.player.heal(hp, 'hitpoints');
    }

    public static count(): number {
        return Spells.length;
    }
}
