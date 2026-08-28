import type Game from '../game';

/**
 * Native-map recovery build.
 * Love/cave art is rendered by the normal Kaetram tile renderer from map.json/world.json.
 * Keeping this class as a no-op prevents legacy V11 overlay patches from drawing a second
 * full-size image over the native maps after a future client rebuild.
 */
export default class CityAmbience {
    public constructor(private game: Game) {
        void this.game;
    }

    public async mount(): Promise<void> {
        // Intentionally empty: audited maps are native tiles.
    }
}
