const fs = require('fs');
const path = require('path');
function findRoot(start){let c=path.resolve(start);for(let i=0;i<6;i++){if(fs.existsSync(path.join(c,'package.json'))&&fs.existsSync(path.join(c,'packages')))return c;const p=path.dirname(c);if(p===c)break;c=p;}return null;}
const root=findRoot(__dirname); if(!root){console.error('Raiz do Kaetram nao encontrada.');process.exit(1);} const p=(rel)=>path.join(root,rel);
let failures=0; function ok(condition,label){console.log(`${condition?'[OK]':'[FALHA]'} ${label}`);if(!condition)failures++;}
try {
  console.log(`Raiz detectada: ${root}`);
  const items=JSON.parse(fs.readFileSync(p('packages/server/data/items.json'),'utf8'));
  const bases=Object.keys(items).filter((k)=>k.startsWith('arpg_'));
  const uniques=Object.keys(items).filter((k)=>k.startsWith('unique_'));
  ok(bases.length>=24,`24+ bases ARPG (${bases.length})`);
  ok(uniques.length>=3,`3+ Uniques (${uniques.length})`);
  ok(bases.every((k)=>fs.existsSync(p(`packages/client/public/img/sprites/items/${k}.png`))),'Sprites de todas as bases ARPG');
  ok(uniques.every((k)=>fs.existsSync(p(`packages/client/public/img/sprites/items/${k}.png`))),'Sprites de todos os Uniques');
  const marker=(rel,text)=>fs.existsSync(p(rel))&&fs.readFileSync(p(rel),'utf8').includes(text);
  ok(marker('packages/server/src/game/arpg/items.ts','bestTierForItemLevel'),'Item Level + Tiers T1-T5');
  ok(marker('packages/server/src/game/arpg/items.ts','RARITY_LIMITS'),'Normal/Magic/Rare/Unique + limites');
  ok(marker('packages/server/src/game/arpg/mobs.ts','rollEliteProfile'),'Map Tiers + Elite modifiers');
  ok(marker('packages/server/src/game/entity/character/player/player.ts','toggleArpgSupport'),'Active Skills + Supports persistentes');
  ok(marker('packages/server/src/game/entity/character/player/handler.ts','Auto-Sell'),'Auto-Sell server-side');
  ok(marker('packages/client/src/systems/smart-autofarm.ts','passesLootFilter'),'Loot Filter integrado ao AutoFarm');
  ok(marker('packages/client/src/game.ts','Idle / Farm — Loot Filter'),'Painel Idle/Endgame atualizado');
  ok(marker('packages/client/src/ui/kaykit-character.ts','spinDirections'),'V10.4 KayKit preservado');
  ok(marker('packages/client/src/ui/combat-vfx.ts','kaetramWhirlA'),'V10.4 Steelstorm preservado');
  ok(fs.existsSync(p('packages/server/data/map/cidade-inicial-collisions.json')),'Colisoes da cidade V10.3 preservadas');
  console.log(''); if(failures){console.error(`Validacao terminou com ${failures} falha(s).`);process.exit(1);} console.log('VALIDACAO V10.5a CONCLUIDA SEM FALHAS.'); console.log('Agora rode: yarn build');
} catch(error){console.error(error&&error.stack?error.stack:error);process.exit(1);}
