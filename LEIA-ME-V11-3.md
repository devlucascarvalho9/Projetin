# Kaetram V11.3

Patch incremental para a V11.2B. Extraia a pasta `PATCH_V11_3` dentro de `Kaetram-Open-develop` e execute os CMDs de dentro dela. A raiz do jogo fica limpa.

## Alterações
- KayKit: 2.2x.
- Cidade ilustrada: correção real do piso. No Kaetram, tile 0 é colisão; V11.2B havia deixado as ruas como 0. V11.3 usa um tile nativo caminhável sob toda a arte e reaplica as 782 estruturas bloqueadas.
- Spawn da cidade: 200,1086, com área 5x5 livre.
- Rat e Batterfly: durante os testes, cada morte gera 1 equipamento ARPG + 1 essência; 35% de chance de uma Essência Bruta extra.
- `/iteminfo <key>`: ficha estática de qualquer item novo/de teste.

## Instalação
1. Pare `yarn start`.
2. Extraia este ZIP na raiz do jogo.
3. Abra `PATCH_V11_3` e execute `APLICAR-V11-3.cmd`.
4. Execute `TESTAR-V11-3.cmd`.
5. Se tudo estiver `[OK]`, rode `yarn build` e `yarn start` na raiz.
