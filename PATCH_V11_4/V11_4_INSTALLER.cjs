const fs=require('fs'),path=require('path'),crypto=require('crypto');
const VERSION='11.4';
const patchDir=__dirname;
function findRoot(start){
  let cur=path.resolve(start);
  for(let i=0;i<8;i++){
    if(fs.existsSync(path.join(cur,'packages','server','data','map','world.json')) &&
       fs.existsSync(path.join(cur,'packages','client','src','game.ts'))) return cur;
    const parent=path.dirname(cur); if(parent===cur) break; cur=parent;
  }
  return '';
}
const root=findRoot(patchDir);
const die=m=>{console.error('\nERRO V11.4: '+m+'\n');process.exit(1);};
if(!root) die('Nao encontrei a raiz do Kaetram acima da pasta PATCH_V11_4.');
const p=r=>path.join(root,r), pp=r=>path.join(patchDir,'payload',r);
const sha=r=>crypto.createHash('sha256').update(fs.readFileSync(p(r))).digest('hex');
const EXPECTED={"packages/server/src/controllers/commands.ts": "f9151b993700ba3be254e5c262d3a720e000ff2b584b1d78ddf56251af60b1ed", "packages/client/src/game.ts": "bfdaf5e4f08fbe763241208280c9b82ca6dd78d087e7989679664caaacf64728", "packages/client/src/ui/city-ambience.ts": "2637fa2e78e73e0810fcf0aad63ca5c9febe3fde2e930a7aa8aef25d5705cc7f"};
const REPLACE=["packages/server/src/controllers/commands.ts", "packages/client/src/game.ts", "packages/client/src/ui/city-ambience.ts", "packages/client/public/maps/carine-love/map.png", "packages/server/data/map/v114-city-region.json", "packages/server/data/map/v114-love-region.json"];
const WORLD='packages/server/data/map/world.json';
const INCOMING='packages/server/src/game/entity/character/player/incoming.ts';
const OPCODES='packages/common/network/opcodes.ts';
const ENCHANT_PACKET='packages/common/network/impl/enchant.ts';
const MARKER='patches/state/V11_4_INSTALADO.json';
const STATE='patches/state/v11_4.json';

console.log('==========================================================');
console.log('Kaetram V11.4 - Cidade valida + Forja + /amor');
console.log('Raiz:',root);
console.log('==========================================================');

if(fs.existsSync(p(MARKER))) die('V11.4 ja esta instalado. Use TESTAR-V11-4 ou ROLLBACK-V11-4.');
for(const [rel,h] of Object.entries(EXPECTED)){
  if(!fs.existsSync(p(rel))) die('Arquivo base ausente: '+rel);
  const got=sha(rel);
  if(got!==h) die('Arquivo base diferente do V11.3 validado: '+rel+'\nEsperado '+h+'\nAtual    '+got+'\nNao vou sobrescrever suas alteracoes.');
}
for(const rel of [WORLD,INCOMING,OPCODES,ENCHANT_PACKET]) if(!fs.existsSync(p(rel))) die('Arquivo necessario ausente: '+rel);

const affected=[...REPLACE,WORLD,INCOMING,OPCODES,ENCHANT_PACKET,MARKER];
const stamp=new Date().toISOString().replace(/[:.]/g,'-');
const backupRel='backups/V11_4/'+stamp, backupRoot=p(backupRel), existed={};
fs.mkdirSync(backupRoot,{recursive:true});
for(const rel of affected){
  const src=p(rel); existed[rel]=fs.existsSync(src);
  if(!existed[rel]) continue;
  const dst=path.join(backupRoot,rel); fs.mkdirSync(path.dirname(dst),{recursive:true}); fs.copyFileSync(src,dst);
}

function copyPayload(rel){
  const src=pp(rel); if(!fs.existsSync(src)) die('Payload ausente: '+rel);
  const dst=p(rel); fs.mkdirSync(path.dirname(dst),{recursive:true}); fs.copyFileSync(src,dst);
}
function patchText(rel, fn){
  const file=p(rel), before=fs.readFileSync(file,'utf8'), after=fn(before);
  if(after===before) return false;
  fs.writeFileSync(file,after); return true;
}

try {
  for(const rel of REPLACE) copyPayload(rel);

  // Ensure the Essence Forge protocol exists on this branch.
  patchText(OPCODES, s=>{
    if(s.includes('EssencePreview')) return s;
    const a=`export enum Enchant {\n    Select,\n    Confirm\n}`;
    const b=`export enum Enchant {\n    Select,\n    Confirm,\n    EssencePreview,\n    EssenceApply,\n    EssenceCancel\n}`;
    if(!s.includes(a)) die('Nao consegui localizar enum Enchant em opcodes.ts.');
    return s.replace(a,b);
  });

  patchText(ENCHANT_PACKET, s=>{
    if(s.includes('previewId?:')) return s;
    const marker='    isShard?: boolean;\n';
    if(!s.includes(marker)) die('Nao consegui localizar EnchantPacketData.');
    return s.replace(marker, marker+'    shardIndex?: number;\n    essenceIndex?: number;\n    previewId?: string;\n    message?: string;\n    affixes?: unknown[];\n');
  });

  // The custom ARPG forge is not a native nearby container, so only Essence requests bypass canAccessContainer.
  patchText(INCOMING, s=>{
    if(!s.includes('private handleEnchant(packet: EnchantPacket): void')) die('handleEnchant nao encontrado.');
    let out=s;
    const oldGuard=`        if (!this.player.canAccessContainer) return this.player.notify('misc:CANNOT_DO_THAT');`;
    if(out.includes(oldGuard) && !out.includes('const essenceRequest =')) {
      const guard=`        const essenceRequest =\n            packet.opcode === Opcodes.Enchant.EssencePreview ||\n            packet.opcode === Opcodes.Enchant.EssenceApply ||\n            packet.opcode === Opcodes.Enchant.EssenceCancel;\n\n        if (!this.player.canAccessContainer && !essenceRequest)\n            return this.player.notify('misc:CANNOT_DO_THAT');`;
      out=out.replace(oldGuard,guard);
    }
    if(!out.includes('case Opcodes.Enchant.EssencePreview')) {
      const confirm=`            case Opcodes.Enchant.Confirm: {\n                return this.world.enchanter.enchant(this.player, packet.index!, packet.shardIndex!);\n            }\n`;
      if(!out.includes(confirm)) die('Case Enchant.Confirm nao encontrado.');
      const extra=confirm+`\n            case Opcodes.Enchant.EssencePreview: {\n                return this.world.enchanter.previewEssence(this.player, packet.index!, packet.shardIndex!);\n            }\n\n            case Opcodes.Enchant.EssenceApply: {\n                const previewId = (packet as EnchantPacket & { previewId?: string }).previewId || '';\n                return this.world.enchanter.applyEssence(this.player, previewId);\n            }\n\n            case Opcodes.Enchant.EssenceCancel: {\n                const previewId = (packet as EnchantPacket & { previewId?: string }).previewId || '';\n                return this.world.enchanter.cancelEssence(this.player, previewId);\n            }\n`;
      out=out.replace(confirm,extra);
    }
    return out;
  });

  // ---- Clean in-bounds zones. No old terrain/obstacles remain under either artwork. ----
  let world=JSON.parse(fs.readFileSync(p(WORLD),'utf8').replace(/^\uFEFF/,''));
  if(world.width!==1152 || world.height<1008 || world.tileSize!==16 || !Array.isArray(world.data) || !Array.isArray(world.collisions))
    die('world.json fora do formato esperado.');
  const needed=world.width*world.height;
  if(world.data.length<needed) world.data.push(...new Array(needed-world.data.length).fill(0));
  if(world.data.length>needed) world.data=world.data.slice(0,needed);

  const collisionTile=world.collisions.find(v=>Number.isInteger(v));
  const walkableTile=world.data.find(v=>Number.isInteger(v)&&v>0&&!world.collisions.includes(v));
  if(!Number.isInteger(collisionTile)||!Number.isInteger(walkableTile)) die('Nao encontrei tiles nativos de colisao/piso.');

  const city=JSON.parse(fs.readFileSync(pp('packages/server/data/map/v114-city-region.json'),'utf8'));
  const love=JSON.parse(fs.readFileSync(pp('packages/server/data/map/v114-love-region.json'),'utf8'));
  const regions=[city,love];

  for(const r of regions){
    const [ox,oy]=r.origin;
    for(let y=oy;y<oy+r.height;y++) for(let x=ox;x<ox+r.width;x++) world.data[y*world.width+x]=walkableTile;
    for(const [x,y] of r.collisions) world.data[y*world.width+x]=collisionTile;
    // Clear any old server entity/plateau metadata from the deliberately reserved footprint.
    if(world.entities) for(const key of Object.keys(world.entities)){
      const idx=Number(key), x=idx%world.width, y=Math.floor(idx/world.width);
      if(x>=ox&&x<ox+r.width&&y>=oy&&y<oy+r.height) delete world.entities[key];
    }
    if(world.plateau) for(const key of Object.keys(world.plateau)){
      const idx=Number(key), x=idx%world.width, y=Math.floor(idx/world.width);
      if(x>=ox&&x<ox+r.width&&y>=oy&&y<oy+r.height) delete world.plateau[key];
    }
    // Force a safe 5x5 spawn around each destination.
    const [sx,sy]=r.spawn;
    for(let y=sy-2;y<=sy+2;y++) for(let x=sx-2;x<=sx+2;x++) world.data[y*world.width+x]=walkableTile;
  }
  world.version=Date.now();
  fs.writeFileSync(p(WORLD),JSON.stringify(world));

  fs.mkdirSync(path.dirname(p(MARKER)),{recursive:true});
  fs.writeFileSync(p(MARKER),JSON.stringify({
    version:VERSION,installedAt:new Date().toISOString(),
    citySpawn:[36,766],loveSpawn:[45,651],
    cityRegion:[16,736,46,34],loveRegion:[0,624,91,68],
    cityCollisions:city.collisions.length,loveCollisions:love.collisions.length,
    walkableTile,collisionTile,
    fixes:['cidade-runtime-valid','essence-forge-server-access','forge-index-fallback','amor-clean-map']
  },null,2));
  fs.mkdirSync(path.dirname(p(STATE)),{recursive:true});
  fs.writeFileSync(p(STATE),JSON.stringify({version:VERSION,backupRel,affected,existed},null,2));

  console.log('\n[OK] V11.4 instalado.');
  console.log('[OK] /cidade -> 36,766');
  console.log('[OK] /amor   -> 45,651');
  console.log('[OK] Forja de Essencias liberada para o protocolo ARPG.');
  console.log('[OK] Areas cidade/amor limpas antes de receber piso e colisoes proprias.');
} catch(e) {
  console.error('\nFALHA durante V11.4:',e.stack||e);
  console.error('Use ROLLBACK-V11-4.cmd se algum arquivo chegou a ser alterado.');
  process.exit(1);
}
