import rawItems from '../../../data/items.json';

import Utils from '@kaetram/common/util/utils';

import type { Enchantment, Enchantments, ItemData } from '@kaetram/common/types/item';

export type ArpgRarity = 'normal' | 'magic' | 'rare' | 'unique';
export type AffixKind = 'prefix' | 'suffix';

export interface TierRange {
    min: number;
    max: number;
}

export interface AffixDefinition {
    id: number;
    stat: string;
    name: string;
    kind: AffixKind;
    tiers: Record<number, TierRange>;
}

export interface ArpgMeta {
    rarity: ArpgRarity;
    itemLevel: number;
    uniqueKey?: string;
    mapTier?: number;
}

interface RawItems {
    [key: string]: ItemData;
}

export const ARPG_META_ID = 9900;

export const RARITY_NAMES: Record<ArpgRarity, string> = {
    normal: 'Normal',
    magic: 'Mágico',
    rare: 'Raro',
    unique: 'Único'
};

export const RARITY_COLOURS: Record<ArpgRarity, string> = {
    normal: '#dedede',
    magic: '#6f9cff',
    rare: '#f0cf62',
    unique: '#d88a3d'
};

export const RARITY_LIMITS: Record<ArpgRarity, { prefixes: number; suffixes: number; min: number; max: number }> = {
    normal: { prefixes: 0, suffixes: 0, min: 0, max: 0 },
    magic: { prefixes: 1, suffixes: 1, min: 1, max: 2 },
    rare: { prefixes: 3, suffixes: 3, min: 3, max: 6 },
    unique: { prefixes: 3, suffixes: 3, min: 4, max: 6 }
};

export const AFFIXES: AffixDefinition[] = [
    { id: 1001, stat: 'strength', name: 'Força', kind: 'prefix', tiers: { 1:{min:20,max:25}, 2:{min:15,max:19}, 3:{min:11,max:14}, 4:{min:7,max:10}, 5:{min:3,max:6} } },
    { id: 1002, stat: 'accuracy', name: 'Precisão', kind: 'prefix', tiers: { 1:{min:30,max:40}, 2:{min:23,max:29}, 3:{min:16,max:22}, 4:{min:9,max:15}, 5:{min:3,max:8} } },
    { id: 1003, stat: 'slash', name: 'Corte', kind: 'prefix', tiers: { 1:{min:18,max:25}, 2:{min:13,max:17}, 3:{min:9,max:12}, 4:{min:5,max:8}, 5:{min:2,max:4} } },
    { id: 1004, stat: 'crush', name: 'Impacto', kind: 'prefix', tiers: { 1:{min:18,max:25}, 2:{min:13,max:17}, 3:{min:9,max:12}, 4:{min:5,max:8}, 5:{min:2,max:4} } },
    { id: 1005, stat: 'stab', name: 'Perfuração', kind: 'prefix', tiers: { 1:{min:18,max:25}, 2:{min:13,max:17}, 3:{min:9,max:12}, 4:{min:5,max:8}, 5:{min:2,max:4} } },
    { id: 1006, stat: 'magic', name: 'Poder Rúnico', kind: 'prefix', tiers: { 1:{min:18,max:25}, 2:{min:13,max:17}, 3:{min:9,max:12}, 4:{min:5,max:8}, 5:{min:2,max:4} } },
    { id: 1007, stat: 'defense', name: 'Defesa', kind: 'suffix', tiers: { 1:{min:20,max:28}, 2:{min:15,max:19}, 3:{min:10,max:14}, 4:{min:6,max:9}, 5:{min:2,max:5} } },
    { id: 1008, stat: 'attackSpeedPct', name: 'Velocidade de Ataque', kind: 'suffix', tiers: { 1:{min:10,max:14}, 2:{min:8,max:9}, 3:{min:6,max:7}, 4:{min:4,max:5}, 5:{min:2,max:3} } },
    { id: 1009, stat: 'movementSpeedPct', name: 'Velocidade de Movimento', kind: 'suffix', tiers: { 1:{min:9,max:12}, 2:{min:7,max:8}, 3:{min:5,max:6}, 4:{min:3,max:4}, 5:{min:1,max:2} } }
];

export const ARPG_BASES: Array<{ key: string; level: number }> = [
    { key: 'arpg_rustblade', level: 1 },
    { key: 'arpg_hidevest', level: 1 },
    { key: 'arpg_trailboots', level: 1 },
    { key: 'arpg_oakshield', level: 4 },
    { key: 'arpg_waraxe', level: 8 },
    { key: 'arpg_ironcuirass', level: 12 },
    { key: 'arpg_guardring', level: 14 },
    { key: 'arpg_longblade', level: 18 },
    { key: 'arpg_soldierboots', level: 20 },
    { key: 'arpg_towershield', level: 24 },
    { key: 'arpg_berserkeraxe', level: 28 },
    { key: 'arpg_warplate', level: 32 },
    { key: 'arpg_bloodring', level: 36 },
    { key: 'arpg_executioner', level: 40 },
    { key: 'arpg_titanboots', level: 44 },
    { key: 'arpg_titanplate', level: 48 },
    { key: 'arpg_dreadblade', level: 55 },
    { key: 'arpg_juggernautshield', level: 58 },
    { key: 'arpg_bloodplate', level: 62 },
    { key: 'arpg_warstep', level: 66 },
    { key: 'arpg_conquerroring', level: 70 },
    { key: 'arpg_doomaxe', level: 76 },
    { key: 'arpg_colossusplate', level: 84 },
    { key: 'arpg_worldbreaker', level: 90 }
];

export const UNIQUE_KEYS = ['unique_ashcleaver', 'unique_stonewall', 'unique_warheart'] as const;

const UNIQUE_LEVELS: Record<(typeof UNIQUE_KEYS)[number], number> = {
    unique_ashcleaver: 32,
    unique_stonewall: 34,
    unique_warheart: 38
};

const UNIQUE_AFFIXES: Record<string, Array<{ stat: string; tier: number; value?: number }>> = {
    unique_ashcleaver: [
        { stat: 'slash', tier: 1, value: 30 },
        { stat: 'strength', tier: 1, value: 28 },
        { stat: 'attackSpeedPct', tier: 2, value: 9 },
        { stat: 'accuracy', tier: 2, value: 24 }
    ],
    unique_stonewall: [
        { stat: 'defense', tier: 1, value: 34 },
        { stat: 'strength', tier: 2, value: 19 },
        { stat: 'accuracy', tier: 3, value: 18 },
        { stat: 'movementSpeedPct', tier: 4, value: 4 }
    ],
    unique_warheart: [
        { stat: 'defense', tier: 1, value: 32 },
        { stat: 'strength', tier: 1, value: 26 },
        { stat: 'magic', tier: 3, value: 11 },
        { stat: 'attackSpeedPct', tier: 3, value: 7 }
    ]
};

export function clampItemLevel(level: number): number {
    return Math.max(1, Math.min(100, Math.floor(Number(level) || 1)));
}

export function getMeta(enchantments: Enchantments = {}): ArpgMeta {
    const entry = enchantments[ARPG_META_ID];
    return {
        rarity: (entry?.rarity as ArpgRarity) || 'normal',
        itemLevel: clampItemLevel(entry?.itemLevel || entry?.level || 1),
        uniqueKey: entry?.uniqueKey,
        mapTier: entry?.mapTier
    };
}

export function setMeta(enchantments: Enchantments, meta: ArpgMeta): Enchantments {
    enchantments[ARPG_META_ID] = {
        level: clampItemLevel(meta.itemLevel),
        itemLevel: clampItemLevel(meta.itemLevel),
        rarity: meta.rarity,
        uniqueKey: meta.uniqueKey,
        mapTier: meta.mapTier,
        source: 'arpg-meta'
    };
    return enchantments;
}

export function rarityRank(rarity: ArpgRarity): number {
    return ({ normal: 0, magic: 1, rare: 2, unique: 3 } as Record<ArpgRarity, number>)[rarity] ?? 0;
}

export function bestTierForItemLevel(itemLevel: number): number {
    const level = clampItemLevel(itemLevel);
    if (level >= 50) return 1;
    if (level >= 35) return 2;
    if (level >= 20) return 3;
    if (level >= 10) return 4;
    return 5;
}

export function rollTierForItemLevel(itemLevel: number): number {
    const best = bestTierForItemLevel(itemLevel);
    const available = [1, 2, 3, 4, 5].filter((tier) => tier >= best);
    const roll = Math.random();
    const offsets = roll < 0.10 ? 0 : roll < 0.28 ? 1 : roll < 0.52 ? 2 : roll < 0.78 ? 3 : 4;
    return available[Math.min(offsets, available.length - 1)];
}

function formatAffix(definition: AffixDefinition, tier: number, source: string, fixedValue?: number): Enchantment {
    const range = definition.tiers[tier];
    const value = fixedValue ?? Utils.randomInt(range.min, range.max);
    const suffix = definition.stat.endsWith('Pct') ? '%' : '';
    return {
        level: tier,
        tier,
        value,
        stat: definition.stat,
        label: `+${value}${suffix} ${definition.name}`,
        affixType: definition.kind,
        source
    };
}

export function rollAffixes(
    rarity: ArpgRarity,
    itemLevel: number,
    options: { source?: string; guaranteedStat?: string; min?: number; max?: number } = {}
): Enchantments {
    const result: Enchantments = {};
    const limits = RARITY_LIMITS[rarity];
    if (!limits || limits.max === 0) return result;

    const source = options.source || 'arpg';
    const min = Math.max(0, Math.min(limits.max, options.min ?? limits.min));
    const max = Math.max(min, Math.min(limits.max, options.max ?? limits.max));
    const targetCount = Utils.randomInt(min, max);
    const picked = new Set<number>();
    let prefixes = 0,
        suffixes = 0;

    const tryAdd = (definition: AffixDefinition, guaranteed = false): boolean => {
        if (picked.has(definition.id)) return false;
        if (definition.kind === 'prefix' && prefixes >= limits.prefixes) return false;
        if (definition.kind === 'suffix' && suffixes >= limits.suffixes) return false;
        const tier = guaranteed ? bestTierForItemLevel(itemLevel) : rollTierForItemLevel(itemLevel);
        result[definition.id] = formatAffix(definition, tier, source);
        picked.add(definition.id);
        if (definition.kind === 'prefix') prefixes++;
        else suffixes++;
        return true;
    };

    if (options.guaranteedStat) {
        const guaranteed = AFFIXES.find((entry) => entry.stat === options.guaranteedStat);
        if (guaranteed) tryAdd(guaranteed, true);
    }

    let attempts = 0;
    while (picked.size < targetCount && attempts++ < 100) {
        const definition = AFFIXES[Utils.randomInt(0, AFFIXES.length - 1)];
        tryAdd(definition);
    }

    return result;
}

export function createUniqueEnchantments(key: string, itemLevel: number, mapTier?: number): Enchantments {
    const result: Enchantments = {};
    const fixed = UNIQUE_AFFIXES[key] || UNIQUE_AFFIXES.unique_ashcleaver;
    for (const entry of fixed) {
        const definition = AFFIXES.find((affix) => affix.stat === entry.stat);
        if (!definition) continue;
        const tier = Math.max(bestTierForItemLevel(itemLevel), entry.tier);
        result[definition.id] = formatAffix(definition, tier, 'unique', entry.value);
    }
    return setMeta(result, { rarity: 'unique', itemLevel, uniqueKey: key, mapTier });
}

export function createLootEnchantments(
    itemLevel: number,
    rarity: ArpgRarity,
    mapTier?: number,
    uniqueKey?: string
): Enchantments {
    if (rarity === 'unique' && uniqueKey) return createUniqueEnchantments(uniqueKey, itemLevel, mapTier);
    const result = rollAffixes(rarity, itemLevel, { source: 'arpg' });
    return setMeta(result, { rarity, itemLevel, mapTier });
}

export function rollRarity(rarityBonus = 0): ArpgRarity {
    const bonus = Math.max(0, rarityBonus);
    const uniqueChance = Math.min(8, 1 + bonus * 0.15);
    const rareChance = Math.min(38, 12 + bonus * 0.55);
    const magicChance = 31;
    const roll = Math.random() * 100;
    if (roll < uniqueChance) return 'unique';
    if (roll < uniqueChance + rareChance) return 'rare';
    if (roll < uniqueChance + rareChance + magicChance) return 'magic';
    return 'normal';
}

export function getRandomBaseKey(level: number): string {
    const target = clampItemLevel(level);
    const eligible = ARPG_BASES.filter((base) => base.level <= target + 5 && base.level >= Math.max(1, target - 18));
    const pool = eligible.length ? eligible : ARPG_BASES.filter((base) => base.level <= target + 5);
    const finalPool = pool.length ? pool : ARPG_BASES.slice(0, 4);
    return finalPool[Utils.randomInt(0, finalPool.length - 1)].key;
}

export function rollArpgGearDrop(level: number, rarityBonus = 0, mapTier = 1): { key: string; enchantments: Enchantments } {
    const itemLevel = clampItemLevel(level + Utils.randomInt(-2, 3) + Math.max(0, mapTier - 1));
    let rarity = rollRarity(rarityBonus);
    if (rarity === 'unique') {
        const eligibleUniques = UNIQUE_KEYS.filter((key) => UNIQUE_LEVELS[key] <= itemLevel + 4);
        if (eligibleUniques.length) {
            const uniqueKey = eligibleUniques[Utils.randomInt(0, eligibleUniques.length - 1)];
            return { key: uniqueKey, enchantments: createUniqueEnchantments(uniqueKey, itemLevel, mapTier) };
        }
        // Low-level zones cannot drop endgame uniques; convert the roll to Rare instead.
        rarity = 'rare';
    }
    const key = getRandomBaseKey(itemLevel);
    return { key, enchantments: createLootEnchantments(itemLevel, rarity, mapTier) };
}

export function isEquippableKey(key: string): boolean {
    const data = (rawItems as RawItems)[key];
    if (!data) return false;
    return ['weapon', 'shield', 'chestplate', 'helmet', 'legplates', 'boots', 'ring', 'pendant', 'cape', 'arrows'].includes(data.type);
}

export function getItemSellValue(key: string, enchantments: Enchantments = {}): number {
    const data = (rawItems as RawItems)[key];
    const base = Math.max(2, Number(data?.price || 10));
    const { rarity, itemLevel } = getMeta(enchantments);
    const multiplier = ({ normal: 0.25, magic: 0.55, rare: 1.15, unique: 3 } as Record<ArpgRarity, number>)[rarity];
    return Math.max(1, Math.floor(base * multiplier + itemLevel * (rarityRank(rarity) + 1)));
}
