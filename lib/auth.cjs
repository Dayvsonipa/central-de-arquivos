const {db} = require('./db.cjs');
const {HttpError,tokenHash,digest} = require('./security.cjs');
async function admin(req) {
    const hash = tokenHash(req);
    if (!hash) throw new HttpError(401,'Entre no painel para continuar.');
    const result = await db().query('SELECT s.token_hash, a.username, a.password_hash FROM central_sessions s JOIN central_admin a ON a.id=1 WHERE s.token_hash=$1 AND s.expires_at > now()', [hash]);
    const row = result.rows[0];
    if (!row) throw new HttpError(401,'Sua sessão terminou. Entre novamente.');
    const session = await db().query('SELECT auth_version FROM central_sessions WHERE token_hash=$1',[hash]);
    if (session.rows[0]?.auth_version !== digest(row.password_hash)) throw new HttpError(401,'Entre novamente no painel.');
    return {hash,username:row.username,password_hash:row.password_hash};
}
function cookie(req,token='',maxAge=0) {
    const secure = process.env.VERCEL || req.headers['x-forwarded-proto'] === 'https';
    return `central_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure ? '; Secure' : ''}`;
}
module.exports = {admin,cookie};
