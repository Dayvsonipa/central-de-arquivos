const {Pool} = require('pg');
let pool;
function db() {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL não configurada.');
    if (!pool) pool = new Pool({connectionString: process.env.DATABASE_URL, max: 2, idleTimeoutMillis: 10000, connectionTimeoutMillis: 15000});
    return pool;
}
module.exports = {db};
