import Packet from '../packet';

import { Packets } from '@kaetram/common/network';

import type { Opcodes } from '@kaetram/common/network';
import type { WarriorTalentEffects } from '@kaetram/common/data/warrior-talents';

export interface TalentPacketData {
    selected: string[];
    ascendancy: string;
    totalPoints: number;
    spentPoints: number;
    availablePoints: number;
    effects: WarriorTalentEffects;
}

export type TalentPacketCallback = (opcode: Opcodes.Talent, data: TalentPacketData) => void;

export default class Talent extends Packet {
    public constructor(opcode: Opcodes.Talent, data: TalentPacketData) {
        super(Packets.Talent, opcode, data);
    }
}
