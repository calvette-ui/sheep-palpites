# SHEEP PALPITES — projeto inicial

Esta pasta contém a versão estática demonstrativa que corresponde à interface publicada na Vercel, com a identidade Sheep Palpites e o mascote carneiro de óculos nerd.

## Importante
- Os jogos, horários, xG, linhas e probabilidades são dados fictícios de demonstração.
- Não existe ainda integração com API esportiva, banco de dados ou motor estatístico validado.
- Não use os palpites demonstrativos como recomendações reais.
- A versão atual é HTML/CSS/JavaScript estático. A arquitetura Next.js + Supabase + API esportiva será a próxima evolução.

## Testar no computador
Basta abrir `index.html` no navegador.

## Publicar no GitHub e conectar à Vercel
1. Entre em https://github.com e crie uma conta, se ainda não tiver.
2. Clique em **New repository**.
3. Nomeie como `sheep-palpites` e deixe como **Public** ou **Private** (sua preferência).
4. Crie o repositório.
5. Clique em **Add file > Upload files**.
6. Extraia este ZIP e envie o arquivo `index.html` e este `README.md` para a raiz do repositório.
7. Clique em **Commit changes**.
8. Entre em https://vercel.com e faça login com GitHub.
9. Clique em **Add New > Project**.
10. Importe o repositório `sheep-palpites`.
11. Como é um site estático simples, não precisa configurar framework nem build command. Use a raiz do repositório como Root Directory.
12. Clique em **Deploy**.

## Projeto que já está na Vercel
https://vercel.com/dashboard — procure `sheep-palpites`.
Site publicado: https://sheep-palpites.vercel.app

## Próximas etapas de desenvolvimento
1. Migrar a interface para Next.js/TypeScript.
2. Criar backend seguro para consumir API esportiva (a chave nunca deve ficar no navegador).
3. Conectar Supabase para persistir partidas, mercados, palpites e resultados.
4. Implementar modelos estatísticos específicos para gols, escanteios, cartões e finalizações.
5. Registrar probabilidades, fonte e horário de atualização; validar calibração retrospectiva.
6. Implementar liquidação correta de handicaps asiáticos inteiros e fracionados.
7. Criar histórico, autenticação e painel administrativo.
8. Testar em staging antes de atualizar o domínio de produção.

## Estrutura
- `index.html` — interface e interação demonstrativa.
- `README.md` — instruções de execução, publicação e roadmap.
