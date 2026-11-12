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
- **Hardening de Cadastro & Pagamento Simulado:** Em [`auth.controller.ts`](bodysync-api/src/modules/auth/auth.controller.ts), `POST /api/auth/register` aceita apenas perfis `comum` ou `professor` (bloqueia auto-cadastro como `admin` com `403`) e cria contas sempre no plano inicial `free`. Planos pagos (`premium` para aluno; `basic` para personal) passam obrigatoriamente pela tela simulada [`PaymentScreen.tsx`](src/screens/Registration/PaymentScreen.tsx) -> `POST /api/payment/subscribe`, validado por [`isSubscriptionAllowedForRole`](bodysync-api/src/modules/payment/payment.routes.ts).
- **Fluxo Personalizado por Perfil no Onboarding:** No [`RegisterScreen.tsx`](src/screens/Registration/RegisterScreen.tsx), contas `comum` percorrem 7 etapas e contas `professor` percorrem 3 etapas (`Step1PersonalData` -> `Step2Subscription` -> `Step7Confirmation`), ambos com `PaymentScreen` ao escolher plano pago e auto-login direto ao concluir. Trocar o perfil em `Step1PersonalData` limpa `subscriptionType` selecionado.

### B. Fusos Horários e Datas
- **Regra de Fuso:** No Brasil (`America/Sao_Paulo`), datas de hidratação, pesagem e sessões de treino nunca usam `new Date().toISOString().slice(0, 10)` sem conversão, pois após as 21h UTC causava salto de dia. No backend usamos âncora UTC-noon (`T12:00:00.000Z`), `Intl.DateTimeFormat` (`dateKey`) e validação estrita [`isValidIsoDate`](bodysync-api/src/modules/session/session.service.ts); no frontend datas `YYYY-MM-DD` são parseadas/formatadas localmente por [`parseDateOnlyLocal` / `formatDateBR`](src/components/DateTimePickerField.tsx).
- **Pesagens Retroativas:** Em [`measurement.service.ts`](bodysync-api/src/modules/measurement/measurement.service.ts), `POST /api/measurements` valida `measuredAt` (`400` se inválido/futuro) e sincroniza `user_profiles.weight_kg` apenas pela medição cronologicamente mais recente (`ORDER BY measured_at DESC, id DESC`).

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

### E. Módulo Personal Trainer, Prescrições & Regras de Negócio (Migrações 003–006)
- **Separação Estrita de Papéis (`RootNavigator` & Guards):**
  - Removidos placeholders de troca de papel (`RolePreviewContext`, `mockTrainerData`). A navegação respeita `user.role` real vindo da API: `'professor'` entra no [`TrainerMainFlow`](src/screens/Trainer/TrainerMainFlow.tsx) (aba inicial `Métricas`, seguida de `Alunos` e `Ajustes`, com gatilho leve de atualização entre abas); `'comum'` entra no app do aluno.
  - Endpoints de consultoria (`/api/trainer/profile`, `/students`, `/students/:studentId`, `/students/:studentId/evaluations`, `/evaluations/:evaluationId`, `/prescribe`, `/plans/:planId`, `/analytics`) são protegidos por `requireProfessor`.
- **Vínculo Personal <-> Aluno (`trainer_students`):**
  - Cada treinador recebe um código mestre único `BS-XXXX` (`student_id IS NULL`, garantido pelos índices únicos parciais das migrações `004` e `005` com retry contra colisão `23505`).
  - Apenas usuários `role = 'comum'` podem conectar-se como alunos (`connectStudent` rejeita `professor`/`admin` com `403`), e o desvínculo (`DELETE /api/trainer/students/:studentId`) funciona de forma mútua.
  - O compartilhamento do código usa [`shareTrainerInvite`](src/screens/Trainer/trainerService.ts) (Share nativo no Mobile / fallback com cópia automática da mensagem na Web desktop) + [`openWhatsAppInvite`](src/screens/Trainer/trainerService.ts), acessível no modal de `TrainerHomeScreen` e em `Ajustes` (`SettingsScreen`) do Personal.
- **Avaliações Físicas & Parecer Técnico (`006_student_evaluations.sql`):**
  - Tabela `student_evaluations` com RLS ativado, revogação para `anon/authenticated`, nota `1..5`, parecer obrigatório e métricas corporais opcionais (`weight_kg`, `body_fat_pct`, `chest_cm`, `waist_cm`, `arm_cm`, `thigh_cm`).
  - O Personal cria/exclui avaliações na aba `Avaliações` de `StudentDetailScreen`; o aluno visualiza o histórico em modo somente leitura via `GET /api/trainer/my-evaluations` em [`ProgressScreen.tsx`](src/screens/Progress/ProgressScreen.tsx), compartilhando o componente [`EvaluationCard.tsx`](src/components/EvaluationCard.tsx).
- **Prescrição Fiel & Catálogo Completo (880 exercícios):**
  - Em [`TrainerPrescribeScreen.tsx`](src/screens/Trainer/TrainerPrescribeScreen.tsx), a seleção de catálogo consulta `GET /api/exercises` no servidor (`search` com debounce, filtro por `category` via `/exercises/categories`, `limit=50` e paginação `"Carregar mais"`), superando o limite padrão de 20 itens por página.
  - A migração `005_trainer_plan_rest_and_fk.sql` adicionou `rest_seconds` (`10..600`, padrão `60`) em `plan_exercises`. O descanso prescrito é salvo em [`prescribeWorkout`](bodysync-api/src/modules/trainer/trainer.service.ts), exibido com a categoria real do exercício na `StudentDetailScreen` e no `PlanDetail`, e aplicado no cronômetro entre séries do `WorkoutPlayer`.
- **Permissões e Limite Free nos Treinos Prescritos:**
  - Planos com `created_by_trainer_id IS NOT NULL` **não consomem** o limite de 2 planos gratuitos do aluno em [`workout.service.ts`](bodysync-api/src/modules/workout/workout.service.ts).
  - O aluno vê o selo `Personal`, mas **não pode editar nem excluir** treinos prescritos (`403 ForbiddenPlanError` na API + botões substituídos por cadeado/ocultos na UI).
  - Apenas o próprio Personal pode remover fichas que prescreveu em `StudentDetailScreen` (`DELETE /api/trainer/plans/:planId`), com `workout_sessions.plan_id` configurado como `ON DELETE SET NULL` na migração `005` para preservar o histórico de treinos executados.
- **Métricas & Janela Semanal Unificada:**
  - Os indicadores gerais (`Alunos Ativos`, `Treinaram Hoje`, `Prescrições`) ficam consolidados exclusivamente na aba `Métricas` ([`TrainerAnalyticsScreen.tsx`](src/screens/Trainer/TrainerAnalyticsScreen.tsx)), deixando `TrainerHomeScreen` focada na lista/busca/filtros de alunos.
  - [`fetchStudentsWithSessionTotals`](bodysync-api/src/modules/trainer/trainer.service.ts) consolida a janela de 7 dias no fuso `America/Sao_Paulo` em uma única CTE SQL reaproveitada por `listStudents` e `getAnalytics`, e `getStudentDetail` conta frequência semanal diretamente no SQL (sem limite de 15 linhas).
  - Alunos sem nenhuma sessão ainda usam `joinedAt` para cálculo de inatividade (`attentionStudents`), recebendo `neverTrained: true` se vinculados há 4+ dias sem treinar (sem falso alerta de "7 dias inativo" no cadastro).

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
  - No `WorkoutPlayer.tsx`, a fase de descanso entre séries respeita `current.restSeconds` (fallback `45s`) e conta com um anel giratório 360° animado via `Animated.loop` e `useNativeDriver: true` (idêntico à estética do `PreparingScreen.tsx`), envolvendo o círculo do cronômetro.
- **Compatibilidade Cross-Platform (Web + Mobile):**
  - Substituímos `Alert.alert` com botões de ação pelo componente reutilizável [`ConfirmModal.tsx`](src/components/ConfirmModal.tsx) (usado em exclusões, interrupção de treino, saída da conta em `SettingsScreen` e ações na `StudentDetailScreen`).
  - Seletores de data e hora usam o componente unificado [`DateTimePickerField.tsx`](src/components/DateTimePickerField.tsx) (input HTML nativo `date`/`time` no Web adaptado ao tema, `@react-native-community/datetimepicker` nativo no Android e `spinner` com botões `Cancelar/Confirmar` no iOS), aplicado no cadastro (`Step1PersonalData`, `Step4Schedule`), pesagem em `ProgressScreen` e criação de avaliações.
  - Faixas horizontais de filtros e abas (`TrainerHomeScreen` e as 4 abas em `StudentDetailScreen`) usam [`HorizontalScrollStrip.tsx`](src/components/HorizontalScrollStrip.tsx) para sinalizar overflow com *peek* e setas dinâmicas.
  - Evitar `<TouchableOpacity>` aninhado dentro de outro `<TouchableOpacity>` (cards de aluno e alerta no painel do Personal usam `<View>` externa e cliques separados).
  - Abas do aluno compartilham [`TabFocusContext.tsx`](src/context/TabFocusContext.tsx) no `TabNavigator` para recarregar Home, Treinos e Progresso ao alternar de aba; em [`AuthContext.tsx`](src/context/AuthContext.tsx), `logout` envia `keepalive: true`.

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
  - Iniciar: `cd bodysync-api && npm run dev` (Porta 3000; no Windows também via `node node_modules/tsx/dist/cli.mjs src/server.ts`).
  - Executar Migrações SQL: `npm --prefix bodysync-api run migrate -- 006_student_evaluations.sql` (migrações atuais: `001` a `006`).
  - Testes completos da API: `cd bodysync-api && npx tsx --test src/__tests__/trainer.test.ts src/__tests__/audit-fixes.test.ts` (26/26 testes cobrindo auth, fuso, hidratação, medição cronológica, treino e módulo personal + avaliações).
  - Checagem de Tipos Backend: `cd bodysync-api && npx tsc --noEmit` (deve retornar código 0).
- **Frontend:**
  - Iniciar: `npm start` (Expo Metro) ou `npm run web` (`http://localhost:8081`).
  - Checagem de Tipos Frontend: `npx tsc --noEmit` (deve retornar código 0).
