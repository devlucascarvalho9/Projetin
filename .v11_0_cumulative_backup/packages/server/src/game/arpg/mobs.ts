import Utils from '@kaetram/common/util/utils';

export type EliteModifierKey = 'brutal' | 'fortified' | 'swift' | 'arcane';

export interface EliteProfile {
    mapTier: number;
    elite: boolean;
    modifiers: EliteModifierKey[];
    title: string;
    colour: string;
    hitPointsMultiplier: number;
    attackMultiplier: number;
    defenseMultiplier: number;
    attackRateMultiplier: number;
    movementSpeedMultiplier: number;
    rarityBonus: number;
    quantityBonus: number;
}

const NAMES: Record<EliteModifierKey, string> = {
    brutal: 'Brutal',
    fortified: 'Fortificado',
    swift: 'Veloz',
    arcane: 'Arcano'
};

export function getMapTier(level: number): number {
    return Math.max(1, Math.min(10, Math.ceil(Math.max(1, level) / 10)));
}

export function rollEliteProfile(level: number, boss = false, miniboss = false): EliteProfile {
    const mapTier = getMapTier(level);
    const baseRarityBonus = (mapTier - 1) * 1.5 + (miniboss ? 12 : 0) + (boss ? 22 : 0);
    const baseQuantityBonus = (mapTier - 1) * 2 + (miniboss ? 20 : 0) + (boss ? 45 : 0);
    const eliteChance = Math.min(18, 6 + mapTier * 0.9);
    const elite = !boss && !miniboss && Math.random() * 100 < eliteChance;

    if (!elite) {
        return {
            mapTier,
            elite: false,
            modifiers: [],
            title: '',
            colour: '',
            hitPointsMultiplier: boss ? 1.15 : miniboss ? 1.1 : 1,
            attackMultiplier: boss ? 1.08 : miniboss ? 1.05 : 1,
            defenseMultiplier: 1,
            attackRateMultiplier: 1,
            movementSpeedMultiplier: 1,
            rarityBonus: baseRarityBonus,
            quantityBonus: baseQuantityBonus
        };
    }

    const pool: EliteModifierKey[] = ['brutal', 'fortified', 'swift', 'arcane'];
    const amount = mapTier >= 6 && Math.random() < 0.35 ? 2 : 1;
    const modifiers: EliteModifierKey[] = [];
    while (modifiers.length < amount && pool.length) {
        modifiers.push(pool.splice(Utils.randomInt(0, pool.length - 1), 1)[0]);
    }

    let hp = 1.45,
        attack = 1.12,
        defense = 1.1,
        attackRate = 1,
        movement = 1;

    for (const modifier of modifiers) {
        switch (modifier) {
            case 'brutal':
                attack *= 1.32;
                break;
            case 'fortified':
                hp *= 1.45;
                defense *= 1.35;
                break;
            case 'swift':
                attackRate *= 0.78;
                movement *= 0.82;
                break;
            case 'arcane':
                attack *= 1.18;
                defense *= 1.12;
                break;
        }
    }

    return {
        mapTier,
        elite: true,
        modifiers,
        title: `Elite ${modifiers.map((key) => NAMES[key]).join(' + ')}`,
        colour: '#c58cff',
        hitPointsMultiplier: hp,
        attackMultiplier: attack,
        defenseMultiplier: defense,
        attackRateMultiplier: attackRate,
        movementSpeedMultiplier: movement,
        rarityBonus: baseRarityBonus + 18 + modifiers.length * 5,
        quantityBonus: baseQuantityBonus + 35 + modifiers.length * 10
    };
}
