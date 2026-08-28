# Third-party references — V9

Esta versão mantém código e dados próprios do Kaetram e usa os projetos enviados pelo usuário apenas onde compatível.

## PathFinding.js
- Projeto: qiao/PathFinding.js
- Autor no package.json: Xueqiao Xu
- Licença: MIT
- Uso nesta versão: o helper de cálculo de comprimento de rota em `smart-path-utils.ts` foi adaptado de `src/core/Util.js`; o movimento continua usando o A* nativo do Kaetram.

## Warptracker
- Licença: MIT, Copyright (c) 2026 Warptracker contributors
- Uso nesta versão: referências arquiteturais para timing de skills, cooldowns, rings/bursts e feedback de combate. A implementação V9 foi refeita para Canvas/DOM 2D do Kaetram.

## game-hud
- Licença: MIT, Copyright (c) 2026 Aron & Sharon / threejsassets.com
- Uso nesta versão: referência de composição de minimapa/HUD. O radar V9 desenha dados reais da grid do Kaetram e possui implementação visual própria.

## KayKit Character Pack Adventures
- Conteúdo fornecido pelo usuário no projeto.
- Licença do pack: CC0.
- Uso: Barbarian.glb e renders direcionais para substituir o personagem local.

## Diabolic UI (arquivos fornecidos pelo usuário)
- Uso nesta versão: subconjunto de arte do HUD/orbes/action bar convertido de TGA para PNG para a interface solicitada pelo usuário.
- O projeto de origem informa licença customizada/All Rights Reserved; mantenha os avisos/licenças originais ao redistribuir publicamente.

## Warptracker
- Licença: MIT.
- Uso: referências de timing/feedback para Sunder, Steelstorm e Warcall; implementação adaptada ao Kaetram.

# V11.0 additions

## KayKit Character Pack — Skeletons
- Creator: Kay Lousberg / KayKit.
- License: Creative Commons Zero (CC0).
- Use in V11.0: directional 2D sprite sheets rendered from the supplied Skeleton GLB models for Skeleton, Skeleton2, Dark Skeleton and the Crypt Lord family.
- Full notice: `LICENSE-KAYKIT-SKELETONS.txt`.

## KayKit Dungeon Remastered
- Creator: Kay Lousberg / KayKit.
- License: Creative Commons Zero (CC0).
- Use in V11.0: floor, wall and prop artwork used to compose the first procedural crypt.
- Full notice: `LICENSE-KAYKIT-DUNGEON.txt`.

## Kenney Explosion Pack
- Creator: Kenney.
- License: Creative Commons Zero (CC0).
- Use in V10.8/V11.0: burst/ring artwork adapted for critical hits, Cleave and Warcry feedback.
- Full notice: `LICENSE-KENNEY-EXPLOSION.txt`.

## EasyStar.js
- Copyright (c) 2012-2020 Bryce Neal.
- License: MIT.
- Use in V10.9/V11.0: vendored browser build used as a fallback grid path planner for Smart AutoFarm when Kaetram's native A* cannot resolve a route.
- Full notice: `LICENSE-EASYSTAR.txt`.

## rot.js
- Copyright (c) 2012-now(), Ondrej Zara.
- License: BSD 3-Clause style license included by the project.
- Use in V11.0: build-time Digger generator used to produce the first crypt room/corridor layout. The runtime game uses the generated JSON/map and does not ship the rot.js library itself.
- Full notice: `LICENSE-ROTJS.txt`.
