const fs = require('fs');
const path = require('path');
const root = __dirname;
const statePath = path.join(root, '.v10_5_roadmap_install_state.json');
const backupSuffix = '.antes-v10-5-roadmap';
const p = (rel) => path.join(root, rel);

try {
    if (!fs.existsSync(p('package.json'))) throw new Error('Execute na raiz Kaetram-Open-develop.');
    if (!fs.existsSync(statePath)) throw new Error('Estado de instalacao do V10.5 nao encontrado. Nada foi revertido.');
    const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    const entries = Object.entries(state.files || {});
    for (const [rel, info] of entries.reverse()) {
        const dst = p(rel);
        const backup = `${dst}${backupSuffix}`;
        if (info.existedBefore) {
            if (!fs.existsSync(backup)) throw new Error(`Backup ausente: ${rel}`);
            fs.mkdirSync(path.dirname(dst), { recursive: true });
            fs.copyFileSync(backup, dst);
            console.log(`Restaurado: ${rel}`);
        } else if (fs.existsSync(dst)) {
            fs.rmSync(dst, { force: true });
            console.log(`Removido arquivo novo: ${rel}`);
        }
    }
    for (const rel of ['packages/client/dist', 'packages/server/dist']) {
        const dir = p(rel);
        if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
    }
    fs.renameSync(statePath, `${statePath}.rollback-${Date.now()}`);
    console.log('\nRollback V10.5 concluido. V10.3/V10.4 permanecem intactos.');
    console.log('Rode yarn build e depois yarn start.');
} catch (error) {
    console.error('\nERRO NO ROLLBACK V10.5:');
    console.error(error && error.stack ? error.stack : error);
    process.exit(1);
}
