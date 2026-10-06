const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root=path.resolve('public');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'};
http.createServer(async(req,res)=>{
    try {
        const url=new URL(req.url,'http://localhost');
        if(['/api/central','/api/upload'].includes(url.pathname)) {
            const chunks=[];let size=0;
            for await(const chunk of req){size+=chunk.length;if(size>65536){res.statusCode=413;res.end();return;}chunks.push(chunk);}
            const raw=Buffer.concat(chunks).toString();
            if(raw){try{req.body=JSON.parse(raw);}catch{res.statusCode=400;res.end(JSON.stringify({error:'JSON inválido.'}));return;}}
            return await require('../api/'+url.pathname.split('/').pop()+'.js')(req,res);
        }
        const filename=url.pathname==='/'?'index.html':url.pathname==='/admin'?'admin.html':decodeURIComponent(url.pathname).slice(1);
        const file=path.resolve(root,filename);
        if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.statusCode=404;res.end('Não encontrado');return;}
        res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);
    }catch{if(!res.headersSent){res.statusCode=500;res.end('Não foi possível concluir.');}else res.destroy();}
}).listen(3000,()=>console.log('Central: http://localhost:3000 — Painel: http://localhost:3000/admin'));
