const fs = require('node:fs');
const crypto = require('node:crypto');
const file = process.argv[2];
const b = fs.readFileSync(file), pe=b.readUInt32LE(60), n=b.readUInt16LE(pe+6), opt=pe+24;
const base=b.readUInt32LE(opt+28), sections=[];
for(let i=0;i<n;i++){let s=opt+b.readUInt16LE(pe+20)+i*40;sections.push({name:b.toString('ascii',s,s+8).replace(/\0/g,''),rva:b.readUInt32LE(s+12),size:b.readUInt32LE(s+16),offset:b.readUInt32LE(s+20)});}
const strings=[];
for(const m of b.toString('latin1').matchAll(/[\x20-\x7e]{6,}/g)){
 if(!/building|rigblock|editor.*(snap|symmetr|paint|deform)|cEditorResource|EditorHandle/i.test(m[0])||m[0].length>300)continue;
 const s=sections.find(s=>m.index>=s.offset&&m.index<s.offset+s.size);
 strings.push({offset:'0x'+m.index.toString(16),va:s?'0x'+(base+s.rva+m.index-s.offset).toString(16):null,text:m[0]});
}
console.log(JSON.stringify({file,sha256:crypto.createHash('sha256').update(b).digest('hex'),machine:'0x'+b.readUInt16LE(pe+4).toString(16),imageBase:'0x'+base.toString(16),sections,strings},null,2));
