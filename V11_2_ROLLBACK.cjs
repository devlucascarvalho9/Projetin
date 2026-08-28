const fs=require('fs'),path=require('path');
const root=process.cwd(), stateRel='.v11_2_install.json', statePath=path.join(root,stateRel);
if(!fs.existsSync(statePath)){console.error('ERRO: estado V11.2 nao encontrado.');process.exit(1);}
const state=JSON.parse(fs.readFileSync(statePath,'utf8')); const backupRoot=path.join(root,state.backupRel); let restored=0;
for(const rel of state.affected){const dst=path.join(root,rel),src=path.join(backupRoot,rel);if(state.existed[rel]){if(!fs.existsSync(src)){console.error('Backup ausente: '+rel);process.exit(1);}fs.mkdirSync(path.dirname(dst),{recursive:true});fs.copyFileSync(src,dst);}else if(fs.existsSync(dst))fs.rmSync(dst,{force:true,recursive:true});restored++;}
fs.rmSync(statePath,{force:true});console.log(`Rollback V11.2 concluido: ${restored} entradas restauradas/removidas.`);
