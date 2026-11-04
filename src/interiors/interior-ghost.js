import {adjoiningHulls} from './hull-network.js';
import {roomHullNeighbors} from './room-route.js';
// A connected interior may extend beyond the host's touching hull network.
export function interiorEditHulls(part,host,parts){const candidates=[...(host||part.interior.shell?adjoiningHulls(host||part,parts):[]),...roomHullNeighbors(part,parts)];return [...new Map(candidates.map(p=>[p.id,p])).values()];}
// Restore hulls as soon as the draft leaves them, preserving pre-edit visibility.
export function syncGhostVisibility(previous,hulls,meshes,ownerId){const wanted=new Set(hulls.filter(p=>p.id!==ownerId).map(p=>meshes.get(p.id)).filter(Boolean)),next=[];for(const [mesh,visible] of previous){if(wanted.delete(mesh)){mesh.visible=false;next.push([mesh,visible]);}else mesh.visible=visible;}for(const mesh of wanted){next.push([mesh,mesh.visible]);mesh.visible=false;}return next;}
