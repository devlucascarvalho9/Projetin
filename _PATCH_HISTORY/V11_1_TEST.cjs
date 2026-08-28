const fs=require('fs'),path=require('path');
const root=process.cwd(); let fail=0; const ok=(cond,msg)=>{console.log(`${cond?'[OK]':'[ERRO]'} ${msg}`);if(!cond)fail++};
const readJson=(r)=>JSON.parse(fs.readFileSync(path.join(root,r),'utf8'));
try{
 const w=readJson('packages/server/data/map/world.json'),c=readJson('packages/client/data/maps/map.json'),co=readJson('CIDADE_ESTRUTURADA_COORDENADAS.json');
 ok(w.width===1152&&w.height===1152,'world 1152x1152 (regiao nova anexada)');
 ok(c.height===1152,'client map acompanha a nova altura');
 ok(w.data.length===w.width*w.height,'world.data possui tamanho exato');
 const ts=(c.tilesets||[]).find(t=>t.relativePath==='cidade-inicial-estruturada.png'); ok(!!ts,'tileset exclusivo da Cidade Estruturada presente');
 const first=co.tilesetFirstGid,coll=new Set(w.collisions); const vals=(x,y)=>{const v=w.data[y*w.width+x];return Array.isArray(v)?v:[v]};
 ok(!vals(co.x,co.y).some(v=>coll.has(v)),'spawn da cidade e caminhavel');
 let legacy=0,empty=0; for(let y=co.originY;y<co.originY+co.height;y++)for(let x=co.originX;x<co.originX+co.width;x++){const vs=vals(x,y);if(vs.some(v=>v&&v<first))legacy++;if(!vs.some(Boolean))empty++;}
 ok(legacy===0,'ZERO tiles/obstaculos antigos sob a nova cidade'); ok(empty===0,'toda a area visual da cidade possui terreno novo');
 let barrier=0;for(let y=1008;y<1056;y++)for(let x=0;x<w.width;x++){const vs=vals(x,y);if(vs.length===1&&vs[0]===first+63&&coll.has(first+63))barrier++;}
 ok(barrier===w.width*48,'48 linhas isolam a cidade do mundo antigo');
 const commands=fs.readFileSync(path.join(root,'packages/server/src/controllers/commands.ts'),'utf8');
 ok(commands.includes('this.player.teleport(88, 1081'),'teleporte /cidade aponta para a cidade nova'); ok(commands.includes("case 'giveitem'"),'comando /giveitem instalado'); ok(commands.includes("case 'devset'"),'comando /devset instalado');
 const game=fs.readFileSync(path.join(root,'packages/client/src/game.ts'),'utf8'); ok(game.includes("import DevPanel from './ui/dev-panel'"),'painel DEV integrado ao cliente');
 ok(fs.existsSync(path.join(root,'packages/client/src/ui/dev-panel.ts')),'arquivo do painel DEV presente');
 ok(commands.includes("case 'dungeon'"),'dungeon V11.0 preservada'); ok(game.includes('DungeonAmbience'),'ambiente da dungeon preservado'); const af=fs.readFileSync(path.join(root,'packages/client/src/systems/smart-autofarm.ts'),'utf8'); ok(af.includes('EasyStar')&&fs.existsSync(path.join(root,'packages/client/public/vendor/easystar-0.4.4.min.js')),'EasyStar V10.9 preservado no AutoFarm');
}catch(e){console.error(e);fail++;}
console.log(fail?`\n${fail} verificacao(oes) falharam.`:'\nV11.1 validada com sucesso.');process.exit(fail?1:0);
