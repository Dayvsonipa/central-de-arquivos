const {handleUpload} = require('@vercel/blob/client');
const {db} = require('../lib/db.cjs');
const {admin} = require('../lib/auth.cjs');
const {sameOrigin,HttpError} = require('../lib/security.cjs');
const {json,headers,error,body} = require('../lib/http.cjs');

module.exports = async function handler(req,res) {
    headers(res);
    try {
        if (req.method !== 'POST') throw new HttpError(405,'Método não permitido.');
        const payload = body(req);
        const response = await handleUpload({
            body:payload,
            request:req,
            onBeforeGenerateToken:async(pathname,clientPayload)=>{
                sameOrigin(req);
                const session = await admin(req);
                if (!/^[a-f0-9-]{36}$/.test(clientPayload || '')) throw new HttpError(400,'Upload inválido.');
                const stage = (await db().query('SELECT * FROM central_uploads WHERE id=$1 AND pathname=$2 AND owner_hash=$3 AND consumed=false AND expires_at>now()',[clientPayload,pathname,session.hash])).rows[0];
                if (!stage) throw new HttpError(403,'Envio não autorizado.');
                return {allowedContentTypes:['application/octet-stream'],maximumSizeInBytes:Number(stage.expected_size),addRandomSuffix:false,allowOverwrite:false,validUntil:Date.now()+5*60*1000,tokenPayload:stage.id};
            },
            // SDK verifies the callback signature. Never use an unverified callback to publish.
            onUploadCompleted:async()=>{}
        });
        json(res,200,response);
    } catch(e) {error(res,e);}
};
