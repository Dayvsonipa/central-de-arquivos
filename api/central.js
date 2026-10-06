const crypto = require('node:crypto');
const {Readable} = require('node:stream');
const {pipeline} = require('node:stream/promises');
const {head,get,del,put} = require('@vercel/blob');
const {db} = require('../lib/db.cjs');
const {admin,cookie} = require('../lib/auth.cjs');
const {HttpError,digest,hashPassword,verifyPassword,sameOrigin,text,id,fileName,uploadSize,materialInput} = require('../lib/security.cjs');
const {json,headers,error,body} = require('../lib/http.cjs');

const columns = 'm.id,m.title,m.description,m.category_id,c.name AS category,m.filename,m.size_bytes,m.published,m.downloads,m.created_at,m.updated_at';
async function cleanup() {
    // Expired staging records are collected too, including abandoned uploads.
    await db().query('INSERT INTO central_blob_cleanup(pathname) SELECT pathname FROM central_uploads WHERE expires_at < now() AND consumed=false ON CONFLICT DO NOTHING');
    const rows = await db().query('SELECT pathname FROM central_blob_cleanup ORDER BY created_at LIMIT 20');
    let pending = 0;
    for (const row of rows.rows) {
        try {await del(row.pathname);await db().query('DELETE FROM central_blob_cleanup WHERE pathname=$1',[row.pathname]);}
        catch {pending++;}
    }
    await db().query('DELETE FROM central_uploads WHERE expires_at < now()');
    await db().query('DELETE FROM central_sessions WHERE expires_at < now()');
    await db().query("DELETE FROM central_login_limits WHERE window_start < now() - interval '1 day'");
    return pending;
}

module.exports = async function handler(req,res) {
    headers(res);
    try {
        const url = new URL(req.url,'http://localhost');
        const action = url.searchParams.get('action') || 'catalog';
        if (req.method === 'GET' && action === 'catalog') {
            const rows = await db().query(`SELECT ${columns} FROM central_materials m JOIN central_categories c ON c.id=m.category_id WHERE m.published=true ORDER BY m.created_at DESC,m.id DESC`);
            return json(res,200,{materials:rows.rows});
        }
        if (req.method === 'GET' && action === 'download') {
            const result = await db().query('SELECT * FROM central_materials WHERE id=$1',[id(url.searchParams.get('id'))]);
            const material = result.rows[0];
            if (!material) throw new HttpError(404,'Arquivo não encontrado.');
            if (!material.published) await admin(req);
            const blob = await get(material.blob_path,{access:'private'});
            if (!blob || blob.statusCode !== 200) throw new HttpError(404,'Arquivo indisponível.');
            res.setHeader('Content-Type','application/octet-stream');
            res.setHeader('Content-Disposition',`attachment; filename="arquivo-${material.id}"; filename*=UTF-8''${encodeURIComponent(material.filename).replace(/['()*]/g,c=>'%'+c.charCodeAt(0).toString(16))}`);
            await db().query('UPDATE central_materials SET downloads=downloads+1 WHERE id=$1',[material.id]);
            res.statusCode=200;
            return await pipeline(Readable.fromWeb(blob.stream),res);
        }
        if (req.method === 'GET' && action === 'session') {
            const session = await admin(req);
            return json(res,200,{username:session.username});
        }
        if (req.method === 'GET' && action === 'manage') {
            await admin(req);
            const materials = await db().query(`SELECT ${columns} FROM central_materials m JOIN central_categories c ON c.id=m.category_id ORDER BY m.created_at DESC,m.id DESC`);
            const categories = await db().query('SELECT c.id,c.name,count(m.id)::integer AS materials FROM central_categories c LEFT JOIN central_materials m ON m.category_id=c.id GROUP BY c.id,c.name ORDER BY c.name');
            return json(res,200,{materials:materials.rows,categories:categories.rows});
        }
        if (req.method !== 'POST') throw new HttpError(405,'Método não permitido.');
        sameOrigin(req);
        const data = body(req);
        if (action === 'login') {
            const username = text(data.username,100,'Usuário');
            if (typeof data.password !== 'string' || data.password.length > 256) throw new HttpError(400,'Senha inválida.');
            if (!process.env.ADMIN_PASSWORD_HASH || !/^scrypt\$[a-f0-9]{32}\$[a-f0-9]{128}$/.test(process.env.ADMIN_PASSWORD_HASH)) throw new HttpError(503,'Configure o acesso do professor na Vercel.');
            await db().query('INSERT INTO central_admin(id,username,password_hash) VALUES(1,$1,$2) ON CONFLICT(id) DO NOTHING',[process.env.ADMIN_USERNAME || 'dayvson',process.env.ADMIN_PASSWORD_HASH]);
            const ip = String(req.headers['x-vercel-forwarded-for'] || req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
            const limitKey = digest(ip);
            const limit = await db().query(`INSERT INTO central_login_limits(key,attempts,window_start) VALUES($1,1,now()) ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN central_login_limits.window_start < now()-interval '15 minutes' THEN 1 ELSE central_login_limits.attempts+1 END,window_start=CASE WHEN central_login_limits.window_start < now()-interval '15 minutes' THEN now() ELSE central_login_limits.window_start END RETURNING attempts`,[limitKey]);
            if (limit.rows[0].attempts > 10) {res.setHeader('Retry-After','900');throw new HttpError(429,'Muitas tentativas. Aguarde 15 minutos para tentar novamente.');}
            const account = (await db().query('SELECT * FROM central_admin WHERE id=1')).rows[0];
            const valid = await verifyPassword(data.password,account.password_hash);
            if (!valid || username !== account.username) throw new HttpError(401,'Usuário ou senha incorretos.');
            const token = crypto.randomBytes(32).toString('hex');
            await db().query("INSERT INTO central_sessions(token_hash,auth_version,expires_at) VALUES($1,$2,now()+interval '12 hours')",[digest(token),digest(account.password_hash)]);
            res.setHeader('Set-Cookie',cookie(req,token,43200));
            return json(res,200,{username:account.username});
        }
        const session = await admin(req);
        if (action === 'logout') {
            await db().query('DELETE FROM central_sessions WHERE token_hash=$1',[session.hash]);
            res.setHeader('Set-Cookie',cookie(req));return json(res,200,{ok:true});
        }
        if (action === 'password') {
            if (!await verifyPassword(data.current_password,session.password_hash)) throw new HttpError(400,'A senha atual está incorreta.');
            if (typeof data.new_password !== 'string' || data.new_password.length < 12 || data.new_password.length > 256) throw new HttpError(400,'Use uma senha com 12 a 256 caracteres.');
            const newHash = await hashPassword(data.new_password);
            const result = await db().query('UPDATE central_admin SET password_hash=$1 WHERE id=1 AND password_hash=$2 RETURNING id',[newHash,session.password_hash]);
            if (!result.rowCount) throw new HttpError(409,'A senha já foi alterada. Entre novamente.');
            await db().query('DELETE FROM central_sessions');
            res.setHeader('Set-Cookie',cookie(req));return json(res,200,{ok:true});
        }
        if (action === 'prepare-upload') {
            const filename = fileName(data.filename), size = uploadSize(data.size);
            const uploadId = crypto.randomUUID();
            const safe = filename.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9._-]/g,'_');
            const pathname = `materiais/${uploadId}/${safe}`;
            await db().query("INSERT INTO central_uploads(id,pathname,filename,owner_hash,expected_size,expires_at) VALUES($1,$2,$3,$4,$5,now()+interval '15 minutes')",[uploadId,pathname,filename,session.hash,size]);
            return json(res,200,{upload_id:uploadId,pathname});
        }
        if (action === 'save-material') {
            const input = materialInput(data);
            const materialId = data.id == null ? null : id(data.id);
            let stage, metadata;
            if (data.upload_id) {
                if (!/^[a-f0-9-]{36}$/.test(data.upload_id)) throw new HttpError(400,'Upload inválido.');
                stage = (await db().query('SELECT * FROM central_uploads WHERE id=$1 AND owner_hash=$2 AND consumed=false AND expires_at>now()',[data.upload_id,session.hash])).rows[0];
                if (!stage) throw new HttpError(400,'O envio expirou. Selecione o arquivo novamente.');
                metadata = await head(stage.pathname);
                if (metadata.pathname !== stage.pathname || metadata.size !== Number(stage.expected_size)) throw new HttpError(400,'O arquivo enviado está incompleto.');
                uploadSize(metadata.size);
            } else if (!materialId) throw new HttpError(400,'Selecione um arquivo.');
            const client = await db().connect();
            let saved;
            try {
                await client.query('BEGIN');
                if (stage) {
                    const locked = await client.query('SELECT id FROM central_uploads WHERE id=$1 AND consumed=false AND expires_at>now() FOR UPDATE',[stage.id]);
                    if (!locked.rowCount) throw new HttpError(409,'Esse upload já foi usado ou expirou.');
                }
                if (materialId) {
                    const old = (await client.query('SELECT * FROM central_materials WHERE id=$1 FOR UPDATE',[materialId])).rows[0];
                    if (!old) throw new HttpError(404,'Material não encontrado.');
                    saved = await client.query('UPDATE central_materials SET title=$1,description=$2,category_id=$3,published=$4,filename=$5,blob_path=$6,size_bytes=$7,updated_at=now() WHERE id=$8 RETURNING id',[input.title,input.description,input.category_id,input.published,stage?.filename || old.filename,stage?.pathname || old.blob_path,metadata?.size || old.size_bytes,materialId]);
                    if (stage) await client.query('INSERT INTO central_blob_cleanup(pathname) VALUES($1) ON CONFLICT DO NOTHING',[old.blob_path]);
                } else {
                    saved = await client.query('INSERT INTO central_materials(title,description,category_id,published,filename,blob_path,size_bytes) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id',[input.title,input.description,input.category_id,input.published,stage.filename,stage.pathname,metadata.size]);
                }
                if (stage) await client.query('UPDATE central_uploads SET consumed=true WHERE id=$1',[stage.id]);
                await client.query('COMMIT');
            } catch(e) {await client.query('ROLLBACK');throw e;} finally {client.release();}
            return json(res,200,{ok:true,id:saved.rows[0].id});
        }
        if (action === 'visibility') {
            if (typeof data.published !== 'boolean') throw new HttpError(400,'Visibilidade inválida.');
            const result = await db().query('UPDATE central_materials SET published=$1,updated_at=now() WHERE id=$2 RETURNING id',[data.published,id(data.id)]);
            if (!result.rowCount) throw new HttpError(404,'Material não encontrado.');
            return json(res,200,{ok:true});
        }
        if (action === 'delete-material') {
            const result = await db().query('WITH removed AS (DELETE FROM central_materials WHERE id=$1 RETURNING blob_path) INSERT INTO central_blob_cleanup(pathname) SELECT blob_path FROM removed ON CONFLICT DO NOTHING RETURNING pathname',[id(data.id)]);
            if (!result.rowCount) throw new HttpError(404,'Material não encontrado.');
            return json(res,200,{ok:true,cleanup_pending:await cleanup()});
        }
        if (action === 'save-category') {
            const name = text(data.name,100,'Nome da disciplina');
            let result;
            if (data.id != null) {
                result = await db().query('UPDATE central_categories SET name=$1 WHERE id=$2 RETURNING id',[name,id(data.id)]);
                if (!result.rowCount) throw new HttpError(404,'Disciplina não encontrada.');
            } else result = await db().query('INSERT INTO central_categories(name) VALUES($1) RETURNING id',[name]);
            return json(res,200,{ok:true,id:result.rows[0].id});
        }
        if (action === 'delete-category') {
            const result = await db().query('DELETE FROM central_categories WHERE id=$1 RETURNING id',[id(data.id)]);
            if (!result.rowCount) throw new HttpError(404,'Disciplina não encontrada.');
            return json(res,200,{ok:true});
        }
        if (action === 'cleanup') return json(res,200,{ok:true,cleanup_pending:await cleanup()});
        if (action === 'legacy-list') {
            const legacy = require('../lib/legacy.json');
            const imported = await db().query('SELECT legacy_key FROM central_materials WHERE legacy_key IS NOT NULL');
            return json(res,200,{materials:legacy.filter(x=>!imported.rows.some(y=>y.legacy_key===x.key)).map(x=>({key:x.key,title:x.title}))});
        }
        if (action === 'legacy-import') {
            const item = require('../lib/legacy.json').find(x=>x.key===data.key);
            if (!item) throw new HttpError(404,'Material original não encontrado.');
            const imported = await db().query('SELECT id FROM central_materials WHERE legacy_key=$1',[item.key]);
            if (imported.rowCount) return json(res,200,{ok:true});
            // Fixed source list only. No personal data is embedded in the migration package.
            const response = await fetch(`https://dayvsonipa.github.io/central-de-arquivos/${encodeURI(item.key)}`, {signal:AbortSignal.timeout(15000)});
            if (!response.ok) throw new HttpError(502,'Não foi possível buscar o material no site original. Tente novamente ou envie-o pelo painel.');
            const content = Buffer.from(await response.arrayBuffer());
            uploadSize(content.length);
            // Random path prevents concurrent imports from overwriting each other.
            const pathname = `materiais/${crypto.randomUUID()}/${fileName(item.filename)}`;
            await put(pathname,content,{access:'private',contentType:'application/octet-stream',addRandomSuffix:false});
            try {
                const category = await db().query('INSERT INTO central_categories(name) VALUES($1) ON CONFLICT (lower(name)) DO UPDATE SET name=central_categories.name RETURNING id',[item.category]);
                await db().query('INSERT INTO central_materials(title,description,category_id,filename,blob_path,size_bytes,published,legacy_key,created_at) VALUES($1,$2,$3,$4,$5,$6,true,$7,$8)',[item.title,item.description,category.rows[0].id,item.filename,pathname,content.length,item.key,item.date]);
            } catch(e) {await db().query('INSERT INTO central_blob_cleanup(pathname) VALUES($1) ON CONFLICT DO NOTHING',[pathname]);throw e;}
            return json(res,200,{ok:true});
        }
        throw new HttpError(404,'Operação não encontrada.');
    } catch(e) {error(res,e);}
};
