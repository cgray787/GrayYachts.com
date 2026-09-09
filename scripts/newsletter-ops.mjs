// Machine-local secret provisioning and an authenticated run of the due issue.
// This script never prints credentials or review tokens.
import {mkdirSync,existsSync,writeFileSync,readFileSync} from 'node:fs';
import {homedir} from 'node:os';
import {join} from 'node:path';
import {randomBytes} from 'node:crypto';
import {spawnSync} from 'node:child_process';
const dir=join(homedir(),'.config','grayyachts');
const path=join(dir,'newsletter-automation-secret');
const action=process.argv[2];
if(action==='configure') {
 mkdirSync(dir,{recursive:true,mode:0o700});
 if(!existsSync(path))writeFileSync(path,randomBytes(32).toString('hex'),{mode:0o600});
 const result=spawnSync('node_modules/.bin/wrangler',['secret','put','NEWSLETTER_AUTOMATION_SECRET'],{input:readFileSync(path,'utf8'),encoding:'utf8'});
 if(result.status!==0) {console.error('Secret upload failed. Verify Cloudflare authentication.');process.exit(1);}
 console.log('Newsletter signing secret configured; credential remains machine-local.');
} else if(action==='run' || action==='status') {
 const response=await fetch('https://grayyachts.com/api/newsletter/run',{method:action==='run'?'POST':'GET',headers:{authorization:`Bearer ${readFileSync(path,'utf8').trim()}`},signal:AbortSignal.timeout(420000)});
 console.log('Run HTTP status:',response.status);
 console.log(await response.text());
 if(!response.ok)process.exit(1);
} else {
 console.error('Usage: node scripts/newsletter-ops.mjs configure|run|status');process.exit(2);
}
