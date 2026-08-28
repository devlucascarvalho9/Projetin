# Kaetram V11.1 — Conteúdo e comandos de teste

## Teleportes

- `/cidade` — Cidade Inicial Estruturada V11.1 (região nova, vazia e isolada).
- `/dungeon` ou `/crypt` — Cripta procedural V11.0 com Crypt Lord.
- `/cidadeantiga` — cidade animada antiga, mantida só para comparação.
- `/teleportes` ou `/tps` — mostra os destinos disponíveis no chat.
- O botão **MAPAS** também lista Cidade Estruturada e Cripta.

## Sistemas implementados até V11.1

- ✅ KayKit Barbarian 1,4× com animações direcionais reais (idle, corrida, ataque, Cleave, Steelstorm, Warcry, hit e morte).
- ✅ Skeletons KayKit e boss Crypt Lord.
- ✅ VFX Kenney para combate.
- ✅ AutoFarm com fallback de pathfinding EasyStar.
- ✅ Cripta procedural com 9 salas, corredores, colisões, 15 esqueletos e Crypt Lord.
- ✅ Cidade Inicial Estruturada em extensão nova do world: casas, fonte, rios, árvores, pontes, loja/forja visuais e colisões próprias.
- ✅ Raridades Normal/Magic/Rare/Unique, Item Level e affixes T1–T5.
- ✅ 24 bases ARPG + 3 Uniques.
- ✅ Forja de Essências.
- ✅ Cleave, Steelstorm/Whirlwind e Warcry com Supports.
- ✅ Elites Brutal/Fortificado/Veloz/Arcano e Map Tiers T1–T10.
- ✅ Loot Filter + Auto-Sell e integração com AutoFarm.
- ✅ Painel GM F10 para LV, STR, HP, Attack Speed e Move Speed.

## Comandos de itens

- `/itemlist [pagina]` — lista chaves de itens novos no chat.
- `/giveitem <key> [qtd] [normal|magic|rare|unique] [ilvl]` — GM: cria um item específico.
- `/arpgloot <ilvl> <normal|magic|rare|unique>` — cria um drop ARPG aleatório do nível/raridade pedidos.
- `/drop <key> [qtd]` — atalho antigo para itens de teste, sem rolar affixes ARPG.

Exemplos:
- `/giveitem arpg_worldbreaker 1 rare 90`
- `/giveitem unique_ashcleaver 1 unique 60`
- `/giveitem essencebruta 10`
- `/arpgloot 70 rare`
- `/arpgloot 90 unique`

## Chaves de itens disponíveis

- `essencebruta` — Essência Bruta
- `essencesangrenta` — Essência Sangrenta
- `essenceafiada` — Essência Afiada
- `essenceguardia` — Essência Guardiã
- `essencerunica` — Essência Rúnica
- `testforgeblade` — Lâmina Serrilhada de Teste
- `testforgegreataxe` — Machado Voraz de Teste
- `testforgespear` — Lança de Caça de Teste
- `testforgechest` — Couraça Reforjada de Teste
- `testforgeshield` — Escudo Bastião de Teste
- `testforgering` — Anel Instável de Teste
- `testforgeboots` — Botas Velozes de Teste
- `arpg_rustblade` — Lâmina Gasta
- `arpg_hidevest` — Colete de Couro Cru
- `arpg_trailboots` — Botas de Trilha
- `arpg_oakshield` — Escudo de Carvalho
- `arpg_waraxe` — Machado de Guerra
- `arpg_ironcuirass` — Couraça de Ferro
- `arpg_guardring` — Anel da Guarda
- `arpg_longblade` — Espada Longa Temperada
- `arpg_soldierboots` — Botas do Soldado
- `arpg_towershield` — Escudo Torre
- `arpg_berserkeraxe` — Machado do Berserker
- `arpg_warplate` — Placa de Guerra
- `arpg_bloodring` — Anel de Sangue
- `arpg_executioner` — Machado do Carrasco
- `arpg_titanboots` — Botas do Titã
- `arpg_titanplate` — Armadura do Titã
- `unique_ashcleaver` — Fende-Cinzas
- `unique_stonewall` — Muralha de Pedra
- `unique_warheart` — Coração de Guerra
- `arpg_dreadblade` — Lâmina do Pavor
- `arpg_juggernautshield` — Baluarte do Juggernaut
- `arpg_bloodplate` — Placa Sanguínea
- `arpg_warstep` — Passos de Guerra
- `arpg_conquerroring` — Anel do Conquistador
- `arpg_doomaxe` — Machado da Ruína
- `arpg_colossusplate` — Armadura do Colosso
- `arpg_worldbreaker` — Quebra-Mundos

## Skills / Supports / Endgame

- `/support cleave area`
- `/support cleave efficiency`
- `/support whirlwind acceleration`
- `/support warcry vitality`
- `/supportlist`
- `/maptier`
- `/lootfilter normal|magic|rare|unique`
- `/autosell off|normal|magic|rare`

## Painel GM / Debug

- **F10** abre/fecha a tela pequena de edição.
- Campos: **LV**, **STR**, **HP**, **ATK SPD %**, **MOVE SPD %**.
- Velocidades usam porcentagem: `100` = normal, `150` = 50% mais rápido, `200` = 2×.
- As alterações do painel são **overrides de sessão** e não destroem os níveis reais do save.
- `/devstats` — mostra os valores ativos.
- `/devset level 50`
- `/devset str 80`
- `/devset hp 10000`
- `/devset attackspeed 180`
- `/devset movespeed 140`
- `/devset reset` — volta aos valores normais.