import {readFile,readdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const pkg=JSON.parse(await readFile(path.join(root,'package.json'),'utf8'));
if(process.argv.includes('--checksums')){
 const output=path.join(root,'dist'),names=(await readdir(output)).filter(n=>/^Wonderblocks-.*\.(exe|zip)$/.test(n)).sort();
 if(!names.some(n=>n.endsWith('-setup.exe'))||!names.some(n=>n.endsWith('.zip')))throw Error('Missing Windows installer or portable ZIP.');
 const rows=[];for(const name of names)rows.push(createHash('sha256').update(await readFile(path.join(output,name))).digest('hex')+'  '+name);
 await writeFile(path.join(output,'SHA256SUMS.txt'),rows.join('\n')+'\n');console.log('Checksums written for '+names.length+' release downloads.');
}else{
 const tag=process.env.GITHUB_REF_TYPE==='tag'?process.env.GITHUB_REF_NAME:null;
 if(tag&&tag!=='v'+pkg.version)throw Error(`Tag ${tag} must match package.json version v${pkg.version}. Update the version before tagging.`);
 console.log('Release version: '+pkg.version+(tag?' · '+tag:''));
}
