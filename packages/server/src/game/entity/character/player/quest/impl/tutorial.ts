import Quest from '../quest';
import Data from '../../../../../../../data/quests/tutorial.json';

import config from '@kaetram/common/config';

export default class Tutorial extends Quest {
    protected override noPrompts = true;

    public constructor(key: string) {
        super(key, Data);

        // Força a conclusão imediata do tutorial na criação
        this.setStage(this.stageCount, 0, false, true);
    }

    /**
     * This override calls the `setStage()` in the
     * quest superclass in order to trigger the pointer
     * data.
     */

    public override loaded(): void {
        // Força o tutorial a ficar concluído mesmo após carregar
        this.setStage(this.stageCount, 0, false, true);
    }
}