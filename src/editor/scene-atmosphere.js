import * as T from '../../vendor/three.module.js';

// Presentation only: the editable project and exported mesh materials keep
// their original textures, tint and collision data.
export function applySceneHeightFog(root,view){
 if(!view?.heightFog)return;
 // This blend runs after the output color conversion, like Three's fog.
 const [bottom,top]=view.heightFog,color=new T.Color(view.background).convertLinearToSRGB();
 root.traverse(object=>{
  if(!object.isMesh)return;
  for(const material of Array.isArray(object.material)?object.material:[object.material]){
   if(material.userData.sceneHeightFog)continue;
   material.userData.sceneHeightFog=true;
   const before=material.onBeforeCompile,cacheKey=material.customProgramCacheKey();
   material.onBeforeCompile=function(shader,renderer){
    before.call(this,shader,renderer);
    shader.uniforms.sceneFogColor={value:color};shader.uniforms.sceneFogRange={value:new T.Vector2(bottom,top)};
    shader.vertexShader='varying float vSceneHeight;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>','#include <worldpos_vertex>\nvSceneHeight=(modelMatrix*vec4(transformed,1.)).y;');
    shader.fragmentShader='varying float vSceneHeight;\nuniform vec3 sceneFogColor;\nuniform vec2 sceneFogRange;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <fog_fragment>','#include <fog_fragment>\nfloat canyonMist=1.-smoothstep(sceneFogRange.x,sceneFogRange.y,vSceneHeight);\ngl_FragColor.rgb=mix(gl_FragColor.rgb,sceneFogColor,canyonMist);');
   };
   material.customProgramCacheKey=()=>cacheKey+'|scene-height-fog';material.needsUpdate=true;
  }
 });
}
