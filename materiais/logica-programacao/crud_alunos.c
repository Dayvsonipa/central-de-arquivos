#include <stdio.h>

#define MAX_ALUNOS 10
#define NOME_ARQUIVO "alunos.txt"

struct Aluno {
    int matricula;
    char nome[50];
    int idade;
};

void mostrarCabecalho(char titulo[]) {
    printf("\n");
    printf("******************************************************\n");
    printf("*                                                    *\n");
    printf("*  %-48s  *\n", titulo);
    printf("*                                                    *\n");
    printf("******************************************************\n");
}

void mostrarMensagem(char mensagem[]) {
    printf("\n");
    printf("+----------------------------------------------------+\n");
    printf("| %-50s |\n", mensagem);
    printf("+----------------------------------------------------+\n");
}

int carregarAlunos(struct Aluno alunos[]) {
    FILE *arquivo;
    int quantidade = 0;

    arquivo = fopen(NOME_ARQUIVO, "r");

    if (arquivo == NULL) {
        return 0;
    }

    while (quantidade < MAX_ALUNOS &&
           fscanf(arquivo, "%d;%49[^;];%d",
                  &alunos[quantidade].matricula,
                  alunos[quantidade].nome,
                  &alunos[quantidade].idade) == 3) {
        quantidade++;
    }

    fclose(arquivo);
    return quantidade;
}

int salvarAlunos(struct Aluno alunos[], int quantidade) {
    FILE *arquivo;
    int i;

    arquivo = fopen(NOME_ARQUIVO, "w");

    if (arquivo == NULL) {
        mostrarMensagem("ERRO: Nao foi possivel salvar os dados!");
        return 0;
    }

    for (i = 0; i < quantidade; i++) {
        fprintf(arquivo, "%d;%s;%d\n",
                alunos[i].matricula,
                alunos[i].nome,
                alunos[i].idade);
    }

    fclose(arquivo);
    return 1;
}

int buscarPosicao(struct Aluno alunos[], int quantidade, int matricula) {
    int i;

    for (i = 0; i < quantidade; i++) {
        if (alunos[i].matricula == matricula) {
            return i;
        }
    }

    return -1;
}

void inserirAluno(struct Aluno alunos[], int *quantidade) {
    int matricula;

    mostrarCabecalho("CADASTRO DE NOVO ALUNO");

    if (*quantidade >= MAX_ALUNOS) {
        mostrarMensagem("CADASTRO CHEIO! Limite de alunos atingido.");
        return;
    }

    printf("| Matricula: ");
    scanf("%d", &matricula);

    if (buscarPosicao(alunos, *quantidade, matricula) != -1) {
        mostrarMensagem("ERRO: Essa matricula ja esta cadastrada!");
        return;
    }

    alunos[*quantidade].matricula = matricula;

    printf("| Nome completo: ");
    scanf(" %49[^\n]", alunos[*quantidade].nome);

    printf("| Idade: ");
    scanf("%d", &alunos[*quantidade].idade);

    printf("+----------------------------------------------------+\n");

    (*quantidade)++;

    if (salvarAlunos(alunos, *quantidade)) {
        mostrarMensagem("SUCESSO: Aluno cadastrado e salvo!");
    }
}

void listarAlunos(struct Aluno alunos[], int quantidade) {
    int i;

    mostrarCabecalho("RELATORIO DE ALUNOS CADASTRADOS");

    if (quantidade == 0) {
        mostrarMensagem("Nenhum aluno cadastrado.");
        return;
    }

    printf("+-----------+--------------------------------+-------+\n");
    printf("| MATRICULA | NOME DO ALUNO                  | IDADE |\n");
    printf("+-----------+--------------------------------+-------+\n");

    for (i = 0; i < quantidade; i++) {
        printf("| %-9d | %-30.30s | %-5d |\n",
               alunos[i].matricula,
               alunos[i].nome,
               alunos[i].idade);
    }

    printf("+-----------+--------------------------------+-------+\n");
    printf("| Total de alunos cadastrados: %-21d |\n", quantidade);
    printf("+----------------------------------------------------+\n");
}

void atualizarAluno(struct Aluno alunos[], int quantidade) {
    int matricula;
    int posicao;

    mostrarCabecalho("ATUALIZACAO DE ALUNO");

    printf("| Informe a matricula: ");
    scanf("%d", &matricula);

    posicao = buscarPosicao(alunos, quantidade, matricula);

    if (posicao == -1) {
        mostrarMensagem("ERRO: Aluno nao encontrado!");
        return;
    }

    printf("+----------------------------------------------------+\n");
    printf("| DADOS ATUAIS                                      |\n");
    printf("+----------------------------------------------------+\n");
    printf("| Matricula: %-38d |\n", alunos[posicao].matricula);
    printf("| Nome: %-43.43s |\n", alunos[posicao].nome);
    printf("| Idade: %-42d |\n", alunos[posicao].idade);
    printf("+----------------------------------------------------+\n");

    printf("\nDigite os novos dados:\n\n");

    printf("| Novo nome: ");
    scanf(" %49[^\n]", alunos[posicao].nome);

    printf("| Nova idade: ");
    scanf("%d", &alunos[posicao].idade);

    if (salvarAlunos(alunos, quantidade)) {
        mostrarMensagem("SUCESSO: Cadastro atualizado!");
    }
}

void excluirAluno(struct Aluno alunos[], int *quantidade) {
    int matricula;
    int posicao;
    int i;
    char confirmacao;

    mostrarCabecalho("EXCLUSAO DE ALUNO");

    printf("| Informe a matricula: ");
    scanf("%d", &matricula);

    posicao = buscarPosicao(alunos, *quantidade, matricula);

    if (posicao == -1) {
        mostrarMensagem("ERRO: Aluno nao encontrado!");
        return;
    }

    printf("+----------------------------------------------------+\n");
    printf("| ALUNO ENCONTRADO                                   |\n");
    printf("+----------------------------------------------------+\n");
    printf("| Matricula: %-38d |\n", alunos[posicao].matricula);
    printf("| Nome: %-43.43s |\n", alunos[posicao].nome);
    printf("| Idade: %-42d |\n", alunos[posicao].idade);
    printf("+----------------------------------------------------+\n");

    printf("\nDeseja realmente excluir este aluno? (S/N): ");
    scanf(" %c", &confirmacao);

    if (confirmacao != 'S' && confirmacao != 's') {
        mostrarMensagem("OPERACAO CANCELADA!");
        return;
    }

    for (i = posicao; i < *quantidade - 1; i++) {
        alunos[i] = alunos[i + 1];
    }

    (*quantidade)--;

    if (salvarAlunos(alunos, *quantidade)) {
        mostrarMensagem("SUCESSO: Aluno excluido!");
    }
}

void mostrarMenu(int quantidade) {
    mostrarCabecalho("SISTEMA ACADEMICO - CRUD DE ALUNOS");

    printf("*----------------------------------------------------*\n");
    printf("*                                                    *\n");
    printf("*  [ 1 ]  CADASTRAR NOVO ALUNO                      *\n");
    printf("*  [ 2 ]  EXCLUIR ALUNO                             *\n");
    printf("*  [ 3 ]  LISTAR ALUNOS                             *\n");
    printf("*  [ 4 ]  ATUALIZAR ALUNO                           *\n");
    printf("*  [ 0 ]  SAIR DO SISTEMA                           *\n");
    printf("*                                                    *\n");
    printf("*----------------------------------------------------*\n");
    printf("*  Alunos cadastrados: %-29d *\n", quantidade);
    printf("******************************************************\n");
    printf("\nDIGITE A OPCAO DESEJADA: ");
}

int main(void) {
    struct Aluno alunos[MAX_ALUNOS];
    int quantidade;
    int opcao;

    quantidade = carregarAlunos(alunos);

    printf("\n");
    printf("******************************************************\n");
    printf("*                                                    *\n");
    printf("*          SISTEMA ACADEMICO - VERSAO 1.0            *\n");
    printf("*                                                    *\n");
    printf("*             CARREGANDO BANCO DE DADOS...           *\n");
    printf("*                                                    *\n");
    printf("******************************************************\n");
    printf("\n%d aluno(s) carregado(s) do arquivo.\n", quantidade);

    do {
        mostrarMenu(quantidade);
        scanf("%d", &opcao);

        switch (opcao) {
            case 1:
                inserirAluno(alunos, &quantidade);
                break;
            case 2:
                excluirAluno(alunos, &quantidade);
                break;
            case 3:
                listarAlunos(alunos, quantidade);
                break;
            case 4:
                atualizarAluno(alunos, quantidade);
                break;
            case 0:
                mostrarCabecalho("ENCERRANDO O SISTEMA");
                printf("*                                                    *\n");
                printf("*       Todos os dados foram salvos com sucesso!     *\n");
                printf("*                                                    *\n");
                printf("*              ATE A PROXIMA OPERACAO!               *\n");
                printf("*                                                    *\n");
                printf("******************************************************\n");
                break;
            default:
                mostrarMensagem("ERRO: Opcao invalida!");
        }
    } while (opcao != 0);

    return 0;
}


