const fs=require('fs'),path=require('path');
function findRoot(start){let cur=path.resolve(start);for(let i=0;i<8;i++){if(fs.existsSync(path.join(cur,'packages','server','data','map','world.json'))&&fs.existsSync(path.join(cur,'packages','client','src','game.ts')))return cur;let p=path.dirname(cur);if(p===cur)break;cur=p;}return '';}
const root=findRoot(__dirname);if(!root){console.error('[ERRO] raiz Kaetram nao encontrada');process.exit(1);}
const p=r=>path.join(root,r);let bad=0;const ok=(name,v)=>{console.log((v?'[OK]   ':'[ERRO] ')+name);if(!v)bad++;};
const marker=JSON.parse(fs.readFileSync(p('patches/state/V11_4_INSTALADO.json'),'utf8'));
const world=JSON.parse(fs.readFileSync(p('packages/server/data/map/world.json'),'utf8'));
const cmds=fs.readFileSync(p('packages/server/src/controllers/commands.ts'),'utf8');
const incoming=fs.readFileSync(p('packages/server/src/game/entity/character/player/incoming.ts'),'utf8');
const game=fs.readFileSync(p('packages/client/src/game.ts'),'utf8');
const amb=fs.readFileSync(p('packages/client/src/ui/city-ambience.ts'),'utf8');
ok('Marker V11.4',marker.version==='11.4');
ok('/cidade 36,766',cmds.includes('teleport(36, 766'));
ok('/amor 45,651',cmds.includes("case 'amor'")&&cmds.includes('teleport(45, 651'));
ok('Love map asset',fs.existsSync(p('packages/client/public/maps/carine-love/map.png')));
ok('Overlay cidade dentro do limite',amb.includes('originY: 736'));
ok('Overlay /amor',amb.includes("image: '/maps/carine-love/map.png'")&&amb.includes('originY: 624'));
ok('Forja index fallback',game.includes('fallbackIndex'));
ok('Forja bypass container somente Essencias',incoming.includes('const essenceRequest ='));
ok('Incoming EssencePreview',incoming.includes('case Opcodes.Enchant.EssencePreview'));
ok('Incoming EssenceApply',incoming.includes('case Opcodes.Enchant.EssenceApply'));
function tile(x,y){return world.data[y*world.width+x];}
ok('Spawn cidade caminhavel',tile(36,766)===marker.walkableTile);
ok('Spawn amor caminhavel',tile(45,651)===marker.walkableTile);
ok('Cidade dentro 1008',766<1008);
ok('Amor dentro 1008',651<1008);
console.log('\nResultado:',bad?bad+' erro(s)':'TUDO OK');
process.exit(bad?1:0);
