const readline = require('node:readline');
const {Writable} = require('node:stream');
const {hashPassword} = require('../lib/security.cjs');
let muted=false;
const output=new Writable({write(chunk,encoding,done){if(!muted)process.stdout.write(chunk);done();}});
const rl=readline.createInterface({input:process.stdin,output,terminal:true});
process.stdout.write('Crie uma senha com pelo menos 12 caracteres. A digitação ficará oculta.\nSenha: ');
muted=true;
rl.question('',async(password)=>{rl.close();process.stdout.write('\n');if(password.length<12||password.length>256){console.error('Use entre 12 e 256 caracteres.');process.exitCode=1;return;}console.log('Copie somente a linha abaixo para ADMIN_PASSWORD_HASH na Vercel:');console.log(await hashPassword(password));});
