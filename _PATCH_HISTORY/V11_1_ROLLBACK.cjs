const fs=require('fs'),path=require('path');const root=process.cwd(),manifestPath=path.join(root,'.v11_1_install.json');
if(!fs.existsSync(manifestPath)){console.error('Manifesto .v11_1_install.json nao encontrado. Nada para reverter.');process.exit(1)}
const m=JSON.parse(fs.readFileSync(manifestPath,'utf8')),backup=path.join(root,m.backupRel);let restored=0,removed=0;
for(const rel of m.affected){const dst=path.join(root,rel),src=path.join(backup,rel);if(m.existed[rel]){if(!fs.existsSync(src)){console.error('Backup ausente: '+rel);process.exit(1)}fs.mkdirSync(path.dirname(dst),{recursive:true});fs.copyFileSync(src,dst);restored++;}else if(fs.existsSync(dst)){fs.rmSync(dst,{recursive:true,force:true});removed++;}}
fs.rmSync(manifestPath,{force:true});console.log(`Rollback V11.1 concluido: ${restored} restaurados, ${removed} novos removidos.`);
