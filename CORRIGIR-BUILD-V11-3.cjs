const fs = require('fs');
const path = require('path');

console.log('=============================================');
console.log('Kaetram V11.3 - Hotfix build WarriorSkillbar');
console.log('=============================================');

function findRoot(start) {
  let dir = path.resolve(start);
  for (let i = 0; i < 8; i++) {
    const candidate = path.join(dir, 'packages', 'client', 'src', 'ui', 'warrior-skillbar.ts');
    if (fs.existsSync(candidate)) return { root: dir, file: candidate };
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

const found = findRoot(__dirname) || findRoot(process.cwd());
if (!found) {
  console.error('ERRO: nao encontrei packages\\client\\src\\ui\\warrior-skillbar.ts.');
  console.error('Coloque esta pasta dentro de Kaetram-Open-develop (ou execute pela raiz do jogo).');
  process.exit(1);
}

const { root, file } = found;
console.log('[OK] Raiz detectada: ' + root);

let s = fs.readFileSync(file, 'utf8');
const backup = file + '.antes-hotfix-build-v11-3';
if (!fs.existsSync(backup)) fs.copyFileSync(file, backup);

let changed = false;
s = s.replace(/^[ \t]*private ticker = 0;\r?\n/m, () => { changed = true; return ''; });
s = s.replace(/this\.ticker\s*=\s*window\.setInterval\(\(\) => this\.refreshCooldowns\(\),\s*100\);/g, () => {
  changed = true;
  return 'window.setInterval(() => this.refreshCooldowns(), 100);';
});

if (!/window\.setInterval\(\(\) => this\.refreshCooldowns\(\),\s*100\);/.test(s)) {
  console.error('ERRO: formato inesperado de warrior-skillbar.ts. Nada foi alterado.');
  process.exit(1);
}

if (changed) {
  fs.writeFileSync(file, s, 'utf8');
  console.log('[OK] propriedade ticker removida e timer preservado.');
} else {
  console.log('[OK] hotfix ja estava aplicado.');
}
console.log('[OK] backup: ' + backup);
console.log('Agora volte para a raiz e rode: yarn build');
