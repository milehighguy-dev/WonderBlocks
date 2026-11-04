import * as T from '../../vendor/three.module.js';
import {BESPIN_ARCH as profile} from './bespin-arch-profile.js';
// Carry equal bays across adjoining sections; corner landings stay clear for turning.
export function bespinArchStations(run,width,spacing,offset=0,terminalStart=true,terminalEnd=true){const depth=1.94594*width/profile.width,gap=Math.max(spacing,depth+.15),first=((gap/2-offset)%gap+gap)%gap,stations=[];for(let z=first;z<run-1e-6;z+=gap)if((!terminalStart||z>=depth/2)&&(!terminalEnd||z<=run-depth/2))stations.push(z);return stations;}
export function buildBespinArches(part,l,r,world,mesh){
 const s=l.segment;if(s.kind==='landing'&&s.turn!=='straight')return;
 const k=l.width/profile.width,clearHalf=Math.max(.05,l.width/2-r.panelThickness),innerHalf=profile.innerWidth/2;
 const segments=part.route.segments,compatible=q=>q&&q.railing?.style==='bespin-arches'&&(q.railing.spacing??2)===r.spacing&&(q.width??part.route.width)===l.width&&q.turn==='straight';let offset=0;
 if(!s.branchFrom)for(let i=l.index-1;i>=0;i--){const previous=segments[i];if(!compatible(previous))break;offset+=previous.run;if(previous.branchFrom)break;}
 const next=segments[l.index+1],terminalEnd=!compatible(next)||!!next.branchFrom;
 const heightScale=Math.max(k,(2.45-r.height)/2.42853),stations=bespinArchStations(s.run,l.width,r.spacing,offset,offset===0,terminalEnd);
 for(const z of stations){const vertices=profile.vertices.map(([x,y,d])=>{const ax=Math.abs(x),across=Math.sign(x)*(ax<=innerHalf?ax/innerHalf*clearHalf:clearHalf+(ax-innerHalf)/(.48156)*r.panelThickness),along=z+d*k,rise=s.kind==='landing'?0:s.rise*along/s.run;return world(across,rise+r.height+y*heightScale,along);}),positions=[];
 // Blender Z-up -> route Y-up reverses handedness.
 for(const face of profile.faces)for(const i of [...face].reverse())positions.push(...vertices[i].toArray());
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setAttribute('uv',new T.Float32BufferAttribute(positions.flatMap((_,i)=>i%3===0?[positions[i],positions[i+1]]:[]),2));g.computeVertexNormals();g.userData.walkwayProfile='bespin-arch';g.userData.archStation=z;mesh(g);
 }
}
