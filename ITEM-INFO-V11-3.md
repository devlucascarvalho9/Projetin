# Item Info — Kaetram V11.3

Total de itens novos/de teste: **39**.

## Comandos

- `/itemlist 1` — lista as chaves em páginas.
- `/iteminfo <key>` — mostra tipo, nível, preço, descrição e stats base.
- `/giveitem <key> [qtd] [normal|magic|rare|unique] [ilvl]` — cria no inventário (GM).
- `/arpgloot <ilvl> <raridade>` — gera um drop ARPG aleatório no chão.

## Essências

**`essencebruta` — Essência Bruta**
- Tipo: `object` | Nível base: **1** | Valor: **900**
- Material de teste da Forja de Essências. Foco: dano físico, força e impacto. Na próxima etapa será usada para rolar atributos de armas.
- Extra: Stack 99
- Criar: `/giveitem essencebruta 1 normal 1`

**`essencesangrenta` — Essência Sangrenta**
- Tipo: `object` | Nível base: **1** | Valor: **1200**
- Material de teste da Forja de Essências. Foco: sangramento, ferimentos e dano físico contínuo.
- Extra: Stack 99
- Criar: `/giveitem essencesangrenta 1 normal 1`

**`essenceafiada` — Essência Afiada**
- Tipo: `object` | Nível base: **1** | Valor: **1200**
- Material de teste da Forja de Essências. Foco: crítico, precisão e velocidade de ataque.
- Extra: Stack 99
- Criar: `/giveitem essenceafiada 1 normal 1`

**`essenceguardia` — Essência Guardiã**
- Tipo: `object` | Nível base: **1** | Valor: **1300**
- Material de teste da Forja de Essências. Foco: vida, armadura, bloqueio e redução de dano.
- Extra: Stack 99
- Criar: `/giveitem essenceguardia 1 normal 1`

**`essencerunica` — Essência Rúnica**
- Tipo: `object` | Nível base: **1** | Valor: **1600**
- Material de teste da Forja de Essências. Foco: dano elemental, conversão física e efeitos híbridos.
- Extra: Stack 99
- Criar: `/giveitem essencerunica 1 normal 1`

## Itens de teste da Forja

**`testforgeblade` — Lâmina Serrilhada de Teste**
- Tipo: `weapon` | Nível base: **1** | Valor: **250** | Arma: `sword`
- Arma de teste equipável para acelerar farm e testar a Forja. Status: +45 Corte, +28 Perfuração, +22 Precisão, +18 Força. Sem requisito de skill; nível mínimo 1.
- Ataque: crush +18, slash +45, stab +28
- Defesa: crush +6, slash +8, stab +6
- Bônus: accuracy +22, strength +18
- Extra: Attack Rate 850 ms
- Criar: `/giveitem testforgeblade 1 normal 1`

**`testforgegreataxe` — Machado Voraz de Teste**
- Tipo: `weapon` | Nível base: **1** | Valor: **320** | Arma: `axe`
- Machado de teste equipável e forte. Remove escudo por ser duas mãos. Status: +58 Corte, +55 Impacto, +30 Força, +18 Precisão. Sem requisito de skill; nível mínimo 1.
- Ataque: crush +55, slash +58, stab +10
- Defesa: crush +10, slash +8, stab +6
- Bônus: accuracy +18, strength +30
- Extra: Attack Rate 950 ms | Duas mãos
- Criar: `/giveitem testforgegreataxe 1 normal 1`

**`testforgespear` — Lança de Caça de Teste**
- Tipo: `weapon` | Nível base: **1** | Valor: **280** | Arma: `spear`
- Lança de teste equipável. Status: +52 Perfuração, alcance maior, +30 Precisão, +14 Força. Sem requisito de skill; nível mínimo 1.
- Ataque: crush +18, slash +22, stab +52
- Defesa: crush +5, slash +5, stab +10
- Bônus: accuracy +30, strength +14
- Extra: Attack Rate 880 ms | Alcance 2
- Criar: `/giveitem testforgespear 1 normal 1`

**`testforgechest` — Couraça Reforjada de Teste**
- Tipo: `chestplate` | Nível base: **1** | Valor: **300**
- Peitoral de teste equipável. Status: defesas altas para aguentar mobs enquanto testa drops e essências. Sem requisito de skill; nível mínimo 1.
- Ataque: crush +3, slash +3, stab +3
- Defesa: crush +35, slash +38, stab +32, archery +14, magic +8
- Bônus: accuracy +4, strength +12
- Criar: `/giveitem testforgechest 1 normal 1`

**`testforgeshield` — Escudo Bastião de Teste**
- Tipo: `shield` | Nível base: **1** | Valor: **280**
- Escudo de teste equipável. Status: defesa física alta e bônus de força. Sem requisito de skill; nível mínimo 1.
- Ataque: crush +2, slash +2, stab +2
- Defesa: crush +40, slash +36, stab +38, archery +24, magic +12
- Bônus: accuracy +8, strength +10
- Criar: `/giveitem testforgeshield 1 normal 1`

**`testforgering` — Anel Instável de Teste**
- Tipo: `ring` | Nível base: **1** | Valor: **350**
- Anel de teste equipável. Status: +18 Precisão, +16 Força e pequenas defesas. Sem requisito de skill; nível mínimo 1.
- Ataque: crush +8, slash +8, stab +8, archery +2, magic +4
- Defesa: crush +8, slash +8, stab +8, archery +6, magic +6
- Bônus: accuracy +18, strength +16, magic +4
- Criar: `/giveitem testforgering 1 normal 1`

**`testforgeboots` — Botas Velozes de Teste**
- Tipo: `boots` | Nível base: **1** | Valor: **260**
- Botas de teste equipáveis. Status: movimento alto, defesas e precisão para farmar mais rápido. Sem requisito de skill; nível mínimo 1.
- Ataque: crush +2, slash +2, stab +2
- Defesa: crush +18, slash +18, stab +20, archery +12, magic +4
- Bônus: accuracy +12, strength +8
- Extra: Movimento x1.33
- Criar: `/giveitem testforgeboots 1 normal 1`

## Bases ARPG

**`arpg_rustblade` — Lâmina Gasta**
- Tipo: `weapon` | Nível base: **1** | Valor: **40** | Arma: `sword`
- Base ARPG N1. Uma espada simples para os primeiros mapas.
- Ataque: crush +5, slash +13, stab +8
- Defesa: crush +2, slash +2, stab +2
- Bônus: accuracy +6, strength +5
- Extra: Attack Rate 843 ms
- Criar: `/giveitem arpg_rustblade 1 normal 1`

**`arpg_hidevest` — Colete de Couro Cru**
- Tipo: `chestplate` | Nível base: **1** | Valor: **38**
- Base ARPG N1. Proteção leve para o início da jornada.
- Ataque: crush +1, slash +1, stab +1
- Defesa: crush +8, slash +9, stab +8, archery +3, magic +2
- Bônus: accuracy +1, strength +3
- Criar: `/giveitem arpg_hidevest 1 normal 1`

**`arpg_trailboots` — Botas de Trilha**
- Tipo: `boots` | Nível base: **1** | Valor: **34**
- Base ARPG N1. Botas leves voltadas a mobilidade.
- Ataque: crush +1, slash +1, stab +1
- Defesa: crush +4, slash +4, stab +5, archery +3, magic +1
- Bônus: accuracy +3, strength +2
- Extra: Movimento x1.33
- Criar: `/giveitem arpg_trailboots 1 normal 1`

**`arpg_oakshield` — Escudo de Carvalho**
- Tipo: `shield` | Nível base: **4** | Valor: **52**
- Base ARPG N4. Escudo de madeira reforçada.
- Ataque: crush +1, slash +1, stab +1
- Defesa: crush +12, slash +11, stab +11, archery +7, magic +4
- Bônus: accuracy +2, strength +3
- Criar: `/giveitem arpg_oakshield 1 normal 4`

**`arpg_waraxe` — Machado de Guerra**
- Tipo: `weapon` | Nível base: **8** | Valor: **78** | Arma: `axe`
- Base ARPG N8. Machado pesado de duas mãos.
- Ataque: crush +21, slash +22, stab +4
- Defesa: crush +4, slash +3, stab +2
- Bônus: accuracy +7, strength +11
- Extra: Attack Rate 939 ms | Duas mãos
- Criar: `/giveitem arpg_waraxe 1 normal 8`

**`arpg_ironcuirass` — Couraça de Ferro**
- Tipo: `chestplate` | Nível base: **12** | Valor: **95**
- Base ARPG N12. Armadura intermediária de ferro.
- Ataque: crush +1, slash +1, stab +1
- Defesa: crush +15, slash +16, stab +13, archery +6, magic +3
- Bônus: accuracy +2, strength +5
- Criar: `/giveitem arpg_ironcuirass 1 normal 12`

**`arpg_guardring` — Anel da Guarda**
- Tipo: `ring` | Nível base: **14** | Valor: **110**
- Base ARPG N14. Anel equilibrado de combate.
- Ataque: crush +3, slash +3, stab +3, archery +1, magic +2
- Defesa: crush +3, slash +3, stab +3, archery +3, magic +3
- Bônus: accuracy +8, strength +7, magic +2
- Criar: `/giveitem arpg_guardring 1 normal 14`

**`arpg_longblade` — Espada Longa Temperada**
- Tipo: `weapon` | Nível base: **18** | Valor: **145** | Arma: `sword`
- Base ARPG N18. Lâmina longa de aço temperado.
- Ataque: crush +9, slash +23, stab +15
- Defesa: crush +3, slash +4, stab +3
- Bônus: accuracy +11, strength +9
- Extra: Attack Rate 837 ms
- Criar: `/giveitem arpg_longblade 1 normal 18`

**`arpg_soldierboots` — Botas do Soldado**
- Tipo: `boots` | Nível base: **20** | Valor: **150**
- Base ARPG N20. Botas resistentes para combate contínuo.
- Ataque: crush +1, slash +1, stab +1
- Defesa: crush +9, slash +9, stab +10, archery +6, magic +2
- Bônus: accuracy +6, strength +4
- Extra: Movimento x1.33
- Criar: `/giveitem arpg_soldierboots 1 normal 20`

**`arpg_towershield` — Escudo Torre**
- Tipo: `shield` | Nível base: **24** | Valor: **190**
- Base ARPG N24. Escudo grande focado em defesa.
- Ataque: crush +1, slash +1, stab +1
- Defesa: crush +23, slash +21, stab +22, archery +14, magic +7
- Bônus: accuracy +5, strength +6
- Criar: `/giveitem arpg_towershield 1 normal 24`

**`arpg_berserkeraxe` — Machado do Berserker**
- Tipo: `weapon` | Nível base: **28** | Valor: **245** | Arma: `axe`
- Base ARPG N28. Machado brutal para builds físicas.
- Ataque: crush +36, slash +38, stab +6
- Defesa: crush +6, slash +5, stab +4
- Bônus: accuracy +12, strength +20
- Extra: Attack Rate 931 ms | Duas mãos
- Criar: `/giveitem arpg_berserkeraxe 1 normal 28`

**`arpg_warplate` — Placa de Guerra**
- Tipo: `chestplate` | Nível base: **32** | Valor: **280**
- Base ARPG N32. Placa pesada para conteúdo avançado.
- Ataque: crush +2, slash +2, stab +2
- Defesa: crush +24, slash +26, stab +22, archery +10, magic +5
- Bônus: accuracy +3, strength +8
- Criar: `/giveitem arpg_warplate 1 normal 32`

**`arpg_bloodring` — Anel de Sangue**
- Tipo: `ring` | Nível base: **36** | Valor: **315**
- Base ARPG N36. Joia agressiva para o endgame inicial.
- Ataque: crush +6, slash +6, stab +6, archery +1, magic +3
- Defesa: crush +6, slash +6, stab +6, archery +4, magic +4
- Bônus: accuracy +13, strength +11, magic +3
- Criar: `/giveitem arpg_bloodring 1 normal 36`

**`arpg_executioner` — Machado do Carrasco**
- Tipo: `weapon` | Nível base: **40** | Valor: **390** | Arma: `axe`
- Base ARPG N40. Arma de duas mãos para mapas altos.
- Ataque: crush +45, slash +48, stab +8
- Defesa: crush +8, slash +7, stab +5
- Bônus: accuracy +15, strength +25
- Extra: Attack Rate 927 ms | Duas mãos
- Criar: `/giveitem arpg_executioner 1 normal 40`

**`arpg_titanboots` — Botas do Titã**
- Tipo: `boots` | Nível base: **44** | Valor: **410**
- Base ARPG N44. Botas pesadas com ótimo equilíbrio.
- Ataque: crush +2, slash +2, stab +2
- Defesa: crush +14, slash +14, stab +16, archery +10, magic +3
- Bônus: accuracy +10, strength +6
- Extra: Movimento x1.33
- Criar: `/giveitem arpg_titanboots 1 normal 44`

**`arpg_titanplate` — Armadura do Titã**
- Tipo: `chestplate` | Nível base: **48** | Valor: **520**
- Base ARPG N48. Base de armadura para tiers altos.
- Ataque: crush +3, slash +3, stab +3
- Defesa: crush +32, slash +35, stab +29, archery +13, magic +7
- Bônus: accuracy +4, strength +11
- Criar: `/giveitem arpg_titanplate 1 normal 48`

**`arpg_dreadblade` — Lâmina do Pavor**
- Tipo: `weapon` | Nível base: **55** | Valor: **620** | Arma: `sword`
- Base ARPG N55. Lâmina de alto nível voltada a mapas avançados.
- Ataque: crush +28, slash +72, stab +49
- Defesa: crush +10, slash +12, stab +10
- Bônus: accuracy +24, strength +29
- Extra: Attack Rate 790 ms
- Criar: `/giveitem arpg_dreadblade 1 normal 55`

**`arpg_juggernautshield` — Baluarte do Juggernaut**
- Tipo: `shield` | Nível base: **58** | Valor: **680**
- Base ARPG N58. Escudo pesado para enfrentar elites.
- Ataque: crush +3, slash +3, stab +3
- Defesa: crush +61, slash +57, stab +59, archery +35, magic +24
- Bônus: accuracy +8, strength +15
- Criar: `/giveitem arpg_juggernautshield 1 normal 58`

**`arpg_bloodplate` — Placa Sanguínea**
- Tipo: `chestplate` | Nível base: **62** | Valor: **740**
- Base ARPG N62. Armadura reforçada para tiers altos.
- Ataque: crush +4, slash +4, stab +4
- Defesa: crush +58, slash +62, stab +55, archery +32, magic +25
- Bônus: accuracy +5, strength +18
- Criar: `/giveitem arpg_bloodplate 1 normal 62`

**`arpg_warstep` — Passos de Guerra**
- Tipo: `boots` | Nível base: **66** | Valor: **720**
- Base ARPG N66. Botas de guerra rápidas e resistentes.
- Ataque: crush +2, slash +2, stab +2
- Defesa: crush +28, slash +29, stab +31, archery +21, magic +13
- Bônus: accuracy +15, strength +12
- Extra: Movimento x1.52
- Criar: `/giveitem arpg_warstep 1 normal 66`

**`arpg_conquerroring` — Anel do Conquistador**
- Tipo: `ring` | Nível base: **70** | Valor: **810**
- Base ARPG N70. Joia de combate para mapas de endgame.
- Ataque: crush +5, slash +5, stab +5, archery +2, magic +2
- Defesa: crush +11, slash +11, stab +11, archery +8, magic +8
- Bônus: accuracy +24, strength +22, magic +4
- Criar: `/giveitem arpg_conquerroring 1 normal 70`

**`arpg_doomaxe` — Machado da Ruína**
- Tipo: `weapon` | Nível base: **76** | Valor: **920** | Arma: `axe`
- Base ARPG N76. Machado de duas mãos para golpes devastadores.
- Ataque: crush +70, slash +92, stab +16
- Defesa: crush +13, slash +11, stab +8
- Bônus: accuracy +27, strength +38
- Extra: Attack Rate 930 ms | Duas mãos
- Criar: `/giveitem arpg_doomaxe 1 normal 76`

**`arpg_colossusplate` — Armadura do Colosso**
- Tipo: `chestplate` | Nível base: **84** | Valor: **1080**
- Base ARPG N84. Proteção extrema para os maiores tiers.
- Ataque: crush +5, slash +5, stab +5
- Defesa: crush +78, slash +82, stab +75, archery +43, magic +31
- Bônus: accuracy +7, strength +27
- Criar: `/giveitem arpg_colossusplate 1 normal 84`

**`arpg_worldbreaker` — Quebra-Mundos**
- Tipo: `weapon` | Nível base: **90** | Valor: **1350** | Arma: `axe`
- Base ARPG N90. A base de arma mais pesada do roadmap inicial.
- Ataque: crush +92, slash +118, stab +20
- Defesa: crush +16, slash +14, stab +10
- Bônus: accuracy +34, strength +48
- Extra: Attack Rate 970 ms | Duas mãos
- Criar: `/giveitem arpg_worldbreaker 1 normal 90`

## Uniques

**`unique_ashcleaver` — Fende-Cinzas**
- Tipo: `weapon` | Nível base: **32** | Valor: **900** | Arma: `axe`
- ÚNICO — machado antigo que mantém o fio mesmo coberto de cinzas.
- Ataque: crush +48, slash +63, stab +9
- Defesa: crush +9, slash +7, stab +5
- Bônus: accuracy +16, strength +26
- Extra: Attack Rate 925 ms | Duas mãos
- Criar: `/giveitem unique_ashcleaver 1 normal 32`

**`unique_stonewall` — Muralha de Pedra**
- Tipo: `shield` | Nível base: **34** | Valor: **920**
- ÚNICO — escudo maciço, quase uma parede carregada no braço.
- Ataque: crush +2, slash +2, stab +2
- Defesa: crush +49, slash +45, stab +47, archery +27, magic +16
- Bônus: accuracy +7, strength +9
- Criar: `/giveitem unique_stonewall 1 normal 34`

**`unique_warheart` — Coração de Guerra**
- Tipo: `chestplate` | Nível base: **38** | Valor: **980**
- ÚNICO — couraça marcada por incontáveis batalhas.
- Ataque: crush +3, slash +3, stab +3
- Defesa: crush +43, slash +46, stab +40, archery +23, magic +18
- Bônus: accuracy +4, strength +11
- Criar: `/giveitem unique_warheart 1 normal 38`
