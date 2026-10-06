const fs = require('node:fs');
const {db} = require('../lib/db.cjs');
(async()=>{
    const client = await db().connect();
    try {await client.query('BEGIN');await client.query(fs.readFileSync('sql/schema.sql','utf8'));await client.query('COMMIT');console.log('Tabelas da Central de Arquivos criadas.');}
    catch(e) {await client.query('ROLLBACK');console.error('Não foi possível criar as tabelas:',e.code || e.name);process.exitCode=1;}
    finally {client.release();await db().end();}
})();
