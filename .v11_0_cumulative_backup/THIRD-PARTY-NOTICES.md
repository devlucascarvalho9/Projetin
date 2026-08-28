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
