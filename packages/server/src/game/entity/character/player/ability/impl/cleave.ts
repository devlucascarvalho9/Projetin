import Ability from '../ability';

import type Player from '../../player';

/** Warrior starter: prepares an AoE basic attack and immediately engages the current target. */
export default class Cleave extends Ability {
    public constructor(level: number, quickSlot = -1) {
        super('cleave', level, quickSlot);
    }

    public override activate(player: Player): boolean {
        if (!player.hasTarget() || !player.target) {
            player.notify('misc:NEED_COMBAT');
            return false;
        }

        if (!super.activate(player)) return false;

        player.aoe = 1 + player.getArpgAbilityModifiers(this.key).radiusBonus;
        player.combat.attack(player.target);
        return true;
    }
}
