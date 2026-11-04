// Shared underside profile for stair flights and their solid side panels.
export function routeBacking(route,s){
 const thickness=s.thickness??route.thickness;
 return thickness+(s.kind==='stairs'?(s.treadThickness??Math.min(.08,thickness)):0);
}
export function enclosedRouteSide(s,side){return !!s.hallway||(['solid','bespin','bespin-arches'].includes(s.railing?.style)&&(s.railing.sides===undefined||s.railing.sides==='both'||s.railing.sides===side));}
