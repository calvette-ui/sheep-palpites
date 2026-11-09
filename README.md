# SHEEP PALPITES — projeto Next.js

Projeto inicial de aplicação web com:
- Next.js 14 + TypeScript
- Dashboard responsivo e mascote vetorial carneiro de óculos nerd
- Categorias: gols, escanteios, cartões, finalizações e chutes no alvo
- Dois lados de handicap por mercado
- API interna `/api/matches` e `/api/health`
- Páginas de metodologia, histórico e administração
- Motor inicial de probabilidades Poisson para distribuição de contagens
- Schema SQL inicial para Supabase
- Dados de demonstração explicitamente identificados

## Limitações importantes desta entrega
A aplicação roda e compila como protótipo funcional. Ainda NÃO existe integração real validada com API esportiva, autenticação de administrador, persistência efetiva do histórico nem modelo calibrado por competição. O adaptador não inventa dados ao vivo: enquanto não estiver implementado, a tela permanece em modo DEMO.

O motor estatístico atual é uma base técnica simples, não deve ser usado como aconselhamento de apostas. Modelos por mercado, tratamento de linhas asiáticas e liquidação precisam de validação independente antes de produção.

## Requisitos
- Node.js 20+
- npm

## Rodar localmente
```bash
npm install
cp .env.example .env.local
npm run dev
```
Abra http://localhost:3000.

## Build de produção
```bash
npm run build
npm start
```

## Supabase
1. Crie um projeto em https://supabase.com.
2. Abra SQL Editor.
3. Execute `supabase/schema.sql`.
4. Copie URL e anon key para `.env.local`.
5. Nunca exponha `SUPABASE_SERVICE_ROLE_KEY` no frontend.

## API esportiva
1. Contrate/ative um plano com estatísticas adequadas em https://www.api-football.com/.
2. Configure `API_FOOTBALL_KEY` nas variáveis de ambiente da Vercel.
3. Implemente e valide o adaptador em `lib/provider.ts` para os endpoints e cobertura contratados.
4. Só então defina `ENABLE_LIVE_DATA=true`.
A presença de uma chave não significa que todas as ligas fornecem escanteios, cartões, finalizações ou escalações.

## Deploy Vercel
1. Envie todo o conteúdo desta pasta para um repositório GitHub.
2. Na Vercel, importe o repositório.
3. Framework: Next.js (detecção automática).
4. Configure variáveis a partir de `.env.example`.
5. Deploy.
6. Confirme `/api/health` e `/api/matches`.

## Estrutura
- `app/`: páginas e rotas API
- `components/`: componentes React
- `lib/`: tipos, motor e provedor de dados
- `supabase/schema.sql`: estrutura inicial de dados
- `public/`: assets públicos
