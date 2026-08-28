const fs=require('fs'),path=require('path');
const here=__dirname;
function findRoot(s){let c=path.resolve(s);for(let i=0;i<8;i++){if(fs.existsSync(path.join(c,'packages','server','data','map','world.json'))&&fs.existsSync(path.join(c,'packages','server','src','controllers','commands.ts')))return c;const p=path.dirname(c);if(p===c)break;c=p;}return ''}
const root=findRoot(here); const die=m=>{console.error('\nERRO V11.4C: '+m);process.exit(1)}; if(!root)die('Raiz do Kaetram nao encontrada.');
const p=r=>path.join(root,r), pp=r=>path.join(here,'payload',r);
const CMD='packages/server/src/controllers/commands.ts', AMB='packages/client/src/ui/city-ambience.ts', WORLD='packages/server/data/map/world.json';
for(const r of [CMD,AMB,WORLD]) if(!fs.existsSync(p(r))) die('Arquivo ausente: '+r);
const marker=p('patches/state/V11_4C_INSTALADO.json'); if(fs.existsSync(marker)) die('V11.4C ja instalado.');
const backup=p('backups/V11_4C/'+new Date().toISOString().replace(/[:.]/g,'-')); fs.mkdirSync(backup,{recursive:true});
for(const r of [CMD,AMB,WORLD]){const d=path.join(backup,r);fs.mkdirSync(path.dirname(d),{recursive:true});fs.copyFileSync(p(r),d)}
function write(rel,s){fs.writeFileSync(p(rel),s)}
let c=fs.readFileSync(p(CMD),'utf8');
c=c.replace(/this\.player\.teleport\(36,\s*766,\s*true,\s*false,\s*true\)/g,'this.player.teleport(120, 794, true, false, true)');
c=c.replace(/this\.player\.teleport\(45,\s*651,\s*true,\s*false,\s*true\)/g,'this.player.teleport(886, 622, true, false, true)');
c=c.replace(/Cidade Ilustrada V11\.4[^']*/g,'Cidade Ilustrada V11.4C — area nativa validada e limpa');
write(CMD,c);
let a=fs.readFileSync(p(AMB),'utf8');
a=a.replace(/originX:\s*16,\s*\n\s*originY:\s*736,/,'originX: 97,\n        originY: 777,');
a=a.replace(/originX:\s*0,\s*\n\s*originY:\s*624,/,'originX: 841,\n        originY: 588,');
write(AMB,a);
let w=JSON.parse(fs.readFileSync(p(WORLD),'utf8').replace(/^\uFEFF/,''));
if(w.width!==1152||w.height<1008||!Array.isArray(w.data)||!Array.isArray(w.collisions)) die('Formato world.json inesperado.');
const need=w.width*w.height;if(w.data.length<need)w.data.push(...Array(need-w.data.length).fill(0)); if(w.data.length>need)w.data=w.data.slice(0,need);
const collision=w.collisions.find(v=>Number.isInteger(v)); const walk=w.data.find(v=>Number.isInteger(v)&&v>0&&!w.collisions.includes(v)); if(!Number.isInteger(collision)||!Number.isInteger(walk))die('Tiles nativos nao encontrados.');
for(const name of ['v114-city-region.json','v114-love-region.json']){
 const r=JSON.parse(fs.readFileSync(pp('packages/server/data/map/'+name),'utf8')); const [ox,oy]=r.origin;
 for(let y=oy;y<oy+r.height;y++)for(let x=ox;x<ox+r.width;x++)w.data[y*w.width+x]=walk;
 for(const [x,y] of r.collisions)w.data[y*w.width+x]=collision;
 if(w.entities)for(const k of Object.keys(w.entities)){const i=Number(k),x=i%w.width,y=Math.floor(i/w.width);if(x>=ox&&x<ox+r.width&&y>=oy&&y<oy+r.height)delete w.entities[k]}
 if(w.plateau)for(const k of Object.keys(w.plateau)){const i=Number(k),x=i%w.width,y=Math.floor(i/w.width);if(x>=ox&&x<ox+r.width&&y>=oy&&y<oy+r.height)delete w.plateau[k]}
 const [sx,sy]=r.spawn;for(let y=sy-2;y<=sy+2;y++)for(let x=sx-2;x<=sx+2;x++)w.data[y*w.width+x]=walk;
}
w.version=Date.now(); fs.writeFileSync(p(WORLD),JSON.stringify(w));
fs.mkdirSync(path.dirname(marker),{recursive:true});fs.writeFileSync(marker,JSON.stringify({version:'11.4C',city:[120,794],amor:[886,622],backup},null,2));
console.log('[OK] V11.4C instalado.');console.log('[OK] /cidade -> 120,794 (coordenada nativa ja usada pelo Kaetram)');console.log('[OK] /amor -> 886,622 (coordenada nativa ja usada pelo Kaetram)');console.log('[OK] As duas areas foram limpas antes das colisoes proprias.');
