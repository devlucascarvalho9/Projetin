# Kaetram V10.5 — Roadmap 1–7

Base esperada: V10.4 (KayKit 1,4x + direção corrigida + Steelstorm + cidade com colisões).

## Implementado

1. **Raridade de itens** — Normal, Magic, Rare e Unique, com cor e metadata persistente.
2. **Prefixos e sufixos** — separados, com limites por raridade (Magic 1+1; Rare 3+3).
3. **Item Level + tiers** — affixes T1–T5 condicionados ao ilvl; T1 só aparece em ilvl alto.
4. **Bases/loot por nível** — 24 bases ARPG de nível 1 a 90 + 3 Uniques iniciais; mobs rolam equipamento independente do drop nativo; bosses/minibosses recebem bônus.
5. **Active Skills + Supports** — Cleave, Whirlwind/Steelstorm e Warcry aceitam até 2 Supports: Área, Eficiência, Aceleração e Vitalidade. Mana/cooldown/AoE/cura são validados pelo servidor.
6. **Map Tiers + Elites** — T1–T10 estimados pelo nível do mob; elites podem ser Brutal, Fortificado, Veloz e Arcano, com HP/dano/defesa/velocidade e loot modificados.
7. **Loot Filter + Auto-Sell** — persistente por personagem, integrado ao AutoFarm e com controles no painel Idle/Farm. Únicos, essências e itens legados/quest são protegidos do descarte automático.

## Extras seguros desta entrega

- Tooltip mostra raridade, Item Level, Map Tier, tipo/tier de affix e limites corretos de prefix/suffix.
- Forja de Essências usa ilvl/tier e não reforja Unique.
- Painéis Endgame e Idle/Farm foram atualizados para mostrar o estado real dos sistemas.
- Comandos de teste: `/arpgloot`, `/support`, `/supportlist`, `/maptier`, `/lootfilter`, `/autosell`.
- O patch não contém `world.json`, KayKit, HUD, cidade, `node_modules` ou o projeto completo.

## Teste rápido recomendado

1. `/arpgloot 10 magic`
2. `/arpgloot 40 rare`
3. `/arpgloot 60 unique`
4. `/support cleave area` e `/support cleave efficiency`
5. Use Cleave e confira mana/AoE.
6. `/maptier`
7. Mate mobs até aparecer um Elite (nome roxo com T#).
8. `/lootfilter rare` e ative AutoFarm: Magic/Normal ARPG devem ser ignorados.
9. `/autosell magic`: ao coletar equipamento ARPG Normal/Magic, ele vira ouro automaticamente.
10. `/autosell off` e `/lootfilter normal` para voltar ao padrão.
