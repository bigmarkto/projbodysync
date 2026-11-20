# 📋 BodySync - Contexto Geral do Projeto & Registro de Decisões

> **Para novos chats e assistentes de IA:**  
> Leia este documento antes de realizar qualquer alteração no código. Ele consolida a arquitetura completa do projeto (App Mobile/Web, Backend Express, Supabase Edge Functions, Build Android APK, Módulo Personal Trainer, Auditorias WCAG/UI e Suítes de Teste) e substitui a necessidade de consultar chats antigos.

---

## 1. Visão Geral & Stack Tecnológico

- **O que é:** O **BodySync** é um aplicativo de treino, saúde, hidratação e consultoria de Personal Trainer com backend REST API e integração PostgreSQL/Supabase.
- **Diretriz de Engenharia:** Alta qualidade, código enxuto, performance fluida e estabilidade, **sem over-engineering** (*Ponytail: Lazy Senior Dev* — a melhor linha de código é a que não precisou ser escrita).
- **Stack:**
  - **Frontend:** React Native (Expo SDK 54 + projeto nativo `android/`), TypeScript, `@expo/vector-icons`, `react-native-safe-area-context`, `react-native-reanimated`, `@react-native-async-storage/async-storage`.
  - **Backend Local/Express:** Node.js, Express, TypeScript, `pg.Pool`, `compression`, `bcryptjs`, `jsonwebtoken`.
  - **Backend Cloud (APK):** Supabase Cloud Edge Functions em Deno (`supabase/functions/api/*.ts`) servindo as mesmas rotas REST para o APK Android sem depender de IP local.
  - **Banco de Dados:** Supabase PostgreSQL (`aws-1-sa-east-1.pooler.supabase.com:6543`).
  - **Testes:** Node.js native test runner (`node --test` / `npx tsx --test`).

---

## 2. Mapa das Branches & Estado do Repositório

- **`master`:** Branch principal de produção/entrega no GitHub.
- **`feat/personal-trainer`:** Contém o módulo completo de Personal Trainer, prescrições, avaliações físicas (`003`–`006`), `PROJECT_CONTEXT.md` e (no working tree local) a auditoria de UI/WCAG + `AiBotAvatar`.
- **`build_android_apk`:** Ramificada de `feat/personal-trainer` (`2a7eb2c`). Contém o projeto nativo `android/` (Gradle/APK), `metro.config.js`, `supabase/functions/api/*`, fallback de API em `src/config/api.ts` (`fetchWithApiFallback`) e as suítes de teste (`modules-suite.test.ts`, `frontend-logic.test.ts`, `android-build.test.mjs`).
- **Arquivos acadêmicos (não versionar na `master`):** `avaliacao-ihc-bodysync.html`, `bodySync_Avaliacao_IHC_SUS_UEQ.pdf`, `generate_pdf.py` (material de IHC/SUS/UEQ) e `comparacao-branches.html` (painel temporário de revisão).

---

## 3. Decisões Arquiteturais & Regras de Negócio

### A. Autenticação, Segurança & Onboarding
- **Token Refresh Lock:** Em [`src/context/AuthContext.tsx`](src/context/AuthContext.tsx), `refreshPromiseRef` atua como single-flight lock: chamadas concorrentes com `401 Unauthorized` aguardam o mesmo refresh sem disparar requisições duplicadas. No `logout`, envia `keepalive: true`.
- **Hash de Tokens de Recuperação:** No [`bodysync-api/src/modules/auth/auth.service.ts`](bodysync-api/src/modules/auth/auth.service.ts), tokens de redefinição usam `crypto.createHash('sha256')` antes de persistir no banco.
- **Prevenção de SQL Injection em Perfis:** Em [`user-profile.service.ts`](bodysync-api/src/modules/user-profile/user-profile.service.ts), `PROFILE_FIELD_MAP` define a whitelist estrita de colunas permitidas para `UPDATE`.
- **Lock contra Concorrência (TOCTOU):** Em [`workout.service.ts`](bodysync-api/src/modules/workout/workout.service.ts), limites de planos por assinatura usam `SELECT ... FOR UPDATE` dentro de `BEGIN...COMMIT`.
- **Hardening de Cadastro & Pagamento Simulado:** `POST /api/auth/register` aceita apenas `comum` ou `professor` (bloqueia `admin` com `403`) e inicia sempre no plano `free`. Planos pagos (`premium` para aluno; `basic` para personal) passam por [`PaymentScreen.tsx`](src/screens/Registration/PaymentScreen.tsx) -> `POST /api/payment/subscribe`, validado por `isSubscriptionAllowedForRole`.
- **Onboarding por Perfil:** Em [`RegisterScreen.tsx`](src/screens/Registration/RegisterScreen.tsx), contas `comum` percorrem 7 etapas e contas `professor` percorrem 3 etapas (`Step1PersonalData` -> `Step2Subscription` -> `Step7Confirmation`), com auto-login ao concluir. Trocar o perfil em `Step1PersonalData` limpa `subscriptionType`.

### B. Fusos Horários e Datas
- **Regra de Fuso (`America/Sao_Paulo`):** Datas de hidratação, pesagem e sessões nunca usam `new Date().toISOString().slice(0, 10)` sem conversão (evita salto de dia após 21h UTC). O backend usa âncora UTC-noon (`T12:00:00.000Z`), `Intl.DateTimeFormat` (`dateKey`) e validação estrita `isValidIsoDate`; o frontend usa [`parseDateOnlyLocal` / `formatDateBR`](src/components/DateTimePickerField.tsx).
- **Pesagens Retroativas:** `POST /api/measurements` valida `measuredAt` (`400` se inválido/futuro) e sincroniza `user_profiles.weight_kg` apenas pela medição cronologicamente mais recente (`ORDER BY measured_at DESC, id DESC`).

### C. Dependências Limpas
- 13 dependências desnecessárias foram removidas do `package.json` (`@gluestack-*`, `react-native-paper`, `@react-navigation/bottom-tabs`, etc.). Não adicionar bibliotecas para recursos que o React Native nativo já entrega.

### D. Banco de Dados & Supabase Hardening (Migração 002)
- **Isolamento de PostgREST & RLS:** Todos os privilégios foram revogados de `anon` e `authenticated` (`REVOKE ALL ON ALL TABLES/SEQUENCES/ROUTINES IN SCHEMA public FROM anon, authenticated`), e RLS foi ativado em todas as tabelas do schema `public`. O acesso ocorre exclusivamente pela API Express (`bodysync-api`) ou pelas Edge Functions (`supabase/functions/api/`).
- **Índices:** Todas as 11 Foreign Keys possuem índices B-tree dedicados (`idx_*`), além de índices compostos em `workout_sessions (user_id, finished_at DESC)`, `body_measurements (user_id, measured_at ASC)` e `plan_exercises (plan_id, order_index ASC)`. 3 índices redundantes sobre constraints `UNIQUE` foram removidos.
- **Funções e Triggers:** `update_updated_at_column()` usa `SECURITY INVOKER` e `SET search_path = ''`; trigger `update_hydration_logs_updated_at` adicionado em `hydration_logs`.
- **Legado `users` vs `user_profiles`:** Mantida retrocompatibilidade na Fase 1 (colunas não removidas de `users`).
- **Runner de Migrações:** `npm --prefix bodysync-api run migrate` ([`run-migration.ts`](bodysync-api/src/scripts/run-migration.ts)).

### E. Módulo Personal Trainer, Prescrições & Avaliações (Migrações 003–006)
- **Separação Estrita de Papéis (`RootNavigator` & Guards):** Sem troca de papel mockada. `'professor'` entra no [`TrainerMainFlow`](src/screens/Trainer/TrainerMainFlow.tsx) (abas `Métricas`, `Alunos`, `Ajustes`); `'comum'` entra no `TabNavigator` do aluno. Endpoints `/api/trainer/*` são protegidos por `requireProfessor`.
- **Vínculo Personal <-> Aluno (`trainer_students`):** Código único `BS-XXXX` por treinador (migrações `004`/`005`). Apenas `role = 'comum'` pode vincular-se (`403` para `professor`/`admin`). Desvínculo mútuo via `DELETE /api/trainer/students/:studentId`. Compartilhamento via [`shareTrainerInvite`](src/screens/Trainer/trainerService.ts) e [`openWhatsAppInvite`](src/screens/Trainer/trainerService.ts).
- **Avaliações Físicas (`006_student_evaluations.sql`):** Tabela `student_evaluations` com nota `1..5`, parecer obrigatório e medidas opcionais (`weight_kg`, `body_fat_pct`, `chest_cm`, `waist_cm`, `arm_cm`, `thigh_cm`). Personal cria/exclui na `StudentDetailScreen`; aluno visualiza em modo leitura via `GET /api/trainer/my-evaluations` na [`ProgressScreen.tsx`](src/screens/Progress/ProgressScreen.tsx) usando [`EvaluationCard.tsx`](src/components/EvaluationCard.tsx).
- **Prescrição Fiel & Catálogo Completo (880 exercícios):** [`TrainerPrescribeScreen.tsx`](src/screens/Trainer/TrainerPrescribeScreen.tsx) consulta `GET /api/exercises` com `search` (debounce), filtro por `category`, `limit=50` e paginação `"Carregar mais"`. Migração `005` adicionou `rest_seconds` (`10..600`, padrão `60`) em `plan_exercises`, respeitado no `WorkoutPlayer`.
- **Permissões & Limite Free:** Planos com `created_by_trainer_id IS NOT NULL` não consomem o limite de 2 planos gratuitos do aluno. Aluno vê o selo `Personal` e não pode editar/excluir (`403 ForbiddenPlanError`). `workout_sessions.plan_id` usa `ON DELETE SET NULL`.
- **Métricas & Janela Semanal Unificada:** [`TrainerAnalyticsScreen.tsx`](src/screens/Trainer/TrainerAnalyticsScreen.tsx) concentra os KPIs (`Alunos Ativos`, `Treinaram Hoje`, `Prescrições`). `fetchStudentsWithSessionTotals` consolida a janela de 7 dias (`America/Sao_Paulo`) em CTE SQL única; alunos sem sessões usam `joinedAt` (`neverTrained: true` após 4+ dias).

### F. Android APK & Supabase Cloud Edge Functions (`build_android_apk`)
- **Projeto Nativo Android:** Pasta `android/` configurada para build Gradle do APK (`com.bodysync.app`), com `metro.config.js` e `index.js`.
- **API em Nuvem (Edge Functions):** [`supabase/functions/api/`](supabase/functions/api/index.ts) replica os módulos (`auth.ts`, `exercise.ts`, `hydration.ts`, `measurement.ts`, `payment.ts`, `profile.ts`, `session.ts`, `trainer.ts`, `workout.ts`, `security.ts`, `db.ts`) no Deno/Supabase Cloud para o APK funcionar em dispositivos reais sem servidor local.
- **Resiliência de Rede:** [`src/config/api.ts`](src/config/api.ts) expõe `fetchWithApiFallback`, usado por `AuthContext`, `useApi`, `useRegister` e `LoginScreen`.

---

## 4. Padrões de UI/UX, Acessibilidade (WCAG) & Temas

- **Dual Theme Reativo & Persistente:**
  - Tokens ajustados para contraste WCAG em [`src/theme/colors.ts`](src/theme/colors.ts) (Dark `#0B0F17` / `#151D2A`, Light `#F8FAFC` / `#FFFFFF`, Primário `#F97316`).
  - [`src/context/ThemeProvider.tsx`](src/context/ThemeProvider.tsx) persiste a preferência em `AsyncStorage` (`@bodysync:theme`) e expõe `reduceMotion` via `AccessibilityInfo`.
  - [`src/navigation/RootNavigator.tsx`](src/navigation/RootNavigator.tsx) sincroniza `StatusBar` com `colors.background` e `isDark`.
- **Navegação & Alvos de Toque:**
  - [`src/navigation/TabNavigator.tsx`](src/navigation/TabNavigator.tsx) usa `useWindowDimensions`, `accessibilityRole="tab"`, `accessibilityState={{ selected }}` e alvos mínimos (`minHeight: 44/48`). Telas roláveis com abas ativas devem usar `paddingBottom: insets.bottom + 100`.
  - [`TabFocusContext.tsx`](src/context/TabFocusContext.tsx) recarrega Home, Treinos e Progresso ao alternar abas.
- **Players & Componentes Cross-Platform:**
  - `WorkoutPlayer.tsx` e `HiitPlayer.tsx` em tela cheia; descanso do `WorkoutPlayer` respeita `current.restSeconds` (fallback `45s`) com anel giratório 360° (`useNativeDriver: true`).
  - [`ConfirmModal.tsx`](src/components/ConfirmModal.tsx) substitui `Alert.alert` com botões de ação.
  - [`DateTimePickerField.tsx`](src/components/DateTimePickerField.tsx) unifica seleção de data/hora (Web HTML nativo, Android nativo, iOS spinner).
  - [`HorizontalScrollStrip.tsx`](src/components/HorizontalScrollStrip.tsx) sinaliza overflow horizontal com *peek* e setas.
  - [`AiBotAvatar.tsx`](src/components/AiBotAvatar.tsx) + [`aiBotState.ts`](src/components/aiBotState.ts): avatar/estado animado para assistente.
  - Evitar `<TouchableOpacity>` aninhado dentro de outro `<TouchableOpacity>`.

---

## 5. Otimizações de Performance

1. **Optimistic Updates:** [`HydrationCard.tsx`](src/components/HydrationCard.tsx) atualiza `+250ml`/`+500ml` imediatamente (0ms), revertendo em erro de rede.
2. **Timeout Resiliente:** [`useApi.ts`](src/hooks/useApi.ts) aplica timeout de 10s via `AbortController`.
3. **Compressão GZIP:** `compression()` em [`bodysync-api/src/app.ts`](bodysync-api/src/app.ts).
4. **Skeleton Loading:** [`Skeleton.tsx`](src/components/Skeleton.tsx) na Home.
5. **Debounce & Virtualização:** [`ExercisePicker.tsx`](src/screens/Workouts/ExercisePicker.tsx) com debounce de 300ms e `FlatList`.
6. **YAGNI:** Sem Redis, RabbitMQ/BullMQ, OpenTelemetry ou microsserviços.

---

## 6. Como Rodar e Testar

- **Backend:**
  - Iniciar: `cd bodysync-api && npm run dev` (porta `3000`; no Windows também `node node_modules/tsx/dist/cli.mjs src/server.ts`).
  - Migrações SQL: `npm --prefix bodysync-api run migrate -- 006_student_evaluations.sql` (`001` a `006`).
  - Testes API: `cd bodysync-api && npx tsx --test src/__tests__/trainer.test.ts src/__tests__/audit-fixes.test.ts` (e `modules-suite.test.ts` na branch do APK).
  - Typecheck Backend: `cd bodysync-api && npx tsc --noEmit`.
- **Frontend & Testes:**
  - Iniciar: `npm start` (Expo) ou `npm run web` (`http://localhost:8081`).
  - Typecheck Frontend: `npx tsc --noEmit`.
  - Testes WCAG / Lógica / Build Android: `npx tsx --test src/__tests__/ui-wcag-audit.test.ts` (e na branch APK: `test/frontend-logic.test.ts`, `node --test test/android-build.test.mjs`).
