# Kaetram V11.4 — Cidade válida + Forja + /amor

## Corrige
- `/cidade` agora usa **X 16–61 / Y 736–769**, totalmente dentro do mapa runtime válido.
- Spawn da cidade: **36,766**.
- A região da cidade é limpa para piso nativo caminhável e recebe apenas as colisões próprias da arte.
- Forja de Essências: pedidos `EssencePreview/Apply/Cancel` não dependem mais de `canAccessContainer`.
- O índice do inventário da Forja ganhou fallback robusto.

## Novo `/amor`
Mapa `Carine Love Map` integrado em uma região separada e limpa:
- região: **X 0–90 / Y 624–691**
- spawn: **45,651**
- arte: 1448×1086
- colisões: convertidas do `carine-love-collisions.json` fornecido no ZIP
- nenhum objeto/entidade antigo é mantido sob a região.

## Instalação
1. Pare `yarn start`.
2. Extraia `PATCH_V11_4` dentro de `Kaetram-Open-develop`.
3. Execute `APLICAR-V11-4.cmd`.
4. Execute `TESTAR-V11-4.cmd`.
5. Se tudo der `[OK]`, rode `yarn build` e `yarn start`.
6. `Ctrl+F5`.

## Testes
- `/cidade`, depois `/coords` → deve mostrar `36,766`.
- `/amor`, depois `/coords` → deve mostrar `45,651`.
- Na Forja, selecione equipamento + Essência, role, aceite e confirme que 1 Essência foi consumida e o item mudou.
