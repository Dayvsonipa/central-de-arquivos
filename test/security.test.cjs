const {test}=require('node:test');
const assert=require('node:assert/strict');
const s=require('../lib/security.cjs');
test('senhas usam salt e rejeitam senha incorreta e hash malformado',async()=>{
    const hash=await s.hashPassword('uma senha de teste forte');
    assert.equal(await s.verifyPassword('uma senha de teste forte',hash),true);
    assert.equal(await s.verifyPassword('incorreta',hash),false);
    assert.equal(await s.verifyPassword('incorreta','scrypt$inválido$hash'),false);
    assert.notEqual(await s.hashPassword('uma senha de teste forte'),hash);
});
test('proteção de origem rejeita solicitações externas ou sem origem',()=>{
    s.sameOrigin({headers:{host:'central.example',origin:'https://central.example'}});
    assert.throws(()=>s.sameOrigin({headers:{host:'central.example',origin:'https://outro.example'}}));
    assert.throws(()=>s.sameOrigin({headers:{host:'central.example'}}));
});
test('upload tem limite e sanitiza caminhos e caracteres de controle',()=>{
    assert.equal(s.fileName('../pasta/teste\n.py'),'.._pasta_teste_.py');
    assert.equal(s.uploadSize(50*1024*1024),50*1024*1024);
    assert.throws(()=>s.uploadSize(50*1024*1024+1));
    assert.throws(()=>s.uploadSize(0));
    assert.throws(()=>s.materialInput({title:'Teste',category_id:1,published:'true'}));
});
