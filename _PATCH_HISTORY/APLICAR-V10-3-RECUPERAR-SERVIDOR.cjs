const fs = require('fs');
const path = require('path');

const root = __dirname;
function p(rel) { return path.join(root, rel); }
function read(rel) {
  if (!fs.existsSync(p(rel))) throw new Error(`Arquivo nao encontrado: ${rel}`);
  return fs.readFileSync(p(rel), 'utf8');
}
function write(rel, text) { fs.writeFileSync(p(rel), text, 'utf8'); }
function backup(rel) {
  const src = p(rel);
  if (!fs.existsSync(src)) return;
  const backupPath = `${src}.antes-v10-3`;
  if (!fs.existsSync(backupPath)) fs.copyFileSync(src, backupPath);
}

function removeV102CoreHooks() {
  const mapRel = 'packages/server/src/game/map/map.ts';
  const regionsRel = 'packages/server/src/game/map/regions.ts';
  backup(mapRel);
  backup(regionsRel);

  let map = read(mapRel);
  map = map.replace("\nimport cityInitialCollisions from '../../../data/map/cidade-inicial-collisions.json';", '');
  map = map.replace(/\n    \/\/ V10\.2: exact-coordinate collisions used by the visual starter city overlay\.\n    \/\/ Coordinates are used instead of tile IDs because the same tile art is reused elsewhere\.\n    private coordinateCollisions = new Set<string>\(\n        \(cityInitialCollisions as \[number, number\]\[\]\)\.map\(\(\[x, y\]\) => `\$\{x\},\$\{y\}`\)\n    \);/, '');
  map = map.replace(
    '        return hasEntity || this.isCoordinateCollision(x, y) || this.isCollisionIndex(index);',
    '        return hasEntity || this.isCollisionIndex(index);'
  );
  map = map.replace(/\n    \/\*\*\n     \* Checks whether an exact grid coordinate is occupied by a static city structure\.\n     \* This keeps houses, water, the fountain and scenery solid without globally\n     \* turning reused grass\/road tile IDs into collision tiles\.\n     \*\/\n    public isCoordinateCollision\(x: number, y: number\): boolean \{\n        return this\.coordinateCollisions\.has\(`\$\{x\},\$\{y\}`\);\n    \}\n/, '');
  write(mapRel, map);

  let regions = read(regionsRel);
  regions = regions.replace(
    '\n        // V10.2: expose exact-coordinate city collisions to the client pathfinding grid.\n        if (this.map.isCoordinateCollision(x, y)) tile.c = true;\n',
    ''
  );
  write(regionsRel, regions);
}

function applyNativeWorldCollisions() {
  const worldRel = 'packages/server/data/map/world.json';
  const coordsRel = 'packages/server/data/map/cidade-inicial-collisions.json';
  backup(worldRel);

  const world = JSON.parse(read(worldRel));
  const coords = JSON.parse(read(coordsRel));
  if (!Number.isInteger(world.width) || !Array.isArray(world.data) || !Array.isArray(world.collisions))
    throw new Error('world.json nao possui o formato esperado.');
  if (!Array.isArray(coords) || !coords.length) throw new Error('Lista de colisoes da cidade esta vazia.');

  // Reuse a collision tile already native to this exact world. The city PNG is fully opaque
  // and rendered over the underlying world, so this tile only supplies collision semantics.
  const collisionTile = world.collisions.find((id) => Number.isInteger(id));
  if (!Number.isInteger(collisionTile)) throw new Error('Nao encontrei um tile de colisao nativo no world.json.');

  let changed = 0;
  for (const entry of coords) {
    if (!Array.isArray(entry) || entry.length < 2) continue;
    const x = Number(entry[0]), y = Number(entry[1]);
    if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x >= world.width) continue;
    const index = y * world.width + x;
    const current = world.data[index];

    if (Array.isArray(current)) {
      if (!current.some((id) => world.collisions.includes(id))) {
        current.push(collisionTile);
        changed++;
      }
    } else if (typeof current === 'number' && current > 0) {
      if (!world.collisions.includes(current)) {
        world.data[index] = [current, collisionTile];
        changed++;
      }
    } else {
      world.data[index] = collisionTile;
      changed++;
    }
  }

  write(worldRel, JSON.stringify(world));
  console.log(`Colisoes nativas da cidade prontas. Coordenadas novas/ajustadas: ${changed}.`);
  console.log(`Tile de colisao nativo reutilizado: ${collisionTile}.`);
}

function cleanBuilds() {
  for (const rel of ['packages/server/dist', 'packages/client/dist']) {
    const target = p(rel);
    if (fs.existsSync(target)) fs.rmSync(target, { recursive: true, force: true });
  }
}

try {
  if (!fs.existsSync(p('package.json'))) throw new Error('Execute este arquivo na raiz Kaetram-Open-develop.');
  removeV102CoreHooks();
  applyNativeWorldCollisions();
  cleanBuilds();
  console.log('');
  console.log('V10.3 aplicado com sucesso.');
  console.log('O patch perigoso do nucleo do mapa V10.2 foi removido.');
  console.log('Agora rode: yarn build');
  console.log('Depois:    yarn start');
} catch (error) {
  console.error('\nERRO V10.3:');
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
}
