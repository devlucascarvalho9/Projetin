import Formulas from '../info/formulas';

import Utils from '@kaetram/common/util/utils';
import { EnchantPacket } from '@kaetram/common/network/impl';
import { Opcodes } from '@kaetram/common/network';

import Item from '../game/entity/objects/item';
import {
    AFFIXES,
    ARPG_META_ID,
    bestTierForItemLevel,
    clampItemLevel,
    getMeta,
    rollAffixes,
    setMeta
} from '../game/arpg/items';

import type Player from '../game/entity/character/player/player';
import type { Enchantment, Enchantments } from '@kaetram/common/types/item';

interface PendingEssencePreview {
    id: string;
    itemIndex: number;
    essenceIndex: number;
    itemKey: string;
    essenceKey: string;
    itemLevel: number;
    affixes: Enchantment[];
}

const ESSENCE_GUARANTEES: Record<string, string> = {
    essencebruta: 'strength',
    essencesangrenta: 'slash',
    essenceafiada: 'accuracy',
    essenceguardia: 'defense',
    essencerunica: 'magic'
};

const ESSENCE_NAMES: Record<string, string> = {
    essencebruta: 'Essência Bruta',
    essencesangrenta: 'Essência Sangrenta',
    essenceafiada: 'Essência Afiada',
    essenceguardia: 'Essência Guardiã',
    essencerunica: 'Essência Rúnica'
};

export default class Enchanter {
    private essencePreviews = new Map<string, PendingEssencePreview>();

    public select(player: Player, index = -1) {
        if (isNaN(index) || index === -1) return player.notify('enchant:CANNOT_ENCHANT');

        let slot = player.inventory.get(index);
        if (!slot?.key) return player.notify('enchant:CANNOT_ENCHANT');

        if (slot.key.startsWith('shardt') || slot.key.startsWith('essence'))
            return player.send(new EnchantPacket(Opcodes.Enchant.Select, { index, isShard: true }));

        if (slot.count > 1 || !slot.equippable || slot.maxStackSize > 1)
            return player.notify('enchant:CANNOT_ENCHANT');

        if (player.inventory.getItem(slot).getAvailableEnchantments().length === 0)
            return player.notify('enchant:CANNOT_ENCHANT');

        player.send(new EnchantPacket(Opcodes.Enchant.Select, { index }));
    }

    /** Native Kaetram shard enchanting is kept intact. */
    public enchant(player: Player, index = -1, shardIndex = -1): void {
        if (shardIndex === -1 || index === -1 || isNaN(index) || isNaN(shardIndex))
            return player.notify('enchant:NO_ITEM_SELECTED');

        let itemSlot = player.inventory.get(index),
            shardSlot = player.inventory.get(shardIndex);

        if (!itemSlot?.key || !shardSlot?.key) return player.notify('enchant:NO_ITEM_SELECTED');

        if (shardSlot.key.startsWith('essence')) {
            this.previewEssence(player, index, shardIndex);
            return;
        }

        if (!shardSlot.key.startsWith('shardt')) return player.notify('enchant:NO_SHARD');

        let item = player.inventory.getItem(itemSlot).copy(),
            enchantments = item.getAvailableEnchantments();

        if (enchantments.length === 0) return player.notify('enchant:NO_ITEM_SELECTED');

        let tier = parseInt(shardSlot.key.split('shardt')[1]),
            chance = Formulas.getEnchantChance(tier);

        player.inventory.remove(shardIndex, 1);
        if (!chance) return player.notify('enchant:FAILED_ENCHANT');

        let enchantment = enchantments[Utils.randomInt(0, enchantments.length - 1)],
            level = Utils.randomInt(1, tier);

        if (!this.canEnchant(item, enchantment, level)) return player.notify('enchant:FAILED_ENCHANT');

        item.setEnchantment(enchantment, level);
        itemSlot.update(item);
        player.notify('enchant:SUCCESSFUL_ENCHANT');
        player.inventory.loadCallback?.();
        player.save();
    }

    /** Generates an authoritative ARPG essence preview. */
    public previewEssence(player: Player, index = -1, essenceIndex = -1): void {
        if (index < 0 || essenceIndex < 0 || isNaN(index) || isNaN(essenceIndex)) return;

        const itemSlot = player.inventory.get(index),
            essenceSlot = player.inventory.get(essenceIndex);

        if (!itemSlot?.key || !essenceSlot?.key) return player.notify('enchant:NO_ITEM_SELECTED');
        if (!itemSlot.equippable || itemSlot.count !== 1) return player.notify('enchant:CANNOT_ENCHANT');
        if (!(essenceSlot.key in ESSENCE_GUARANTEES)) return player.notify('Este material não é uma Essência válida.');

        const currentItem = player.inventory.getItem(itemSlot);
        const currentMeta = getMeta(currentItem.enchantments);
        if (currentMeta.rarity === 'unique') return player.notify('Itens Únicos não podem ser reforjados com Essências.');

        const requirement = Math.max(1, currentItem.getRequirement());
        const itemLevel = clampItemLevel(
            itemSlot.enchantments[ARPG_META_ID]?.itemLevel ||
            itemSlot.enchantments[ARPG_META_ID]?.level ||
            Math.max(requirement, player.skills.getCombatLevel())
        );
        const affixes = this.rollEssenceAffixes(essenceSlot.key, itemLevel);
        const previewId = `${Date.now().toString(36)}-${Utils.randomInt(100000, 999999)}`;

        this.essencePreviews.set(player.username, {
            id: previewId,
            itemIndex: index,
            essenceIndex,
            itemKey: itemSlot.key,
            essenceKey: essenceSlot.key,
            itemLevel,
            affixes
        });

        player.send(
            new EnchantPacket(Opcodes.Enchant.EssencePreview, {
                index,
                essenceIndex,
                previewId,
                itemName: itemSlot.name,
                essenceName: ESSENCE_NAMES[essenceSlot.key] || essenceSlot.name,
                affixes,
                message: `${affixes.length} affix(es) • Item Level ${itemLevel} • melhor tier possível: T${bestTierForItemLevel(itemLevel)}.`
            })
        );
    }

    /** Applies exactly the preview that was generated server-side and consumes one essence. */
    public applyEssence(player: Player, previewId = ''): void {
        const preview = this.essencePreviews.get(player.username);
        if (!preview || preview.id !== previewId) return player.notify('Prévia da essência expirou. Role novamente.');

        const itemSlot = player.inventory.get(preview.itemIndex),
            essenceSlot = player.inventory.get(preview.essenceIndex);

        if (!itemSlot?.key || !essenceSlot?.key || itemSlot.key !== preview.itemKey || essenceSlot.key !== preview.essenceKey) {
            this.essencePreviews.delete(player.username);
            return player.notify('O item ou a essência mudou de posição. Role novamente.');
        }

        const currentItem = player.inventory.getItem(itemSlot);
        const kept: Enchantments = {};

        // Essence crafting replaces ARPG random modifiers but keeps native Kaetram enchantments.
        for (const [key, enchantment] of Object.entries(currentItem.enchantments))
            if (!['essence', 'arpg', 'unique', 'arpg-meta'].includes(enchantment.source || ''))
                kept[Number(key)] = enchantment;

        for (const affix of preview.affixes) {
            const definition = AFFIXES.find((entry) => entry.stat === affix.stat);
            if (!definition) continue;
            kept[definition.id] = { ...affix };
        }
        setMeta(kept, { rarity: 'rare', itemLevel: preview.itemLevel });

        const item = new Item(itemSlot.key, -1, -1, false, itemSlot.count, kept);
        if (!item.exists) return player.notify('Não foi possível reconstruir o item reforjado.');

        player.inventory.remove(preview.essenceIndex, 1);
        itemSlot.update(item);
        player.inventory.loadCallback?.();
        this.essencePreviews.delete(player.username);
        player.save();

        player.send(
            new EnchantPacket(Opcodes.Enchant.EssenceApply, {
                index: preview.itemIndex,
                essenceIndex: preview.essenceIndex,
                previewId,
                affixes: preview.affixes,
                message: `Item Raro reforjado no Item Level ${preview.itemLevel} e salvo no servidor.`
            })
        );
    }

    public cancelEssence(player: Player, previewId = ''): void {
        const preview = this.essencePreviews.get(player.username);
        if (preview && (!previewId || preview.id === previewId)) this.essencePreviews.delete(player.username);

        player.send(
            new EnchantPacket(Opcodes.Enchant.EssenceCancel, {
                index: preview?.itemIndex ?? -1,
                previewId,
                message: 'Prévia cancelada. Nenhuma essência foi consumida.'
            })
        );
    }

    private rollEssenceAffixes(essenceKey: string, itemLevel: number): Enchantment[] {
        const rolled = rollAffixes('rare', itemLevel, {
            source: 'essence',
            guaranteedStat: ESSENCE_GUARANTEES[essenceKey] || 'strength',
            min: 3,
            max: 5
        });
        return Object.values(rolled);
    }

    private canEnchant(item: Item, enchantment: number, level: number): boolean {
        if (!item.hasEnchantment(enchantment)) return true;
        return level > item.getEnchantmentLevel(enchantment);
    }
}
