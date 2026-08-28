import Packet from '../packet';

import { Packets } from '@kaetram/common/network';

import type { Opcodes } from '@kaetram/common/network';
import type { Enchantment } from '@kaetram/common/types/item';

export interface EnchantPacketData {
    index: number;
    isShard?: boolean;
    essenceIndex?: number;
    previewId?: string;
    itemName?: string;
    essenceName?: string;
    affixes?: Enchantment[];
    message?: string;
}

export type EnchantPacketCallback = (opcode: Opcodes.Enchant, info: EnchantPacketData) => void;

export default class EnchantPacket extends Packet {
    public constructor(opcode: Opcodes.Enchant, data: unknown) {
        super(Packets.Enchant, opcode, data);
    }
}
