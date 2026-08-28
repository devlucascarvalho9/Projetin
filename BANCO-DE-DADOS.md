# Kaetram - MongoDB habilitado

Este pacote altera a configuracao para o Kaetram usar MongoDB de verdade, em vez de iniciar em modo sem banco.

## O que foi corrigido

- `SKIP_DATABASE=false`
- MongoDB em `127.0.0.1:27017`
- Banco configurado como `kaetram_development`
- `TUTORIAL_ENABLED=false` mantido
- `.env.defaults` atualizado para que a configuracao nao volte ao modo sem banco se o `.env` for recriado
- `docker-compose.mongodb.yml` adicionado como opcao simples para iniciar um MongoDB local com dados persistentes

## Opcao 1 - MongoDB ja instalado no computador

Garanta que o servico MongoDB esteja em execucao e escutando em `127.0.0.1:27017`.

No Windows/PowerShell, se o servico tiver o nome padrao:

```powershell
Get-Service MongoDB
Start-Service MongoDB
```

Se voce tiver o `mongosh`, pode testar com:

```powershell
mongosh "mongodb://127.0.0.1:27017/kaetram_development" --eval "db.runCommand({ ping: 1 })"
```

## Opcao 2 - Docker Desktop

Na raiz do projeto:

```bash
docker compose -f docker-compose.mongodb.yml up -d
```

Para conferir:

```bash
docker compose -f docker-compose.mongodb.yml ps
```

Para parar sem apagar os personagens:

```bash
docker compose -f docker-compose.mongodb.yml down
```

Nao use `down -v` se quiser preservar os dados, pois `-v` remove o volume do MongoDB.

## Iniciar o Kaetram

Depois que o MongoDB estiver rodando:

```bash
yarn start
```

ou, em desenvolvimento:

```bash
yarn dev
```

O log correto deve conter algo semelhante a:

```text
Successfully connected to the MongoDB server.
Server is now listening on port: 9001.
```

Nao deve mais aparecer:

```text
Running without database
No connection established for the database.
```

## Importante sobre node_modules

O ZIP original contem `node_modules` instalados para Windows (`win32-x64`). Se executar o projeto em Linux, WSL ou VPS, apague `node_modules` e instale as dependencias novamente nesse ambiente:

```bash
rm -rf node_modules
yarn install
yarn build
yarn start
```

No Windows, nao e necessario apagar `node_modules` apenas por esse motivo.

## Se voce ja tinha personagens salvos no nome antigo

O arquivo original usava `kaetram_devlopment` (grafia antiga). Se voce ja tinha um MongoDB funcional e dados nesse banco, troque temporariamente esta linha no `.env`:

```env
MONGODB_DATABASE='kaetram_development'
```

por:

```env
MONGODB_DATABASE='kaetram_devlopment'
```

Isso faz o servidor voltar a enxergar os dados antigos. A grafia do nome do banco, sozinha, nao impede a conexao; o problema principal do log era o MongoDB indisponivel junto com `SKIP_DATABASE=true`.
