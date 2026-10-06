const crypto = require('node:crypto');
const {promisify} = require('node:util');
const scrypt = promisify(crypto.scrypt);
const MAX_FILE_SIZE = 50 * 1024 * 1024;

class HttpError extends Error {
    constructor(status, message) { super(message); this.status = status; }
}
const digest = value => crypto.createHash('sha256').update(value).digest('hex');
async function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = await scrypt(password, salt, 64);
    return `scrypt$${salt}$${hash.toString('hex')}`;
}
async function verifyPassword(password, stored) {
    if (typeof password !== 'string' || password.length > 256) return false;
    const parts = String(stored).split('$');
    if (parts.length !== 3 || parts[0] !== 'scrypt' || !/^[a-f0-9]{32}$/.test(parts[1]) || !/^[a-f0-9]{128}$/.test(parts[2])) return false;
    const actual = await scrypt(password, parts[1], 64);
    return crypto.timingSafeEqual(actual, Buffer.from(parts[2], 'hex'));
}
function tokenHash(req) {
    const cookie = String(req.headers.cookie || '').split(';').map(s => s.trim()).find(s => s.startsWith('central_session='));
    const token = cookie?.slice('central_session='.length);
    return /^[a-f0-9]{64}$/.test(token || '') ? digest(token) : '';
}
function sameOrigin(req) {
    let origin;
    try { origin = new URL(req.headers.origin); } catch { throw new HttpError(403, 'Origem da solicitação inválida.'); }
    if (origin.host !== req.headers.host || !['http:', 'https:'].includes(origin.protocol)) throw new HttpError(403, 'Origem da solicitação inválida.');
}
function text(value, max, name, required = true) {
    if (typeof value !== 'string' || value.trim().length > max || (required && !value.trim())) throw new HttpError(400, `${name} inválido.`);
    return value.trim();
}
function id(value) {
    const result = Number(value);
    if (!Number.isSafeInteger(result) || result < 1) throw new HttpError(400, 'Código inválido.');
    return result;
}
function fileName(value) {
    const name = text(value, 180, 'Nome do arquivo').replace(/[\\/\x00-\x1f\x7f]/g, '_');
    if (name === '.' || name === '..') throw new HttpError(400, 'Nome do arquivo inválido.');
    return name;
}
function uploadSize(value) {
    if (!Number.isSafeInteger(value) || value < 1 || value > MAX_FILE_SIZE) throw new HttpError(400, 'Selecione um arquivo não vazio de até 50 MB.');
    return value;
}
function materialInput(body) {
    if (typeof body.published !== 'boolean') throw new HttpError(400, 'Informe a visibilidade do material.');
    return {title: text(body.title,160,'Título'),description: text(body.description ?? '',2000,'Descrição',false),category_id: id(body.category_id),published: body.published};
}
module.exports = {HttpError,digest,hashPassword,verifyPassword,tokenHash,sameOrigin,text,id,fileName,uploadSize,materialInput,MAX_FILE_SIZE};
