# SHEEP PALPITES — integração API-Football (versão 1.1)

## O que esta versão faz
- Consulta fixtures do dia pela API-Football no fuso `America/Sao_Paulo`.
- Prioriza ligas e copas de maior relevância por IDs conhecidos e depois outras partidas disponíveis.
- Analisa até 4 partidas por padrão (configurável até 5).
- Para cada jogo, busca os últimos 5 jogos de cada equipe e as estatísticas dos confrontos anteriores.
- Estima gols esperados a partir de gols marcados/sofridos recentes.
- Calcula médias recentes de escanteios, cartões, finalizações e chutes no alvo.
- Gera dois palpites de handicap para cada mercado quando há amostra mínima.
- Não inventa palpites para mercados sem estatísticas suficientes.
- Usa cache de 6 horas nas consultas individuais para proteger a cota da API.
- Interface com filtros por mercado, status dos dados e botão de atualização.

## Arquivos principais
- `lib/football-api.ts`: integração API-Football, coleta histórica e cálculo.
- `app/api/matches/route.ts`: endpoint interno que serve as análises.
- `components/Dashboard.tsx`: dashboard.
- `app/globals.css`: identidade visual.
- `app/methodology/page.tsx`: transparência da metodologia.

## Atualização no GitHub
1. Baixe e extraia o ZIP.
2. No repositório `calvette-ui/sheep-palpites`, substitua os arquivos e pastas pelos desta versão, mantendo os caminhos.
3. Faça commit na branch `main`.
4. A Vercel fará o deploy automaticamente.
5. Confirme se `API_FOOTBALL_KEY` continua cadastrada no projeto Vercel (não adicione a chave ao GitHub).

## Variável de ambiente
`API_FOOTBALL_KEY` — já cadastrada na Vercel pelo usuário.
`MAX_MATCHES_TO_ANALYZE` — opcional; padrão 3, máximo 5.

## Cota da API
Cada atualização pode usar aproximadamente:
- 1 chamada para partidas do dia;
- 2 chamadas de fixtures recentes por partida;
- até 10 chamadas de estatísticas históricas por partida (5 por equipe).

Com 3 jogos, o teto aproximado é 37 chamadas em uma primeira coleta; cache reduz chamadas subsequentes enquanto estiver ativo. A API pode não fornecer todos os mercados para todas as ligas.

## Limitações honestas
- A API-Football não fornece xG oficial em todos os planos/competições; esta versão chama a projeção de `gols esperados (modelo)` e calcula com gols marcados/sofridos recentes.
- O modelo Poisson é uma primeira versão, não calibrada por liga nem validada por backtest. A probabilidade exibida é uma estimativa matemática do modelo.
- O mercado só aparece se houver pelo menos três jogos recentes com estatística para cada equipe. Não há fallback inventado.
- A seleção de jogos prioriza IDs de grandes ligas, mas também inclui outros jogos retornados se não houver partidas dessas ligas.
- O histórico persistente e autenticação administrativa ainda não estão implementados.
- A rota pode atingir limite de duração dependendo do plano Vercel e do número de partidas selecionadas. Se houver timeout na Vercel Hobby, defina `MAX_MATCHES_TO_ANALYZE=1` ou `2` nas variáveis de ambiente.

## Teste local
Node.js 20+:
```bash
npm install
cp .env.example .env.local
# edite .env.local com sua chave API-Football
npm run dev
```
Acesse `http://localhost:3000` e `http://localhost:3000/api/matches`.

## Fonte oficial da API
https://www.api-football.com/documentation-v3
