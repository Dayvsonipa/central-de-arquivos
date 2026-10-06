# Central de Arquivos

## Versão gerenciável — Vercel + Neon

A nova versão mantém o visual original e oferece painel do professor em `/admin`,
uploads privados pelo Vercel Blob, gerenciamento de disciplinas e materiais,
publicação/ocultação, troca de senha e importação dos sete materiais existentes.

Siga [CONFIGURAR_VERCEL_NEON.md](CONFIGURAR_VERCEL_NEON.md) para ativar o sistema.
O build da Vercel publica `public`; os arquivos estáticos antigos na raiz continuam
atendendo o endereço atual do GitHub Pages durante a migração.

```bash
npm install
npm test
npm run build
```

As instruções abaixo referem-se à central estática original.

Portal estático para disponibilizar materiais de aula aos alunos.

## Como publicar no GitHub

1. Crie um repositório novo no GitHub.
2. Envie todos os arquivos e pastas deste projeto, mantendo a estrutura.
3. Para usar o GitHub Pages, abra **Settings → Pages**.
4. Em **Source**, selecione **Deploy from a branch**.
5. Escolha a branch **main**, a pasta **/(root)** e clique em **Save**.

Também é possível importar o repositório na Vercel. Como o projeto é estático, não é necessário configurar comando de compilação.

## Como adicionar outro material

1. Coloque o arquivo dentro da pasta `materiais`, preferencialmente em uma subpasta com o nome da disciplina.
2. Abra `dados.js`.
3. Copie um cadastro existente e altere nome, disciplina, descrição, tipo, tamanho, data e caminho do arquivo.
4. Envie as alterações ao GitHub.

O arquivo `dados.js` controla o que aparece no portal.
