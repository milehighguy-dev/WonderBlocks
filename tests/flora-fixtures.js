import {defaultFlora,addFloraAsset} from '../src/flora/flora.js';

// Tests construct plants through the same native palette API as the editor.
export function testStem(){
 const f=defaultFlora();f.detail='standard';const b=addFloraAsset(f,f.branches[0].id,'flora-basic-branch');
 b.points=[[0,0,0],[.12,1.7,0],[0,3.4,.08]];b.radii=[.3,.2,.07];
 return f;
}
export function addTestBranch(f,parent=f.branches[0].id,at=.65,angle=0){return addFloraAsset(f,parent,'flora-basic-branch',at,angle);}
export function addTestFoliage(f,branch,at=.8,angle=0){return addFloraAsset(f,branch,'flora-ginkgo-leaf',at,angle);}
export function testPlant(){
 const f=testStem();for(let i=0;i<3;i++){const b=addTestBranch(f,f.branches[0].id,.5+i*.17,i*Math.PI*2/3);for(let j=0;j<3;j++)addTestFoliage(f,b.id,.45+j*.23,j*2.1);}
 return f;
}
