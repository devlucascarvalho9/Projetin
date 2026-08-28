const fs=require('fs'),path=require('path');
function findRoot(start){let cur=path.resolve(start);for(let i=0;i<8;i++){if(fs.existsSync(path.join(cur,'patches','state','v11_4.json')))return cur;let p=path.dirname(cur);if(p===cur)break;cur=p;}return '';}
const root=findRoot(__dirname);if(!root){console.error('ERRO: state V11.4 nao encontrado.');process.exit(1);}
const statePath=path.join(root,'patches/state/v11_4.json'), state=JSON.parse(fs.readFileSync(statePath,'utf8')), backupRoot=path.join(root,state.backupRel);
for(const rel of state.affected){const dst=path.join(root,rel), src=path.join(backupRoot,rel);if(state.existed[rel]){fs.mkdirSync(path.dirname(dst),{recursive:true});fs.copyFileSync(src,dst);}else if(fs.existsSync(dst))fs.rmSync(dst,{force:true,recursive:true});}
fs.rmSync(path.join(root,'patches/state/V11_4_INSTALADO.json'),{force:true});
fs.rmSync(statePath,{force:true});
console.log('[OK] Rollback V11.4 concluido. Backup preservado em '+state.backupRel);
