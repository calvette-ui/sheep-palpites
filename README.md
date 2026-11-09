# SHEEP PALPITES — versão 2.0

## Esta versão inclui
- Integração server-side com API-Football v3.
- Busca de partidas do dia no fuso America/Sao_Paulo.
- Prioridade para ligas principais.
- Busca dos últimos cinco jogos de cada equipe.
- Projeção de gols a partir de gols marcados e sofridos (não chamar de xG oficial).
- Médias de escanteios, cartões, finalizações e chutes no alvo quando há dados.
- Exatamente dois palpites por mercado disponível: favorito negativo e azarão positivo.
- Mercados sem três amostras válidas por equipe são ocultados.
- Cache de seis horas para reduzir consumo de API.
- Dashboard responsivo com mascote carneiro nerd.
- Endpoint de diagnóstico `/api/health`.
- Identificador de release `SHEEP-2026.11.09-R2` e SHA de commit da Vercel para provar que o código novo foi publicado.

## Atualizar o GitHub usando a conta calvette-ui
1. Entre no GitHub com `calvette-ui`.
2. Abra https://github.com/calvette-ui/sheep-palpites
3. Faça upload do CONTEÚDO desta pasta para a raiz do repositório (não envie a pasta `sheep-palpites-v2` como subpasta).
4. Marque para substituir os arquivos existentes quando solicitado.
5. Faça Commit changes pela interface do GitHub.
6. A Vercel deve detectar o novo commit. O commit feito na interface estando logado em `calvette-ui` evita a autoria da outra conta.

## Variáveis Vercel
`API_FOOTBALL_KEY`: manter o valor já cadastrado na Vercel. Nunca inserir no GitHub.
`MAX_MATCHES_TO_ANALYZE`: opcional, padrão 2 e máximo 3. Comece com 2 para controlar a cota.

## Como reconhecer que o código novo está no ar
Após o deploy, abrir:
`https://SEU-DOMINIO/api/health`

A resposta deverá conter:
- `release`: `SHEEP-2026.11.09-R2`
- `buildId`: primeiros 8 caracteres do commit SHA usado pela Vercel (ou `local` fora da Vercel)
- `apiKeyConfigured`: `true`

O dashboard também mostra esse diagnóstico na parte inferior. Se a release não for R2, a Vercel ainda está servindo uma implantação antiga.

## Cota e limites
Cada análise usa uma chamada para fixtures do dia, duas para últimos jogos por partida e consultas de estatísticas para fixtures históricos únicos. A quantidade varia conforme sobreposição de jogos recentes entre equipes. O padrão de duas partidas foi escolhido para controlar a cota gratuita. O cache de seis horas é melhor esforço; ambientes serverless podem reiniciar e perder cache em memória, embora o cache do fetch também seja usado.

## Limitações
- A projeção de gols é uma estimativa própria baseada em gols recentes, não xG oficial.
- O Poisson independente é um modelo inicial; não foi calibrado por liga nem validado em backtest.
- A disponibilidade de cartões, escanteios e finalizações depende da competição e do plano/API.
- Sem amostra mínima, o mercado não publica palpite.
- O histórico persistente e liquidação automática de resultados ainda não estão nesta versão.

## Teste local
Node 20+:
```bash
npm install
cp .env.example .env.local
# inserir a chave somente em .env.local
npm run dev
```
