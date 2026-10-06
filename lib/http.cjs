const {HttpError} = require('./security.cjs');
function json(res,status,data) {res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify(data));}
function headers(res) {res.setHeader('Cache-Control','private, no-store');res.setHeader('X-Content-Type-Options','nosniff');}
function error(res,e) {
    if (res.headersSent) {res.destroy();return;}
    if (e.code === '23505') return json(res,409,{error:'Já existe um cadastro com esse nome ou arquivo.'});
    if (e.code === '23503' || e.code === '23001') return json(res,409,{error:'A disciplina está em uso ou não existe. Transfira os materiais antes de excluir.'});
    if (!(e instanceof HttpError)) console.error('Central: falha', e.code || e.name);
    json(res,e.status || 503,{error:e.status ? e.message : 'Não foi possível concluir. Confira a configuração ou tente novamente.'});
}
function body(req) {
    if (!req.headers['content-type']?.startsWith('application/json')) throw new HttpError(415,'Envie os dados em JSON.');
    if (typeof req.body === 'string') {try {return JSON.parse(req.body);} catch {throw new HttpError(400,'Dados inválidos.');}}
    if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) throw new HttpError(400,'Dados inválidos.');
    return req.body;
}
module.exports = {json,headers,error,body};
