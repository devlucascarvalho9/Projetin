# Kaetram V11.0 — Pacote cumulativo

Este patch e autocontido e inclui: V10.5A Roadmap 1–7 + V10.6 KayKit animado + V10.7 Skeletons + V10.8 VFX + V10.9 EasyStar + V11.0 Cripta procedural.

## Base esperada
- V10.3/V10.4 (cidade com colisoes + KayKit).
- Se o V10.5A ja estiver instalado, tambem funciona: os arquivos finais simplesmente sao atualizados para V11.0.

## Instalar
1. Pare `yarn start`.
2. Extraia TODOS os arquivos deste ZIP na raiz `Kaetram-Open-develop`.
3. Execute `APLICAR-V11-0-CUMULATIVO.cmd`.
4. Execute `TESTAR-V11-0-CUMULATIVO.cmd`. Todos os itens devem aparecer como `[OK]`.
5. Rode `yarn build`.
6. Se o build terminar sem erro, rode `yarn start`.
7. No navegador use `Ctrl + F5`.

## Testar no jogo
- `/dungeon` ou `/crypt` — entra na primeira Cripta V11.0.
- `/cidade` — retorna para a cidade.
- Teste Idle/AutoFarm em area com obstaculos para observar o fallback EasyStar.
- Use Cleave, Steelstorm e Warcry para verificar animacoes/VFX.

## Rollback
Se algo der errado antes/depois do build, pare o servidor e execute `ROLLBACK-V11-0-CUMULATIVO.cmd`. O instalador cria backup da versao que estava no seu PC antes do V11.0.

## Seguranca do patch
- Nao contem `node_modules`.
- Nao substitui a pasta inteira do jogo.
- `world.json`, `mobs.json` e `sprites.json` sao alterados de forma localizada: apenas a regiao da cripta, o Crypt Lord e os quatro registros visuais de skeleton/boss.
- O instalador aborta se detectar conteudo inesperado na regiao reservada da dungeon.
