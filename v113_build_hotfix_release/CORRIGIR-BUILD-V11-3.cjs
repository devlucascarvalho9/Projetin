const fs = require('fs');
const path = require('path');

const root = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
const file = path.join(root, 'packages', 'client', 'src', 'ui', 'warrior-skillbar.ts');

console.log('=============================================');
console.log('Kaetram V11.3 - Hotfix build WarriorSkillbar');
console.log('=============================================');

if (!fs.existsSync(file)) {
  console.error('ERRO: arquivo nao encontrado: ' + file);
  process.exit(1);
}

let s = fs.readFileSync(file, 'utf8');
const backup = file + '.antes-hotfix-build-v11-3';
if (!fs.existsSync(backup)) fs.copyFileSync(file, backup);

let changed = false;
if (s.includes('    private ticker = 0;\n')) {
  s = s.replace('    private ticker = 0;\n', '');
  changed = true;
}
if (s.includes('        this.ticker = window.setInterval(() => this.refreshCooldowns(), 100);')) {
  s = s.replace(
    '        this.ticker = window.setInterval(() => this.refreshCooldowns(), 100);',
    '        window.setInterval(() => this.refreshCooldowns(), 100);'
  );
  changed = true;
}

if (!s.includes('window.setInterval(() => this.refreshCooldowns(), 100);')) {
  console.error('ERRO: formato inesperado de warrior-skillbar.ts. Nada foi alterado.');
  process.exit(1);
}

if (changed) {
  fs.writeFileSync(file, s, 'utf8');
  console.log('[OK] propriedade ticker removida e timer preservado.');
} else {
  console.log('[OK] hotfix ja estava aplicado.');
}
console.log('[OK] backup: ' + path.basename(backup));
console.log('Agora rode: yarn build');
