# Central de Arquivos — versão gerenciável

Professor Dayvson · GitHub + Vercel + Neon

A página dos alunos mantém o visual azul-marinho, amarelo e fundo claro da central original. O painel fica em `/admin`.

## 1. Banco no Neon

1. Crie um projeto exclusivo para a Central de Arquivos no Neon.
2. No SQL Editor desse projeto, execute o conteúdo de `sql/schema.sql`.
3. Em Connect, copie a connection string com **Connection pooling** ativado. Guarde-a para inserir diretamente na Vercel, sem publicar no GitHub.

As tabelas têm o prefixo `central_`. A configuração é idempotente: pode executar o SQL novamente sem apagar os dados.

## 2. Importar o GitHub na Vercel

1. Abra Vercel → Add New → Project.
2. Importe o repositório `Dayvsonipa/central-de-arquivos`, branch `main`.
3. Use Framework Preset **Other** e Root Directory na raiz do repositório.
4. O `vercel.json` já define Build Command `npm run build` e Output Directory `public`.
5. Configure Node.js 24.x ou 22.x.
6. Nas Environment Variables, adicione:

| Nome | Valor |
|---|---|
| `DATABASE_URL` | Connection string do projeto Neon |
| `ADMIN_USERNAME` | `dayvson`, ou o usuário que desejar |
| `ADMIN_PASSWORD_HASH` | Hash gerado no passo abaixo |

### Criar a senha inicial

No computador, abra um terminal na pasta atualizada do projeto:

```bash
npm install
npm run password:hash
```

Digite uma senha com pelo menos 12 caracteres. A digitação fica oculta. O comando mostra um hash no formato `scrypt$...`; copie a linha inteira, sem aspas, diretamente para `ADMIN_PASSWORD_HASH` na Vercel. Para entrar no painel, use a senha que digitou, não o hash.

Não coloque senha, hash ou connection string no GitHub. A `.env.example` contém apenas exemplos.

## 3. Armazenamento na Vercel

1. No projeto Vercel, entre em Storage → Create Database → Blob.
2. Crie um armazenamento **Private**, com nome `central-arquivos`.
3. Conecte-o ao projeto e aos ambientes em que pretende usar o sistema.
4. A Vercel adicionará `BLOB_READ_WRITE_TOKEN`. Confira esse nome exato nas variáveis do projeto.
5. Publique novamente após adicionar ou alterar variáveis: Deployments → Redeploy.

O Blob guarda os arquivos; o Neon guarda informações, disciplinas, sessões e referências. Os uploads vão direto do navegador para o Blob, com autorização temporária do professor. O limite do sistema é de **50 MB por arquivo**. Materiais ocultos só podem ser baixados pelo professor autenticado.

Vercel e Neon têm limites de uso e cobrança próprios. Acompanhe armazenamento e tráfego nos seus painéis; não há promessa de gratuidade ilimitada.

## 4. Entrar e trazer os materiais atuais

1. Abra o novo endereço Vercel e clique em **Painel do professor**.
2. Entre com o usuário e a senha inicial.
3. Abra **Minha conta e importação → Importar materiais existentes**.
4. O sistema importa os sete materiais atuais e cria suas três disciplinas.
5. Abra a página dos alunos e teste um download.

A importação pode ser retomada sem duplicar os arquivos já importados. Ela publica os materiais imediatamente; você pode ocultá-los em seguida no painel.

## Uso diário

- Disciplinas: criar, renomear ou excluir. Só é possível excluir uma disciplina vazia.
- Materiais: Novo material → título, disciplina, descrição, arquivo e visibilidade → Salvar.
- Editar: alterar informações ou selecionar outro arquivo para substituir o atual.
- Ocultar: retirar do catálogo e bloquear novos downloads públicos pelo sistema.
- Excluir: remover o registro e solicitar a remoção do arquivo no Blob. Falhas de limpeza podem ser tentadas novamente em Minha conta.
- Minha conta: alterar a senha. A troca encerra as sessões abertas.
- Envios abandonados expiram e podem ser removidos em Limpar armazenamento.

Ocultar não recolhe cópias já baixadas pelos alunos. Os materiais históricos continuam no site antigo do GitHub Pages enquanto ele permanecer publicado; ocultar na Vercel não remove essas cópias antigas. Se quiser aposentar o endereço antigo, configure-o depois para direcionar os alunos ao novo endereço.

## Recuperar acesso se esquecer a senha

O painel não envia e-mail de recuperação nesta versão. Para redefinir:

1. Gere outro hash com `npm run password:hash`.
2. Atualize `ADMIN_PASSWORD_HASH` na Vercel e publique novamente.
3. No SQL Editor do Neon, execute:

```sql
BEGIN;
DELETE FROM central_sessions;
DELETE FROM central_admin WHERE id = 1;
COMMIT;
```

No próximo login, o sistema recria o acesso usando `ADMIN_USERNAME` e o novo hash da Vercel. Os materiais e disciplinas permanecem intactos.

## Desenvolvimento e validação

```bash
npm install
npm test
npm run build
```

Para executar localmente, copie `.env.example` para `.env.local`, preencha as variáveis e execute:

```bash
npm run db:setup
npm run dev
```

Abra `http://localhost:3000`. Os testes usam PostgreSQL local em memória (PGlite) e armazenamento simulado. O envio real e o download via Blob devem ser conferidos após configurar as contas. A aplicação tem somente duas funções Vercel (`central` e `upload`).

## Compatibilidade com o site atual

Os arquivos da central antiga na raiz continuam disponíveis para o GitHub Pages. A versão Vercel publica exclusivamente a pasta `public`, com catálogo dinâmico. `lib/legacy.json` contém apenas títulos e referências aos arquivos históricos, sem cópias do conteúdo. A importação autenticada busca cada arquivo no endereço antigo e o envia ao Blob privado. Mantenha o endereço antigo disponível até concluir essa importação.
