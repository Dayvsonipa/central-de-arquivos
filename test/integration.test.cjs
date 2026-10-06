const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {Writable}=require('node:stream');
const {PGlite}=require('@electric-sql/pglite');
const Module=require('node:module');
const {hashPassword}=require('../lib/security.cjs');

test('fluxos completos em PostgreSQL: sessão, categorias, uploads, CRUD, publicação e migração',async(t)=>{
    const engine=new PGlite();await engine.exec(fs.readFileSync('sql/schema.sql','utf8'));
    const query=async(sql,params)=>{const result=await engine.query(sql,params);return {...result,rowCount:result.rows.length || result.affectedRows || 0};};
    const database={query,connect:async()=>({query,release(){}})};
    const blobs=new Map();
    const mockBlob={
        head:async(path)=>{if(!blobs.has(path))throw new Error('missing');return {pathname:path,size:blobs.get(path).length};},
        get:async(path)=>blobs.has(path)?{statusCode:200,stream:new ReadableStream({start(c){c.enqueue(blobs.get(path));c.close();}})}:null,
        del:async(path)=>{blobs.delete(path);},
        put:async(path,value)=>{blobs.set(path,Buffer.from(value));return {pathname:path};}
    };
    const originalLoad=Module._load;
    Module._load=function(name,parent,isMain){if(name==='@vercel/blob')return mockBlob;if(name==='@vercel/blob/client')return {handleUpload:async(options)=>({token:await options.onBeforeGenerateToken(options.body.payload.pathname,options.body.payload.clientPayload,false)})};return originalLoad.call(this,name,parent,isMain);};
    require.cache[require.resolve('../lib/db.cjs')]={exports:{db:()=>database}};
    const handler=require('../api/central.js'),uploadHandler=require('../api/upload.js');
    Module._load=originalLoad;
    const originalFetch=global.fetch;
    global.fetch=async(url)=>{
        const source=require('../lib/legacy.json').find(file=>url===`https://dayvsonipa.github.io/central-de-arquivos/${encodeURI(file.key)}`);
        assert.ok(source,'A migração só pode buscar um caminho fixo da central original.');
        return new Response(`Conteúdo simulado: ${source.filename}`,{status:200});
    };
    process.env.ADMIN_USERNAME='dayvson';process.env.ADMIN_PASSWORD_HASH=await hashPassword('senha de teste forte');
    let cookie='';
    async function call(action,data,options={}) {
        const req={url:options.upload?'/api/upload':`/api/central?action=${action}`,method:data===undefined?'GET':'POST',body:data,headers:{host:'central.test',origin:options.origin ?? 'http://central.test','content-type':'application/json',cookie:options.anonymous?'':cookie,'x-vercel-forwarded-for':options.ip || '10.0.0.1'},socket:{remoteAddress:'10.0.0.1'}};
        const chunks=[],responseHeaders={};
        const res=new Writable({write(chunk,encoding,done){chunks.push(Buffer.from(chunk));done();}});
        res.statusCode=200;res.setHeader=(key,value)=>{responseHeaders[key.toLowerCase()]=value;};
        const done=new Promise((resolve,reject)=>{res.on('finish',resolve);res.on('error',reject);});
        await (options.upload?uploadHandler:handler)(req,res);await done;
        const bytes=Buffer.concat(chunks);let result;try{result=JSON.parse(bytes.toString());}catch{result=bytes.toString();}
        return {status:res.statusCode,body:result,headers:responseHeaders};
    }
    let materialId,categoryId;
    await t.test('login, cookie HttpOnly e defesa contra CSRF',async()=>{
        assert.equal((await call('manage')).status,401);
        assert.equal((await call('login',{username:'dayvson',password:'errada'})).status,401);
        const login=await call('login',{username:'dayvson',password:'senha de teste forte'});
        assert.equal(login.status,200);assert.match(login.headers['set-cookie'],/HttpOnly; SameSite=Strict/);cookie=login.headers['set-cookie'].split(';')[0];
        assert.equal((await call('session')).body.username,'dayvson');
        assert.equal((await call('save-category',{name:'Python'},{origin:'https://malicioso.test'})).status,403);
    });
    await t.test('disciplinas: criar, renomear e impedir duplicação',async()=>{
        const create=await call('save-category',{name:'Python'});assert.equal(create.status,200);categoryId=create.body.id;
        assert.equal((await call('save-category',{name:'python'})).status,409);
        assert.equal((await call('save-category',{id:categoryId,name:'Programação Python'})).status,200);
        assert.equal((await call('save-category',{id:999,name:'Nada'})).status,404);
    });
    let stage;
    await t.test('uploads autorizados por sessão e caminho, tamanho real verificado',async()=>{
        assert.equal((await call('prepare-upload',{filename:'x.py',size:5},{anonymous:true})).status,401);
        stage=(await call('prepare-upload',{filename:'teste.py',size:5})).body;
        const body={type:'blob.generate-client-token',payload:{pathname:stage.pathname,clientPayload:stage.upload_id}};
        const token=await call('',body,{upload:true});assert.equal(token.status,200);assert.equal(token.body.token.maximumSizeInBytes,5);
        assert.equal((await call('',body,{upload:true,anonymous:true})).status,401);
        assert.equal((await call('',{...body,payload:{...body.payload,pathname:'outro'}},{upload:true})).status,403);
        blobs.set(stage.pathname,Buffer.from('x'));
        assert.equal((await call('save-material',{title:'Teste',description:'',category_id:categoryId,published:false,upload_id:stage.upload_id})).status,400);
        blobs.set(stage.pathname,Buffer.from('teste'));
    });
    await t.test('material oculto, download privado, publicação e proteção de disciplina em uso',async()=>{
        const save=await call('save-material',{title:'Teste',description:'Descrição',category_id:categoryId,published:false,upload_id:stage.upload_id});assert.equal(save.status,200);materialId=save.body.id;
        assert.equal((await call('catalog')).body.materials.length,0);
        assert.equal((await call(`download&id=${materialId}`,undefined,{anonymous:true})).status,401);
        assert.equal((await call(`download&id=${materialId}`)).body,'teste');
        assert.equal((await call('save-material',{title:'Duplicado',description:'',category_id:categoryId,published:true,upload_id:stage.upload_id})).status,400);
        assert.equal((await call('visibility',{id:materialId,published:true})).status,200);
        assert.equal((await call('catalog')).body.materials.length,1);
        const download=await call(`download&id=${materialId}`,undefined,{anonymous:true});assert.equal(download.body,'teste');assert.match(download.headers['content-disposition'],/filename\*=UTF-8/);
        assert.equal((await call('delete-category',{id:categoryId})).status,409);
    });
    await t.test('substituição atômica, limpeza e exclusão',async()=>{
        const next=(await call('prepare-upload',{filename:'novo.py',size:4})).body;blobs.set(next.pathname,Buffer.from('novo'));
        assert.equal((await call('save-material',{id:materialId,title:'Atualizado',description:'',category_id:categoryId,published:true,upload_id:next.upload_id})).status,200);
        await call('cleanup',{});assert.equal(blobs.has(stage.pathname),false);
        assert.equal((await call(`download&id=${materialId}`,undefined,{anonymous:true})).body,'novo');
        assert.equal((await call('delete-material',{id:materialId})).status,200);assert.equal(blobs.has(next.pathname),false);
        assert.equal((await call(`download&id=${materialId}`,undefined,{anonymous:true})).status,404);
        assert.equal((await call('delete-category',{id:categoryId})).status,200);
    });
    await t.test('migração preserva os sete arquivos e não duplica',async()=>{
        const original=require('../lib/legacy.json');assert.equal(original.length,7);
        assert.equal((await call('legacy-list',{})).body.materials.length,7);
        for(const file of original)assert.equal((await call('legacy-import',{key:file.key})).status,200);
        assert.equal((await call('legacy-list',{})).body.materials.length,0);
        await call('legacy-import',{key:original[0].key});
        const catalog=(await call('catalog')).body.materials;assert.equal(catalog.length,7);
        for(const file of original){const m=catalog.find(x=>x.title===file.title);assert.ok(m);assert.equal((await call(`download&id=${m.id}`,undefined,{anonymous:true})).body,`Conteúdo simulado: ${file.filename}`);assert.equal('base64' in file,false);}
    });
    await t.test('trocar senha revoga sessões e aceita somente nova senha',async()=>{
        assert.equal((await call('password',{current_password:'errada',new_password:'nova senha de teste'})).status,400);
        assert.equal((await call('password',{current_password:'senha de teste forte',new_password:'nova senha de teste'})).status,200);
        assert.equal((await call('manage')).status,401);
        assert.equal((await call('login',{username:'dayvson',password:'senha de teste forte'},{ip:'10.0.0.2'})).status,401);
        assert.equal((await call('login',{username:'dayvson',password:'nova senha de teste'},{ip:'10.0.0.2'})).status,200);
    });
    await t.test('limite persistente de tentativas de login',async()=>{
        for(let i=0;i<10;i++)assert.equal((await call('login',{username:'dayvson',password:'errada'},{ip:'10.0.0.3'})).status,401);
        const limited=await call('login',{username:'dayvson',password:'errada'},{ip:'10.0.0.3'});assert.equal(limited.status,429);assert.equal(limited.headers['retry-after'],'900');
    });
    global.fetch=originalFetch;
    await engine.close();
});
