const busca = document.getElementById("busca");
const filtrosDisciplinas = document.getElementById("filtrosDisciplinas");
const listaMateriais = document.getElementById("listaMateriais");
const estadoVazio = document.getElementById("estadoVazio");
const quantidadeResultados = document.getElementById("quantidadeResultados");
const totalArquivos = document.getElementById("totalArquivos");

let disciplinaSelecionada = "Todas";

function normalizar(texto) {
    return texto
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
}

function escaparHtml(texto) {
    const elemento = document.createElement("div");
    elemento.textContent = texto;
    return elemento.innerHTML;
}

function iconeArquivo(nome) {
    const extensao = nome.split(".").pop().toLowerCase();

    if (["c", "cpp", "h", "js", "py", "java", "html", "css", "sql"].includes(extensao)) {
        return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m16 18 6-6-6-6M8 6l-6 6 6 6"/></svg>';
    }

    if (["zip", "rar", "7z"].includes(extensao)) {
        return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 8v13H3V8M1 3h22v5H1zM10 12h4"/></svg>';
    }

    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>';
}

function criarCard(material) {
    return `
        <article class="material-card">
            <div class="material-main">
                <div class="file-icon">${iconeArquivo(material.nome)}</div>
                <div class="material-info">
                    <span class="discipline-tag">${escaparHtml(material.disciplina)}</span>
                    <h3 title="${escaparHtml(material.nome)}">${escaparHtml(material.nome)}</h3>
                    <p>${escaparHtml(material.descricao)}</p>
                </div>
            </div>
            <div class="material-footer">
                <span class="file-meta">${escaparHtml(material.tipo)} · ${escaparHtml(material.tamanho)} · ${escaparHtml(material.data)}</span>
                <a class="download-button" href="${encodeURI(material.arquivo)}" download>
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                    Baixar arquivo
                </a>
            </div>
        </article>
    `;
}

function atualizarMateriais() {
    const termo = normalizar(busca.value.trim());

    const resultado = materiais.filter((material) => {
        const correspondeDisciplina =
            disciplinaSelecionada === "Todas" || material.disciplina === disciplinaSelecionada;
        const textoPesquisavel = normalizar(
            `${material.nome} ${material.disciplina} ${material.descricao} ${material.tipo}`
        );

        return correspondeDisciplina && (!termo || textoPesquisavel.includes(termo));
    });

    listaMateriais.innerHTML = resultado.map(criarCard).join("");
    quantidadeResultados.textContent = `${resultado.length} resultado(s)`;
    estadoVazio.hidden = resultado.length !== 0;
}

function criarFiltros() {
    const disciplinas = ["Todas", ...new Set(materiais.map((material) => material.disciplina))];

    filtrosDisciplinas.innerHTML = disciplinas
        .map((disciplina) => `
            <button
                type="button"
                class="subject-button ${disciplina === disciplinaSelecionada ? "active" : ""}"
                data-disciplina="${escaparHtml(disciplina)}"
            >
                ${escaparHtml(disciplina)}
            </button>
        `)
        .join("");

    filtrosDisciplinas.querySelectorAll("button").forEach((botao) => {
        botao.addEventListener("click", () => {
            disciplinaSelecionada = botao.dataset.disciplina;
            criarFiltros();
            atualizarMateriais();
        });
    });
}

totalArquivos.textContent = materiais.length;
busca.addEventListener("input", atualizarMateriais);
criarFiltros();
atualizarMateriais();
