# 📋 BodySync - Contexto do Projeto & Registro de Decisões

> **Para novos chats e assistentes de IA:**  
> Leia este documento antes de realizar qualquer alteração no código. Ele resume a arquitetura, regras de negócio, decisões técnicas de alto impacto e o histórico de auditorias e redesigns já homologados no projeto.

---

## 1. Visão Geral & Escopo

- **O que é:** O **BodySync** é um aplicativo mobile de treino, saúde e hidratação com backend REST API integrado a banco relacional.
- **Ambiente & Contexto:** Projeto de faculdade. O objetivo é alta qualidade, código enxuto, performance fluida e estabilidade, **sem over-engineering** (seguir a diretriz *Ponytail: Lazy Senior Dev* — a melhor linha de código é a que não precisou ser escrita).
- **Stack Tecnológico:**
  - **Frontend:** React Native (Expo SDK 54), TypeScript, `@expo/vector-icons`, `react-native-safe-area-context`, `react-native-reanimated`.
  - **Backend:** Node.js, Express, TypeScript, `pg.Pool`, `compression`, `bcryptjs`, `jsonwebtoken`.
  - **Banco de Dados:** Supabase PostgreSQL (`aws-1-sa-east-1.pooler.supabase.com:6543`).
  - **Testes:** Node.js native test runner (`node --test`).

---

## 2. Decisões Arquiteturais & Auditorias de Código

### A. Autenticação & Segurança
- **Token Refresh Lock:** Em [`src/context/AuthContext.tsx`](file:///c:/dev/projbodysync/src/context/AuthContext.tsx), usamos `refreshPromiseRef` como single-flight lock. Chamadas concorrentes que encontram `401 Unauthorized` aguardam o mesmo refresh sem disparar requisições duplicadas.
- **Hash de Tokens de Recuperação:** No [`bodysync-api/src/modules/auth/auth.service.ts`](file:///c:/dev/projbodysync/bodysync-api/src/modules/auth/auth.service.ts), tokens de redefinição de senha nunca são armazenados puros no banco; usamos `crypto.createHash('sha256')`.
- **Prevenção de SQL Injection em Perfis:** Em [`user-profile.service.ts`](file:///c:/dev/projbodysync/bodysync-api/src/modules/user-profile/user-profile.service.ts), usamos `PROFILE_FIELD_MAP` como whitelist restrita de colunas permitidas para `UPDATE`.
- **Lock contra Concorrência (TOCTOU):** No [`workout.service.ts`](file:///c:/dev/projbodysync/bodysync-api/src/modules/workout/workout.service.ts), validações de limite de planos por assinatura usam `SELECT ... FOR UPDATE` dentro de `BEGIN...COMMIT`.

### B. Fusos Horários e Datas
- **Regra de Fuso:** No Brasil (`America/Sao_Paulo`), datas de hidratação, pesagem e sessões de treino nunca usam `new Date().toISOString().slice(0, 10)` sem conversão, pois após as 21h UTC causava salto de dia. Usamos âncora UTC-noon (`T12:00:00.000Z`) ou conversão via `Intl.DateTimeFormat`.

### C. Dependências Limpas
- Foram removidas 13 dependências desnecessárias do `package.json` (`@gluestack-*`, `react-native-paper`, `@react-navigation/bottom-tabs`, etc.). Não adicione novas bibliotecas para funcionalidades que o React Native nativo já oferece.

### D. Banco de Dados & Supabase Hardening (Migração 002)
- **Isolamento de PostgREST e Ativação de RLS:**
  - O aplicativo mobile conecta exclusivamente via API Express (`bodysync-api`), nunca acessando a API REST do Supabase (`/rest/v1/*`) diretamente.
  - Para fechar a brecha de segurança onde qualquer usuário da internet com a chave anônima pública podia consultar/apagar tabelas, todos os privilégios foram revogados das roles públicas (`REVOKE ALL ON ALL TABLES/SEQUENCES/ROUTINES IN SCHEMA public FROM anon, authenticated`).
  - RLS (Row Level Security) ativado em todas as 13 tabelas do schema `public`.
  - A API Express conecta via pool `pg` como o usuário proprietário `postgres.fhbcihntnojnrdxhtjor` (que possui `rolbypassrls: true`), garantindo que todas as consultas do backend continuem funcionando com transparência total.
- **Cobertura de Chaves Estrangeiras:**
  - Todas as 11 Foreign Keys do banco receberam índices B-tree dedicados (`idx_*`), eliminando Sequential Scans e bloqueios de tabela em operações de exclusão em cascata (`ON DELETE CASCADE`).
- **Índices Compostos de Alto Desempenho:**
  - Adicionados índices compostos casando filtros e ordenações da API:
    - `workout_sessions (user_id, finished_at DESC)`: acelera estatísticas e histórico de treinos.
    - `body_measurements (user_id, measured_at ASC)`: acelera o gráfico e listagem de evolução física.
    - `plan_exercises (plan_id, order_index ASC)`: acelera a montagem do detalhe de planos de treino.
- **Remoção de Índices Redundantes:**
  - Foram removidos 3 índices secundários manuais (`idx_hydration_logs_user_date`, `idx_reset_tokens_token`, `idx_user_profiles_user_id`) que duplicavam constraints `UNIQUE` pré-existentes, poupando I/O de escrita e espaço em disco.
- **Segurança em Funções e Triggers:**
  - A função `update_updated_at_column()` foi recriada com `SECURITY INVOKER` e `SET search_path = ''` para mitigar vulnerabilidades de injeção de caminho de busca (Linter 0011).
  - Foi adicionado o gatilho `update_hydration_logs_updated_at` na tabela `hydration_logs`.
- **Decisão Arquitetural sobre `users` vs `user_profiles`:**
  - Identificada a duplicação histórica de 14 atributos físicos/comportamentais em ambas as tabelas.
  - **Decisão:** Manter retrocompatibilidade total na Fase 1 (nenhuma coluna foi apagada da tabela `users` para não quebrar queries de cadastro e peso). A consolidação para manter `users` puramente como tabela de credenciais e `user_profiles` como fonte única dos atributos físicos fica planejada para uma refatoração conjunta com TypeScript.
- **Automação de Migrações:**
  - Script runner em [`bodysync-api/src/scripts/run-migration.ts`](file:///c:/dev/projbodysync/bodysync-api/src/scripts/run-migration.ts) executável via `npm --prefix bodysync-api run migrate`.

---

## 3. Padrões de UI/UX & Temas

- **Dual Theme Reativo:**
  - Definido em [`src/theme/colors.ts`](file:///c:/dev/projbodysync/src/theme/colors.ts) e distribuído via [`src/context/ThemeProvider.tsx`](file:///c:/dev/projbodysync/src/context/ThemeProvider.tsx).
  - Tokens principais:
    - **Dark:** Fundo `#0B0F17`, Superfície/Cards `#161F2E`, Variação `#1E293B`, Primário `#F97316`, Texto `#F8FAFC`.
    - **Light:** Fundo `#F8FAFC`, Superfície/Cards `#FFFFFF`, Variação `#F1F5F9`, Primário `#F97316`, Texto `#0F172A`.
- **Navegação & TabBar Flutuante:**
  - A barra em [`src/navigation/TabNavigator.tsx`](file:///c:/dev/projbodysync/src/navigation/TabNavigator.tsx) flutua acima da borda com cantos arredondados (`borderRadius: 24`).
  - **Atenção:** Todas as telas roláveis com abas ativas DEVEM usar `paddingBottom: insets.bottom + 100` no `contentContainerStyle` para evitar que conteúdos do rodapé fiquem escondidos atrás da TabBar.
- **Players de Exercício:**
  - `WorkoutPlayer.tsx` e `HiitPlayer.tsx` rodam em tela cheia com timers circulares de alto contraste e botões de toque com altura mínima de 52px.
  - No `WorkoutPlayer.tsx`, a fase de descanso entre séries e exercícios conta com um anel giratório 360° animado via `Animated.loop` e `useNativeDriver: true` (idêntico à estética do `PreparingScreen.tsx`), envolvendo o círculo do cronômetro.

---

## 4. Otimizações de Performance Aplicadas

1. **Optimistic Updates:** No [`src/components/HydrationCard.tsx`](file:///c:/dev/projbodysync/src/components/HydrationCard.tsx), toques em `+250ml` ou `+500ml` atualizam visualmente o estado na hora (0ms), revertendo se a rede falhar.
2. **Timeout Resiliente:** Em [`src/hooks/useApi.ts`](file:///c:/dev/projbodysync/src/hooks/useApi.ts), requisições têm timeout de 10s via `AbortController`, prevenindo congelamentos de tela.
3. **Compressão GZIP:** No [`bodysync-api/src/app.ts`](file:///c:/dev/projbodysync/bodysync-api/src/app.ts), o middleware `compression()` reduz o peso dos payloads JSON em até 70%.
4. **Skeleton Loading:** [`src/components/Skeleton.tsx`](file:///c:/dev/projbodysync/src/components/Skeleton.tsx) cria placeholders pulsantes durante o carregamento da Home.
5. **Debounce & Virtualização:** O [`ExercisePicker.tsx`](file:///c:/dev/projbodysync/src/screens/Workouts/ExercisePicker.tsx) usa debounce de 300ms no input e `FlatList` para paginação de exercícios.
6. **YAGNI (Descartes Conscientes):** Não instalar Redis, RabbitMQ/BullMQ, OpenTelemetry, microsserviços ou CDNs pagas.

---

## 5. Como Rodar e Testar

- **Backend:**
  - Iniciar: `cd bodysync-api && npm run dev` (Porta 3000).
  - Executar Migrações SQL: `npm --prefix bodysync-api run migrate`.
  - Testes: `npm --prefix bodysync-api test` (deve passar 6/6 testes).
- **Frontend:**
  - Iniciar: `npm start` (Expo Metro).
  - Web Preview: Abrir `http://localhost:8081` ou pressionar `w`.
- **Checagem de Tipos Geral:**
  - `npx tsc --noEmit` (deve retornar com código 0).
