
const fs = require('fs');
const path = require('path');

const root = path.resolve(process.argv[2] || process.cwd());
const dataDir = path.join(root, 'packages', 'server', 'data');
const itemsPath = path.join(dataDir, 'items.json');
const mobsPath = path.join(dataDir, 'mobs.json');
const tablesPath = path.join(dataDir, 'tables.json');
const spritesDir = path.join(root, 'packages', 'client', 'public', 'img', 'sprites', 'items');

function fail(message) {
  console.error(`[EssenceDrops] ${message}`);
  process.exit(1);
}

for (const file of [itemsPath, mobsPath, tablesPath]) {
  if (!fs.existsSync(file)) fail(`Arquivo não encontrado: ${file}`);
}
if (!fs.existsSync(spritesDir)) fail(`Pasta de sprites não encontrada: ${spritesDir}`);

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 4) + '\n', 'utf8');
}

function backupOnce(file) {
  const backup = `${file}.bak-essence-v1`;
  if (!fs.existsSync(backup)) fs.copyFileSync(file, backup);
}

function copySprite(from, to) {
  const src = path.join(spritesDir, `${from}.png`);
  const dst = path.join(spritesDir, `${to}.png`);
  if (!fs.existsSync(src)) {
    console.warn(`[EssenceDrops] Sprite base não encontrado: ${src}. Usando undefined.png se existir.`);
    const fallback = path.join(spritesDir, 'undefined.png');
    if (!fs.existsSync(fallback)) return;
    fs.copyFileSync(fallback, dst);
    return;
  }
  fs.copyFileSync(src, dst);
}

backupOnce(itemsPath);
backupOnce(mobsPath);
backupOnce(tablesPath);

const items = readJson(itemsPath);
const mobs = readJson(mobsPath);
const tables = readJson(tablesPath);

const emptyStats = { crush: 0, slash: 0, stab: 0, archery: 0, magic: 0 };
const emptyBonuses = { accuracy: 0, strength: 0, archery: 0, magic: 0 };

const newItems = {
  essencebruta: {
    type: 'object',
    name: 'Essência Bruta',
    stackable: true,
    maxStackSize: 99,
    price: 900,
    description:
      'Material de teste da Forja de Essências. Foco: dano físico, força e impacto. Na próxima etapa será usada para rolar atributos de armas.'
  },
  essencesangrenta: {
    type: 'object',
    name: 'Essência Sangrenta',
    stackable: true,
    maxStackSize: 99,
    price: 1200,
    description:
      'Material de teste da Forja de Essências. Foco: sangramento, ferimentos e dano físico contínuo.'
  },
  essenceafiada: {
    type: 'object',
    name: 'Essência Afiada',
    stackable: true,
    maxStackSize: 99,
    price: 1200,
    description:
      'Material de teste da Forja de Essências. Foco: crítico, precisão e velocidade de ataque.'
  },
  essenceguardia: {
    type: 'object',
    name: 'Essência Guardiã',
    stackable: true,
    maxStackSize: 99,
    price: 1300,
    description:
      'Material de teste da Forja de Essências. Foco: vida, armadura, bloqueio e redução de dano.'
  },
  essencerunica: {
    type: 'object',
    name: 'Essência Rúnica',
    stackable: true,
    maxStackSize: 99,
    price: 1600,
    description:
      'Material de teste da Forja de Essências. Foco: dano elemental, conversão física e efeitos híbridos.'
  },
  testforgeblade: {
    type: 'weapon',
    name: 'Lâmina Serrilhada de Teste',
    weaponType: 'sword',
    price: 250,
    skill: 'strength',
    level: 1,
    attackStats: { crush: 1, slash: 7, stab: 5, archery: 0, magic: 0 },
    defenseStats: { crush: 1, slash: 2, stab: 1, archery: 0, magic: 0 },
    bonuses: { accuracy: 4, strength: 3, archery: 0, magic: 0 },
    description:
      'Item de teste para rolagem de atributos. Status atuais: +7 Corte, +5 Perfuração, +4 Precisão, +3 Força.'
  },
  testforgegreataxe: {
    type: 'weapon',
    name: 'Machado Voraz de Teste',
    weaponType: 'axe',
    price: 320,
    skill: 'strength',
    level: 1,
    attackStats: { crush: 8, slash: 9, stab: 1, archery: 0, magic: 0 },
    defenseStats: { crush: 3, slash: 2, stab: 1, archery: 0, magic: 0 },
    bonuses: { accuracy: 2, strength: 6, archery: 0, magic: 0 },
    description:
      'Item de teste para rolagem de atributos. Status atuais: +9 Corte, +8 Impacto, +6 Força, +2 Precisão.'
  },
  testforgespear: {
    type: 'weapon',
    name: 'Lança de Caça de Teste',
    weaponType: 'spear',
    price: 280,
    skill: 'accuracy',
    level: 1,
    attackStats: { crush: 2, slash: 4, stab: 9, archery: 0, magic: 0 },
    defenseStats: { crush: 1, slash: 1, stab: 3, archery: 0, magic: 0 },
    bonuses: { accuracy: 6, strength: 2, archery: 0, magic: 0 },
    description:
      'Item de teste para rolagem de atributos. Status atuais: +9 Perfuração, +6 Precisão, +2 Força.'
  },
  testforgechest: {
    type: 'chestplate',
    name: 'Couraça Reforjada de Teste',
    price: 300,
    skill: 'defense',
    level: 1,
    attackStats: { ...emptyStats },
    defenseStats: { crush: 7, slash: 8, stab: 6, archery: 2, magic: 0 },
    bonuses: { accuracy: 0, strength: 2, archery: 0, magic: 0 },
    description:
      'Item de teste para rolagem de atributos. Status atuais: +8 Defesa contra Corte, +7 Impacto, +6 Perfuração, +2 Força.'
  },
  testforgeshield: {
    type: 'shield',
    name: 'Escudo Bastião de Teste',
    price: 280,
    skill: 'defense',
    level: 1,
    defenseStats: { crush: 8, slash: 7, stab: 8, archery: 4, magic: 1 },
    bonuses: { accuracy: 1, strength: 3, archery: 0, magic: 0 },
    description:
      'Item de teste para rolagem de atributos. Status atuais: +8 Bloqueio físico, +4 Defesa contra projéteis, +3 Força.'
  },
  testforgering: {
    type: 'ring',
    name: 'Anel Instável de Teste',
    price: 350,
    skill: 'defense',
    level: 1,
    attackStats: { crush: 1, slash: 1, stab: 1, archery: 0, magic: 1 },
    defenseStats: { crush: 1, slash: 1, stab: 1, archery: 1, magic: 1 },
    bonuses: { accuracy: 3, strength: 3, archery: 0, magic: 1 },
    description:
      'Item de teste para rolagem de atributos. Status atuais: +3 Precisão, +3 Força, +1 Magia, pequenas defesas.'
  },
  testforgeboots: {
    type: 'boots',
    name: 'Botas Velozes de Teste',
    price: 260,
    skill: 'defense',
    level: 1,
    movementModifier: 1,
    defenseStats: { crush: 3, slash: 3, stab: 4, archery: 2, magic: 0 },
    bonuses: { accuracy: 2, strength: 1, archery: 0, magic: 0 },
    description:
      'Item de teste para rolagem de atributos. Status atuais: +Movimento, +4 Perfuração, +2 Precisão, +1 Força.'
  }
};

Object.assign(items, newItems);

const spriteCopies = {
  essencebruta: 'shardt1',
  essencesangrenta: 'shardt2',
  essenceafiada: 'shardt3',
  essenceguardia: 'shardt4',
  essencerunica: 'shardt5',
  testforgeblade: 'bladeofdarkness',
  testforgegreataxe: 'twilightgreataxe',
  testforgespear: 'ironspear',
  testforgechest: 'ironchestplate',
  testforgeshield: 'goldshield',
  testforgering: 'bronzering',
  testforgeboots: 'swiftboots'
};

for (const [to, from] of Object.entries(spriteCopies)) copySprite(from, to);

tables.essenceforge_test = {
  drops: [
    { key: 'essencebruta', chance: 70000 },
    { key: 'essencesangrenta', chance: 65000 },
    { key: 'essenceafiada', chance: 65000 },
    { key: 'essenceguardia', chance: 60000 },
    { key: 'essencerunica', chance: 50000 },
    { key: 'testforgeblade', chance: 55000 },
    { key: 'testforgegreataxe', chance: 50000 },
    { key: 'testforgespear', chance: 50000 },
    { key: 'testforgechest', chance: 45000 },
    { key: 'testforgeshield', chance: 45000 },
    { key: 'testforgering', chance: 40000 },
    { key: 'testforgeboots', chance: 40000 }
  ]
};

const testMobs = ['rat', 'bat', 'crab', 'goblin', 'skeleton', 'ogre'];
for (const key of testMobs) {
  if (!mobs[key]) {
    console.warn(`[EssenceDrops] Mob não encontrado: ${key}`);
    continue;
  }
  if (!Array.isArray(mobs[key].dropTables)) mobs[key].dropTables = [];
  if (!mobs[key].dropTables.includes('essenceforge_test')) mobs[key].dropTables.push('essenceforge_test');
}

writeJson(itemsPath, items);
writeJson(tablesPath, tables);
writeJson(mobsPath, mobs);

console.log('[EssenceDrops] Itens adicionados:', Object.keys(newItems).join(', '));
console.log('[EssenceDrops] Drop table adicionada: essenceforge_test');
console.log('[EssenceDrops] Mobs atualizados:', testMobs.join(', '));
console.log('[EssenceDrops] Backups criados com sufixo .bak-essence-v1');
