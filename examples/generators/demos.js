import {prepareExampleCopies} from '../../src/editor/example-copies.js';
import {makePart} from '../../src/core/model.js';
export function classicalTemple(){
 const parts=[],stone='#e4dcc7';
 const add=(type,position,scale=[1,1,1],color=stone,rotation=[0,0,0])=>parts.push(makePart(type,{position,scale,color,rotation}));
 add('temple-base',[0,0,0],[7,4/3,9]);
 const floor=.6,top=floor+4.2;
 for(const z of [-4.2,4.2])for(const x of [-3,-1,1,3])add('doric',[x,floor,z],[1.4,1.4,1.4]);
 for(const x of [-3,3])for(const z of [-2.52,-.84,.84,2.52])add('doric',[x,floor,z],[1.4,1.4,1.4]);
 add('temple-entablature',[0,top,0],[3,1,3]);
 const roof=top+.91;
 add('temple-roof-complete',[0,roof,0],[3.55,3.55,9.6],'#b57153');
 // Separate inner walls and an open entrance leave a usable interior space.
 for(const x of [-1.9,1.9])add('block',[x,floor,0],[.22,3.7,6.2]);
 add('block',[0,floor,-3],[3.8,3.7,.22]);
 add('temple-door',[0,floor,3],[1.6,1.95,1]);
 for(const x of [-1.48,1.48])add('block',[x,floor,3],[.84,3.7,.25]);
 return prepareExampleCopies({format:'open-building-studio',version:1,name:'Sunstone Temple',parts},'classical-temple-copy');
}
