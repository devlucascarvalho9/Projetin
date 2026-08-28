const fs = require('fs');
const path = require('path');

const root = __dirname;

function read(rel) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) throw new Error(`Arquivo nao encontrado: ${rel}`);
  return fs.readFileSync(p, 'utf8');
}

function write(rel, text) {
  fs.writeFileSync(path.join(root, rel), text, 'utf8');
}

function replaceOnce(text, needle, replacement, label) {
  if (!text.includes(needle)) throw new Error(`Nao consegui localizar o ponto de patch: ${label}`);
  return text.replace(needle, replacement);
}

function patchMap() {
  const rel = 'packages/server/src/game/map/map.ts';
  let text = read(rel);

  const importLine = "import cityInitialCollisions from '../../../data/map/cidade-inicial-collisions.json';";
  if (!text.includes(importLine)) {
    text = replaceOnce(
      text,
      "import mapData from '../../../data/map/world.json';",
      "import mapData from '../../../data/map/world.json';\n" + importLine,
      'map.ts import world.json'
    );
  }

  const property = `    // V10.2: exact-coordinate collisions used by the visual starter city overlay.\n    // Coordinates are used instead of tile IDs because the same tile art is reused elsewhere.\n    private coordinateCollisions = new Set<string>(\n        (cityInitialCollisions as [number, number][]).map(([x, y]) => \`${'${x},${y}'}\`)\n    );`;
  if (!text.includes('private coordinateCollisions = new Set<string>')) {
    text = replaceOnce(
      text,
      '    public collisions: number[] = map.collisions || [];',
      '    public collisions: number[] = map.collisions || [];\n' + property,
      'map.ts collisions property'
    );
  }

  if (!text.includes('this.isCoordinateCollision(x, y)')) {
    text = replaceOnce(
      text,
      '        return hasEntity || this.isCollisionIndex(index);',
      '        return hasEntity || this.isCoordinateCollision(x, y) || this.isCollisionIndex(index);',
      'map.ts isColliding return'
    );
  }

  if (!text.includes('public isCoordinateCollision(x: number, y: number): boolean')) {
    const method = `    /**\n     * Checks whether an exact grid coordinate is occupied by a static city structure.\n     * This keeps houses, water, the fountain and scenery solid without globally\n     * turning reused grass/road tile IDs into collision tiles.\n     */\n    public isCoordinateCollision(x: number, y: number): boolean {\n        return this.coordinateCollisions.has(\`${'${x},${y}'}\`);\n    }\n\n`;
    text = replaceOnce(
      text,
      '    public isObject(data: Tile): boolean {',
      method + '    public isObject(data: Tile): boolean {',
      'map.ts before isObject'
    );
  }

  write(rel, text);
}

function patchRegions() {
  const rel = 'packages/server/src/game/map/regions.ts';
  let text = read(rel);
  const line = '        // V10.2: expose exact-coordinate city collisions to the client pathfinding grid.\n        if (this.map.isCoordinateCollision(x, y)) tile.c = true;\n\n';
  if (!text.includes('if (this.map.isCoordinateCollision(x, y)) tile.c = true;')) {
    const needle = '        });\n\n        return tile;\n    }';
    text = replaceOnce(text, needle, '        });\n\n' + line + '        return tile;\n    }', 'regions.ts buildTile return');
  }
  write(rel, text);
}

try {
  patchMap();
  patchRegions();
  console.log('V10.2 aplicado com sucesso.');
  console.log('Colisoes por coordenada integradas ao servidor e ao pathfinding do cliente.');
} catch (error) {
  console.error('\nERRO AO APLICAR V10.2:');
  console.error(error && error.message ? error.message : error);
  process.exit(1);
}
