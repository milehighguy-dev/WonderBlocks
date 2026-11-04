# Wonderblocks workbench

Visual thesis: a compact graphite editing workbench with amber state cues and a
clear view of the scene. Real part and material previews provide the visual
detail; routine controls remain quiet and consistent.

Layout: the title bar contains project identity, Object/Material/Flora modes and
file actions. The left rail holds the current library or authoring controls.
The scene occupies the center. Scene hierarchy and properties share the right
rail; plant editing releases that rail to the viewport. Editing context and
transform tools dock to the viewport edge.

Interaction thesis: category and preview tiles respond through short color and
border transitions. Menus reveal quickly without shifting the workspace. Active
tools and selected rows use amber consistently. Reduced-motion preferences
disable transitions. Transform gizmos keep their axis and handle colors because
those colors explain operation rather than decorate the interface.

Use Bahnschrift for interface text and Consolas for numeric values, with local
system fallbacks. Use three surface levels, one-pixel separators, small corner
radii and tabular numbers. Tool labels stay visible. Use cards for selectable
assets and materials; use rows, dividers and collapsible groups for properties.
Instructions describe operation and stay short.

`styles/workbench.css` supplies the shared appearance across object, material,
flora, route and room workspaces. Keep editor geometry and project data separate
from appearance changes. `tests/integration/editor-appearance.mjs` captures those
workspaces and checks layout at desktop, compact and narrow widths.
