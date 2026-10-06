import {upload} from '@vercel/blob/client';

const $ = id => document.getElementById(id);
const escape = value => {const span=document.createElement('span');span.textContent=String(value ?? '');return span.innerHTML.replace(/"/g,'&quot;').replace(/'/g,'&#39;');};
let materials=[],categories=[],busy=false,pendingUpload=null;
const form=$('material-form'), categoryForm=$('category-form');
const bytes = size => Number(size)<1024*1024 ? `${(Number(size)/1024).toFixed(1)} KB` : `${(Number(size)/1024/1024).toFixed(1)} MB`;
function notify(text,isError=false) {$('message').textContent=text;$('message').classList.toggle('error',isError);$('message').hidden=false;}
function signedOut() {$('workspace').hidden=true;$('login-panel').hidden=false;materials=[];categories=[];$('admin-materials').replaceChildren();$('password-form').reset();form.reset();pendingUpload=null;}
async function api(action,data) {
    const response=await fetch(`/api/central?action=${action}`,{method:data===undefined?'GET':'POST',headers:data===undefined?{}:{'Content-Type':'application/json'},body:data===undefined?undefined:JSON.stringify(data),credentials:'same-origin'});
    const result=await response.json().catch(()=>({error:'Resposta inesperada do servidor.'}));
    if (!response.ok) {if(response.status===401 && action!=='login') signedOut();throw new Error(result.error || 'Não foi possível concluir.');}
    return result;
}
async function task(fn) {
    if(busy)return;
    busy=true;const enabled=[...document.querySelectorAll('button,input,select,textarea')].filter(el=>!el.disabled);enabled.forEach(el=>el.disabled=true);
    try {await fn();} catch(e) {notify(e.message,true);} finally {busy=false;enabled.forEach(el=>el.disabled=false);$('upload-progress').hidden=true;}
}
function tab(name) {['materials','categories','settings'].forEach(value=>$(`tab-${value}`).hidden=value!==name);document.querySelectorAll('[data-tab]').forEach(el=>el.classList.toggle('active',el.dataset.tab===name));}
function render() {
    const term=$('admin-search').value.toLocaleLowerCase('pt-BR');
    const visibility=$('visibility-filter').value;
    const filtered=materials.filter(m=>`${m.title} ${m.filename} ${m.category}`.toLocaleLowerCase('pt-BR').includes(term)&&(visibility==='all'||m.published===(visibility==='published')));
    $('admin-materials').innerHTML=filtered.length ? filtered.map(m=>`<article class="material-card"><span class="discipline-tag">${escape(m.category)}</span><span class="status-tag ${m.published?'':'hidden-tag'}">${m.published?'Publicado':'Oculto'}</span><div class="material-info"><h3 title="${escape(m.title)}">${escape(m.title)}</h3><p>${escape(m.description)}</p></div><span class="file-meta">${escape(m.filename)} · ${bytes(m.size_bytes)} · ${Number(m.downloads)} download(s)</span><div class="actions"><button class="button-secondary" data-edit="${m.id}" type="button">Editar</button><button class="button-secondary" data-visibility="${m.id}" type="button">${m.published?'Ocultar':'Publicar'}</button><a class="download-button" href="/api/central?action=download&id=${m.id}">Baixar</a><button class="button-secondary button-danger" data-delete="${m.id}" type="button">Excluir</button></div></article>`).join('') : '<p class="muted">Nenhum material encontrado. Cadastre um novo material ou importe os arquivos existentes.</p>';
    $('category-list').innerHTML=categories.map(c=>`<article class="material-card"><h3>${escape(c.name)}</h3><p class="category-count">${c.materials} material(is)</p><div class="actions"><button class="button-secondary" data-category-edit="${c.id}" type="button">Renomear</button><button class="button-secondary button-danger" data-category-delete="${c.id}" type="button">Excluir</button></div></article>`).join('') || '<p class="muted">Crie sua primeira disciplina.</p>';
    const current=form.elements.category_id.value;
    $('material-category').innerHTML='<option value="">Selecione uma disciplina</option>'+categories.map(c=>`<option value="${c.id}">${escape(c.name)}</option>`).join('');
    form.elements.category_id.value=current;
    $('stat-total').textContent=materials.length;
    $('stat-published').textContent=materials.filter(m=>m.published).length;
    $('stat-categories').textContent=categories.length;
    $('stat-downloads').textContent=materials.reduce((sum,m)=>sum+Number(m.downloads),0);
}
async function load() {const data=await api('manage');materials=data.materials;categories=data.categories;render();}
function edit(material=null) {
    if(!categories.length) {tab('categories');notify('Crie uma disciplina antes de cadastrar o material.');return;}
    form.reset();pendingUpload=null;
    form.elements.id.value=material?.id || '';
    form.elements.title.value=material?.title || '';
    form.elements.description.value=material?.description || '';
    form.elements.category_id.value=material?.category_id || '';
    form.elements.published.checked=material?.published ?? true;
    form.elements.file.required=!material;
    $('editor-title').textContent=material?'Editar material':'Novo material';
    $('file-hint').textContent=material?`Atual: ${material.filename}. Selecione outro arquivo somente se quiser substituí-lo. Até 50 MB.`:'Selecione um arquivo de até 50 MB. PDFs, códigos, documentos e ZIPs.';
    $('upload-status').textContent='';$('editor-panel').hidden=false;
    $('editor-panel').scrollIntoView({behavior:'smooth',block:'start'});form.elements.title.focus();
}
document.querySelectorAll('[data-tab]').forEach(el=>el.addEventListener('click',()=>{if(!busy)tab(el.dataset.tab);}));
$('admin-search').addEventListener('input',render);$('visibility-filter').addEventListener('change',render);
$('new-material').addEventListener('click',()=>edit());
$('cancel-edit').addEventListener('click',()=>{$('editor-panel').hidden=true;pendingUpload=null;form.reset();});
form.elements.file.addEventListener('change',()=>{pendingUpload=null;const file=form.elements.file.files[0];if(file&&!form.elements.title.value)form.elements.title.value=file.name;});
$('login-form').addEventListener('submit',e=>{e.preventDefault();const values=new FormData(e.target);task(async()=>{const user=await api('login',{username:values.get('username'),password:values.get('password')});e.target.elements.password.value='';$('username').textContent=user.username;$('login-panel').hidden=true;$('workspace').hidden=false;await load();notify('Bem-vindo ao painel.');});});
$('logout').addEventListener('click',()=>task(async()=>{await api('logout',{});signedOut();notify('Você saiu do painel.');}));
form.addEventListener('submit',e=>{
    e.preventDefault();
    const data={id:form.elements.id.value?Number(form.elements.id.value):null,title:form.elements.title.value,description:form.elements.description.value,category_id:Number(form.elements.category_id.value),published:form.elements.published.checked};
    const file=form.elements.file.files[0];
    task(async()=>{
        if(file&&!pendingUpload) {
            if(file.size<1||file.size>50*1024*1024)throw new Error('Selecione um arquivo não vazio de até 50 MB.');
            const stage=await api('prepare-upload',{filename:file.name,size:file.size});
            $('upload-progress').hidden=false;$('upload-progress').value=0;$('upload-status').textContent='Enviando arquivo…';
            await upload(stage.pathname,file,{access:'private',contentType:'application/octet-stream',handleUploadUrl:'/api/upload',clientPayload:stage.upload_id,multipart:file.size>4*1024*1024,onUploadProgress:({percentage})=>{$('upload-progress').value=percentage;$('upload-status').textContent=`Enviando arquivo: ${Math.round(percentage)}%`;}});
            pendingUpload=stage.upload_id;
        }
        if(pendingUpload)data.upload_id=pendingUpload;
        $('upload-status').textContent='Salvando material…';
        await api('save-material',data);pendingUpload=null;form.reset();$('editor-panel').hidden=true;await load();notify(data.published?'Material salvo e publicado para os alunos.':'Material salvo como oculto.');
        // Best effort: retain failed cleanups in the database for the next attempt.
        api('cleanup',{}).catch(()=>{});
    });
});
$('admin-materials').addEventListener('click',e=>{
    const button=e.target.closest('button');if(!button||busy)return;
    const key=button.dataset.edit||button.dataset.visibility||button.dataset.delete;
    const material=materials.find(m=>m.id===Number(key));if(!material)return;
    if(button.dataset.edit)return edit(material);
    if(button.dataset.visibility)return task(async()=>{await api('visibility',{id:material.id,published:!material.published});await load();notify(material.published?'Material ocultado.':'Material publicado.');});
    if(button.dataset.delete&&confirm(`Excluir "${material.title}" e seu arquivo? Essa exclusão não pode ser desfeita.`))task(async()=>{const result=await api('delete-material',{id:material.id});await load();notify(result.cleanup_pending?'Material excluído. Há arquivos antigos para limpar na aba Minha conta.':'Material excluído.');});
});
categoryForm.addEventListener('submit',e=>{e.preventDefault();const data={name:categoryForm.elements.name.value};if(categoryForm.elements.id.value)data.id=Number(categoryForm.elements.id.value);task(async()=>{await api('save-category',data);categoryForm.reset();await load();notify('Disciplina salva.');});});
$('cancel-category').addEventListener('click',()=>categoryForm.reset());
$('category-list').addEventListener('click',e=>{const button=e.target.closest('button');if(!button||busy)return;const c=categories.find(x=>x.id===Number(button.dataset.categoryEdit||button.dataset.categoryDelete));if(!c)return;if(button.dataset.categoryEdit){categoryForm.elements.id.value=c.id;categoryForm.elements.name.value=c.name;categoryForm.elements.name.focus();}else if(confirm(`Excluir a disciplina "${c.name}"?`))task(async()=>{await api('delete-category',{id:c.id});await load();notify('Disciplina excluída.');});});
$('password-form').addEventListener('submit',e=>{e.preventDefault();const values=new FormData(e.target);if(values.get('new_password')!==values.get('repeat_password'))return notify('As novas senhas não coincidem.',true);task(async()=>{await api('password',{current_password:values.get('current_password'),new_password:values.get('new_password')});signedOut();notify('Senha alterada. Entre novamente com a nova senha.');});});
$('import-legacy').addEventListener('click',()=>task(async()=>{const list=await api('legacy-list',{});for(let i=0;i<list.materials.length;i++){$('import-status').textContent=`Importando ${i+1} de ${list.materials.length}: ${list.materials[i].title}`;await api('legacy-import',{key:list.materials[i].key});}$('import-status').textContent='Importação concluída.';await load();notify(list.materials.length?`${list.materials.length} materiais importados e publicados.`:'Todos os materiais originais já foram importados.');}));
$('cleanup').addEventListener('click',()=>task(async()=>{const result=await api('cleanup',{});notify(result.cleanup_pending?'Alguns arquivos não puderam ser removidos. Tente novamente mais tarde.':'Limpeza concluída.');}));
task(async()=>{try{const session=await api('session');$('username').textContent=session.username;$('workspace').hidden=false;await load();}catch(e){signedOut();if(!e.message.includes('Entre')&&!e.message.includes('sessão'))notify(e.message,true);}});
