# Warrior passive-tree renderer

This Kaetram implementation uses the **architectural ideas** of the MIT-licensed
`cvenzin/poe2-skilltree` project as a reference for a large passive-tree viewer:
separating rendering from allocation state, pan/zoom navigation, and shortest-path
preview.

No Path of Exile / Path of Exile 2 passive-tree JSON, node positions, names,
icons, textures, atlas files, class data, or other Grinding Gear Games assets are
included here. The Warrior nodes, effects, graph, layout, colors and rendering
code in this folder are Kaetram-specific.

Reference project license: MIT, Copyright (c) 2026 cvenzin.
https://github.com/cvenzin/poe2-skilltree
