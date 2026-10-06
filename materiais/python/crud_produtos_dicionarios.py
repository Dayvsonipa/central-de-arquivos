# CRUD com dicionários — Professor Dayvson
# Dados em memória: voltam aos valores iniciais a cada execução.
produtos = {
    1: {"nome": "Mouse", "preco": 45.90, "estoque": 10},
    2: {"nome": "Teclado", "preco": 89.90, "estoque": 5},
    3: {"nome": "Monitor", "preco": 750.00, "estoque": 3},
    4: {"nome": "Pendrive", "preco": 35.00, "estoque": 20},
    5: {"nome": "Headset", "preco": 120.00, "estoque": 8}
}

while True:
    print("\n=== CONTROLE DE PRODUTOS ===")
    print("1 - Listar")
    print("2 - Cadastrar")
    print("3 - Alterar")
    print("4 - Excluir")
    print("0 - Sair")
    opcao = input("Escolha uma opção: ")

    # LISTAR
    if opcao == "1":
        print("\n=== PRODUTOS CADASTRADOS ===")
        if not produtos:
            print("Nenhum produto cadastrado.")
        else:
            valor_total = 0
            for codigo, produto in produtos.items():
                print(
                    f"Código: {codigo} | Nome: {produto['nome']} | "
                    f"Preço: R$ {produto['preco']:.2f} | Estoque: {produto['estoque']}"
                )
                valor_total += produto["preco"] * produto["estoque"]
            print(f"\nValor total do estoque: R$ {valor_total:.2f}")

    # CADASTRAR
    elif opcao == "2":
        print("\n=== CADASTRAR PRODUTO ===")
        try:
            codigo = int(input("Código: "))
            if codigo <= 0:
                print("O código deve ser maior que zero.")
            elif codigo in produtos:
                print("Esse código já está cadastrado!")
            else:
                nome = input("Nome: ").strip()
                preco = float(input("Preço: ").replace(",", "."))
                estoque = int(input("Quantidade em estoque: "))
                if not nome:
                    print("O nome não pode ficar vazio.")
                elif preco < 0 or estoque < 0:
                    print("Preço e estoque não podem ser negativos.")
                else:
                    produtos[codigo] = {
                        "nome": nome, "preco": preco, "estoque": estoque
                    }
                    print("Produto cadastrado com sucesso!")
        except ValueError:
            print("Entrada inválida! Digite números nos campos numéricos.")

    # ALTERAR
    elif opcao == "3":
        print("\n=== ALTERAR PRODUTO ===")
        try:
            codigo = int(input("Código do produto: "))
            if codigo in produtos:
                produto = produtos[codigo]
                print(
                    f"Nome: {produto['nome']} | Preço: R$ {produto['preco']:.2f} | "
                    f"Estoque: {produto['estoque']}"
                )
                nome = input("Novo nome: ").strip()
                preco = float(input("Novo preço: ").replace(",", "."))
                estoque = int(input("Novo estoque: "))
                if not nome:
                    print("O nome não pode ficar vazio.")
                elif preco < 0 or estoque < 0:
                    print("Preço e estoque não podem ser negativos.")
                else:
                    produtos[codigo] = {
                        "nome": nome, "preco": preco, "estoque": estoque
                    }
                    print("Produto alterado com sucesso!")
            else:
                print("Produto não encontrado!")
        except ValueError:
            print("Entrada inválida! Digite números nos campos numéricos.")

    # EXCLUIR
    elif opcao == "4":
        print("\n=== EXCLUIR PRODUTO ===")
        try:
            codigo = int(input("Código do produto: "))
            if codigo in produtos:
                print("Produto:", produtos[codigo]["nome"])
                confirmacao = input("Confirma a exclusão? (s/n): ").strip().lower()
                if confirmacao == "s":
                    del produtos[codigo]
                    print("Produto excluído com sucesso!")
                else:
                    print("Exclusão cancelada.")
            else:
                print("Produto não encontrado!")
        except ValueError:
            print("Código inválido! Digite um número inteiro.")

    elif opcao == "0":
        print("Programa encerrado.")
        break
    else:
        print("Opção inválida! Escolha uma opção do menu.")
