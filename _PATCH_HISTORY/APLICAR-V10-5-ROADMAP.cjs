const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = __dirname;
const payload = path.join(root, 'V10_5_ROADMAP_PAYLOAD');
const manifestPath = path.join(root, 'V10_5_ROADMAP_FILES.txt');
const statePath = path.join(root, '.v10_5_roadmap_install_state.json');
const backupSuffix = '.antes-v10-5-roadmap';

const p = (rel) => path.join(root, rel);
const hash = (file) => fs.existsSync(file) ? crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex') : null;

function preflight() {
    if (!fs.existsSync(p('package.json'))) throw new Error('Extraia o ZIP na raiz Kaetram-Open-develop e execute novamente.');
    if (!fs.existsSync(payload) || !fs.existsSync(manifestPath)) throw new Error('Payload/manifesto do V10.5 nao encontrado.');

    const kaykitPath = p('packages/client/src/ui/kaykit-character.ts');
    const vfxPath = p('packages/client/src/ui/combat-vfx.ts');
    const collisionPath = p('packages/server/data/map/cidade-inicial-collisions.json');
    if (!fs.existsSync(kaykitPath) || !fs.readFileSync(kaykitPath, 'utf8').includes('spinDirections'))
        throw new Error('Base V10.4 nao detectada: kaykit-character.ts sem a correcao de direcao/giro.');
    if (!fs.existsSync(vfxPath) || !fs.readFileSync(vfxPath, 'utf8').includes('kaetramWhirlA'))
        throw new Error('Base V10.4 nao detectada: combat-vfx.ts nao e o Steelstorm corrigido.');
    if (!fs.existsSync(collisionPath))
        throw new Error('Base V10.3/V10.4 nao detectada: arquivo de colisoes da cidade ausente.');
}

function readManifest() {
    return fs.readFileSync(manifestPath, 'utf8').split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
}

function validate() {
    const itemsPath = p('packages/server/data/items.json');
    const items = JSON.parse(fs.readFileSync(itemsPath, 'utf8'));
    const arpgBases = Object.keys(items).filter((key) => key.startsWith('arpg_'));
    const uniques = Object.keys(items).filter((key) => key.startsWith('unique_'));
    if (arpgBases.length < 24) throw new Error(`Validacao falhou: esperado >=24 bases ARPG, encontrei ${arpgBases.length}.`);
    if (uniques.length < 3) throw new Error(`Validacao falhou: esperado >=3 Uniques, encontrei ${uniques.length}.`);

    const checks = [
        ['packages/server/src/game/arpg/items.ts', 'RARITY_LIMITS'],
        ['packages/server/src/game/arpg/items.ts', 'bestTierForItemLevel'],
        ['packages/server/src/game/arpg/mobs.ts', 'rollEliteProfile'],
        ['packages/server/src/game/entity/character/player/player.ts', 'toggleArpgSupport'],
        ['packages/server/src/game/entity/character/player/player.ts', 'setArpgLootFilter'],
        ['packages/server/src/game/entity/character/player/handler.ts', 'Auto-Sell'],
        ['packages/client/src/systems/smart-autofarm.ts', 'passesLootFilter'],
        ['packages/client/src/ui/warrior-skillbar.ts', 'SUPPORT_NAMES'],
        ['packages/client/src/game.ts', 'Idle / Farm — Loot Filter']
    ];
    for (const [rel, marker] of checks) {
        const file = p(rel);
        if (!fs.existsSync(file) || !fs.readFileSync(file, 'utf8').includes(marker))
            throw new Error(`Validacao falhou em ${rel}: marcador ${marker} ausente.`);
    }

    for (const key of [...arpgBases, ...uniques]) {
        const sprite = p(`packages/client/public/img/sprites/items/${key}.png`);
        if (!fs.existsSync(sprite)) throw new Error(`Sprite ausente: ${key}.png`);
    }
    return { arpgBases: arpgBases.length, uniques: uniques.length };
}

try {
    preflight();
    const files = readManifest();
    const protectedBefore = {
        world: hash(p('packages/server/data/map/world.json')),
        kaykit: hash(p('packages/client/src/ui/kaykit-character.ts')),
        vfx: hash(p('packages/client/src/ui/combat-vfx.ts'))
    };

    let state;
    if (fs.existsSync(statePath)) {
        state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    } else {
        state = { version: 'V10.5-roadmap', installedAt: new Date().toISOString(), files: {} };
        for (const rel of files) {
            const dst = p(rel);
            const existedBefore = fs.existsSync(dst);
            state.files[rel] = { existedBefore };
            if (existedBefore) {
                const backup = `${dst}${backupSuffix}`;
                if (!fs.existsSync(backup)) {
                    fs.mkdirSync(path.dirname(backup), { recursive: true });
                    fs.copyFileSync(dst, backup);
                }
            }
        }
        fs.writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf8');
    }

    for (const rel of files) {
        const src = path.join(payload, rel);
        const dst = p(rel);
        if (!fs.existsSync(src)) throw new Error(`Payload ausente: ${rel}`);
        fs.mkdirSync(path.dirname(dst), { recursive: true });
        fs.copyFileSync(src, dst);
        console.log(`Atualizado: ${rel}`);
    }

    const result = validate();
    const protectedAfter = {
        world: hash(p('packages/server/data/map/world.json')),
        kaykit: hash(p('packages/client/src/ui/kaykit-character.ts')),
        vfx: hash(p('packages/client/src/ui/combat-vfx.ts'))
    };
    if (JSON.stringify(protectedBefore) !== JSON.stringify(protectedAfter))
        throw new Error('Protecao falhou: world/KayKit/Steelstorm mudou durante a instalacao. Use o rollback.');

    for (const rel of ['packages/client/dist', 'packages/server/dist']) {
        const dir = p(rel);
        if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
    }

    console.log('\n=============================================');
    console.log(' V10.5 ROADMAP 1-7 APLICADO COM SUCESSO');
    console.log('=============================================');
    console.log(`Bases ARPG: ${result.arpgBases} | Uniques: ${result.uniques}`);
    console.log('Cidade/KayKit/Steelstorm foram conferidos e NAO foram alterados.');
    console.log('Agora rode: yarn build');
    console.log('Se terminar sem erro: yarn start');
    console.log('Depois: Ctrl+F5 no navegador.');
} catch (error) {
    console.error('\nERRO AO APLICAR V10.5 ROADMAP:');
    console.error(error && error.stack ? error.stack : error);
    process.exit(1);
}
