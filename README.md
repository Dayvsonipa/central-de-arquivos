# Central de Arquivos

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
