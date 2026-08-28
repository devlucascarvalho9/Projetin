const fs = require('fs');
const path = require('path');

const root = __dirname;
const payload = path.join(root, 'V10_4_PAYLOAD');
const files = [
  'packages/client/src/ui/kaykit-character.ts',
  'packages/client/src/ui/combat-vfx.ts',
  'packages/client/public/models/kaykit/barbarian_east.png',
  'packages/client/public/models/kaykit/barbarian_west.png'
];

function target(rel) { return path.join(root, rel); }
function source(rel) { return path.join(payload, rel); }

function backup(rel) {
  const dst = target(rel);
  if (!fs.existsSync(dst)) return;
  const bak = `${dst}.antes-v10-4`;
  if (!fs.existsSync(bak)) fs.copyFileSync(dst, bak);
}

try {
  if (!fs.existsSync(path.join(root, 'package.json'))) {
    throw new Error('Extraia o ZIP e execute este arquivo na raiz Kaetram-Open-develop.');
  }

  for (const rel of files) {
    const src = source(rel);
    const dst = target(rel);
    if (!fs.existsSync(src)) throw new Error(`Payload ausente: ${rel}`);
    backup(rel);
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    fs.copyFileSync(src, dst);
    console.log(`Atualizado: ${rel}`);
  }

  const kaykit = fs.readFileSync(target('packages/client/src/ui/kaykit-character.ts'), 'utf8');
  if (!kaykit.includes("spinDirections") || !kaykit.includes("1.4 * Math.max")) {
    throw new Error('Falha ao validar kaykit-character.ts depois da copia.');
  }
  const vfx = fs.readFileSync(target('packages/client/src/ui/combat-vfx.ts'), 'utf8');
  if (!vfx.includes('kaetramWhirlA') || !vfx.includes("colour: '#9bdcf4'")) {
    throw new Error('Falha ao validar combat-vfx.ts depois da copia.');
  }

  const clientDist = target('packages/client/dist');
  if (fs.existsSync(clientDist)) fs.rmSync(clientDist, { recursive: true, force: true });

  console.log('');
  console.log('V10.4 aplicado com sucesso.');
  console.log('- direita/esquerda corrigidas;');
  console.log('- Steelstorm nao gira mais o PNG inteiro;');
  console.log('- efeito circular foi substituido por arcos de arma mais compactos;');
  console.log('- nenhum arquivo do servidor foi alterado.');
} catch (error) {
  console.error('\nERRO V10.4:');
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
}
