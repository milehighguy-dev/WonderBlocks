// Editor labels and copy ownership do not affect rendered geometry, materials,
// opening cuts or collision. Keep all geometry and connection fields in the key.
export function sceneRenderKey(parts){
 return JSON.stringify(parts.map(({name,assemblyName,instanceFamily,instanceName,instanceCopy,...part})=>part));
}
