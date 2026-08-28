const fs=require('fs'),path=require('path'),crypto=require('crypto');
const root=process.cwd(); const p=r=>path.join(root,r); let fails=0;
const INSTALLED={"packages/client/src/ui/kaykit-character.ts":"b5c2a322d0897525b8deeb332f3b223d29ddede4e38740d1d70e5d7232236f21","packages/client/src/network/connection.ts":"e3d91e9ef0b048f200b1ecb5fca32c23749ac74a7d7cde5d4a2c4e795b8687f4","packages/client/src/ui/dev-panel.ts":"cc39dd73eb173afd829022c269f30ac3cf31402961f4f69e6c22016de4c405c3","packages/client/src/game.ts":"bfdaf5e4f08fbe763241208280c9b82ca6dd78d087e7989679664caaacf64728","packages/client/src/ui/city-ambience.ts":"2637fa2e78e73e0810fcf0aad63ca5c9febe3fde2e930a7aa8aef25d5705cc7f","packages/server/src/controllers/commands.ts":"f8ba301b1f9853c971b1fb5677b82d45358810d57c48b7d4050216e1d35df8f5","packages/server/src/game/entity/character/player/player.ts":"b4d417b0c3fc694b7a3b3444c4413a47f85097ed57c93f45c27dedfc38447c68","packages/server/src/game/entity/character/player/skills.ts":"f0d990aad3c9655cae4d0f460092867d02678761d4761fae0bfcf9901616bfd4","packages/server/src/game/entity/character/mob/mob.ts":"3448dda0a845c065cf0c4b478390922ecafaab4d8740816ced680b9ed0690c11","packages/server/data/map/world.json":"a66f421e4720b327ca28b51d7d79bcbc2b6b8655c5fa161cf142760597c55802","packages/client/data/maps/map.json":"59ee3a3b8440af3683b5257e459b8fdd9e8a6f2eb3a720bea3e6a42be47e465f","packages/server/data/map/cidade-ilustrada-v112-collisions.json":"713d1d90fd9fa6797e14340c68786f308c7a103c74f85d732911f537092af634"};
const ok=(name,cond)=>{console.log((cond?'[OK]   ':'[ERRO] ')+name);if(!cond)fails++;};
const hash=r=>crypto.createHash('sha256').update(fs.readFileSync(p(r))).digest('hex');
const read=r=>fs.readFileSync(p(r),'utf8'); const json=r=>JSON.parse(read(r).replace(/^\uFEFF/,''));
ok('Marker V11.2',fs.existsSync(p('V11_2_INSTALADO.json')));
for(const [rel,h] of Object.entries(INSTALLED)) ok('Arquivo '+rel,fs.existsSync(p(rel))&&hash(rel)===h);
try{
 const world=json('packages/server/data/map/world.json'); const coords=json('packages/server/data/map/cidade-ilustrada-v112-collisions.json');
 ok('Cidade ilustrada: 782 colisoes',Array.isArray(coords)&&coords.length===782);
 const W=world.width; const has14=(v)=>v===14||(Array.isArray(v)&&v.includes(14));
 ok('Cidade ilustrada: todas as colisoes ativas',coords.every(([x,y])=>has14(world.data[y*W+x])));
 ok('Cidade ilustrada em area vazia reservada',coords.every(([x,y])=>x>=180&&x<=225&&y>=1056&&y<=1089));
 ok('Cidade estruturada V11.1 preservada',Array.isArray(world.areas?.cidadeEstruturada)&&world.areas.cidadeEstruturada[0]?.x===48&&world.areas.cidadeEstruturada[0]?.y===1056);
 const kk=read('packages/client/src/ui/kaykit-character.ts');
 ok('KayKit 1.7x',kk.includes('const size = 1.7 *'));
 ok('KayKit horizontal corrigido',kk.includes("direction === 'east' ? 'west'"));
 const conn=read('packages/client/src/network/connection.ts'); ok('Ataque envia posicao do alvo',conn.includes('targetX: Number(target.x || 0)')&&conn.includes('targetY: Number(target.y || 0)'));
 const cmd=read('packages/server/src/controllers/commands.ts');
 ok('/giveitem usa inventario',cmd.includes('this.player.inventory.add(created)'));
 ok('/supportlist corrigido',cmd.includes("case 'supportlist'")&&cmd.includes('SUPPORTS DISPONIVEIS'));
 ok('Drops low-level ativos',cmd.length>0&&read('packages/server/src/game/entity/character/mob/mob.ts').includes('earlyGearBonus'));
 const panel=read('packages/client/src/ui/dev-panel.ts'); ok('Painel DEV completo/arrastavel',panel.includes('data-drag')&&panel.includes("this.row('AGI'")&&panel.includes("this.row('EVA / DEF'")&&panel.includes("this.row('CRIT %'"));
 const pl=read('packages/server/src/game/entity/character/player/player.ts'); const skills=read('packages/server/src/game/entity/character/player/skills.ts');
 ok('HP DEV maximo real',pl.includes('debugMaxHitPoints')&&skills.includes('debugMaxHitPoints > 0'));
}catch(e){console.error(e);fails++;}
console.log(''); if(fails){console.error('V11.2: '+fails+' teste(s) falharam. NAO rode yarn build ainda.');process.exit(1);} console.log('V11.2: TODOS OS TESTES [OK]. Pode rodar yarn build.');
