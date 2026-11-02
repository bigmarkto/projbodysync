# 🏋️‍♂️ BodySync

> Aplicativo móvel completo de saúde, treino e hidratação com backend REST e banco relacional em nuvem. Desenvolvido com foco em alta performance, código enxuto (*Zero Bloat*) e design intuitivo.

---

## 📱 Principais Funcionalidades

- **Dashboard & Home Interativa:** Resumo diário de calorias, tempo ativo, treino do dia e metas de hidratação.
- **Hidratação com Optimistic Updates:** Registro instantâneo de ingestão de água (`+250ml`, `+500ml`) com feedback visual em 0ms e rollback automático em caso de falha de rede.
- **Skeleton Loading:** Telas de carregamento com placeholders pulsantes nativos, eliminando telas brancas e spinners invasivos.
- **Player de Treino & HIIT Completo:**
  - Execução passo a passo com contagem de repetições, carga e intervalos de descanso.
  - Modo HIIT com timer circular SVG de alto contraste, avisos visuais e alternância automática entre séries e repouso.
  - Catálogo de exercícios integrado com busca otimizada (*debounce* de 300ms) e lista virtualizada.
- **Onboarding Guiado em 7 Etapas:** Cadastro progressivo de dados físicos, preferências de treino, frequência semanal e metas.
- **Acompanhamento de Progresso:** Histórico de pesagem, volume de treino e consistência semanal.
- **Dual Theme Reativo:** Alternância em tempo real entre **Dark Mode** (Obsidian/Slate com destaque Laranja) e **Light Mode**, em total conformidade com contraste de acessibilidade (WCAG AA).

---

## 🛠️ Stack Tecnológico

### Frontend (Mobile)
- **Framework:** [Expo SDK 54](https://docs.expo.dev/) com React Native 0.81 & React 19
- **Linguagem:** TypeScript 5.3 (modo estrito)
- **Navegação:** React Navigation 6 (Native Stack + TabBar Flutuante personalizada)
- **Animações & Ícones:** `react-native-reanimated`, `@expo/vector-icons`, `react-native-svg`
- **Armazenamento Local:** `@react-native-async-storage/async-storage`

### Backend (API REST)
- **Runtime:** Node.js (v18+) com Express 5 e `tsx` (TypeScript Execution)
- **Compressão:** Middleware GZIP (`compression`) reduzindo payloads JSON em até 70%
- **Segurança & Auth:** JWT (`jsonwebtoken`) com refresh lock *single-flight*, criptografia de senhas com `bcryptjs` e hash SHA-256 determinístico para tokens de recuperação
- **Resiliência:** Timeout HTTP de 10s via `AbortController` prevenindo bloqueio de interface
- **Banco de Dados:** PostgreSQL hospedado no [Supabase](https://supabase.com) via Transaction Pooler (`aws-1-sa-east-1.pooler.supabase.com:6543`) gerenciado com `pg.Pool`

---

## 🚀 Como Executar o Projeto

### Pré-requisitos
- [Node.js](https://nodejs.org/) v18 ou superior instalado
- [Git](https://git-scm.com/)
- Aplicativo [Expo Go](https://expo.dev/client) instalado no celular (ou emulador Android/iOS configurado)

---

### 1. Clonar e Instalar Dependências

```bash
# Clone o repositório
git clone https://github.com/seu-usuario/projbodysync.git
cd projbodysync

# Instale as dependências do Frontend (raiz)
npm install

# Instale as dependências da API Backend
cd bodysync-api
npm install
cd ..
```

---

### 2. Iniciar o Backend (API)

Abra um terminal dedicado para a API:

```bash
cd bodysync-api
npm run dev
```

O servidor iniciará em `http://localhost:3000` (e exibirá o IP local para acesso em rede externa).

> **Testes Automatizados do Backend:**
> ```bash
> npm --prefix bodysync-api test
> ```
> Executa a suíte de testes nativa do Node (`node --test`), cobrindo fuso horário (`America/Sao_Paulo`), proteções de SQL Injection e integridade de senhas/tokens.

---

### 3. Configurar a Conexão no Celular

Se você for testar o aplicativo no celular via **Expo Go**:
1. Descubra o IP local da sua máquina (ex: `192.168.1.100`).
2. Abra o arquivo `src/config/api.ts`.
3. Atualize a constante `API_URL` com o seu IP:
   ```ts
   export const API_URL = 'http://192.168.1.100:3000';
   ```

---

### 4. Iniciar o Frontend (Expo)

Em outro terminal na raiz do projeto:

```bash
npm start
```

- Pressione **`a`** para abrir no emulador Android.
- Pressione **`w`** para abrir no navegador web.
- Abra o aplicativo **Expo Go** no seu celular e aponte a câmera para o QR Code gerado no terminal.

---

## 📂 Estrutura de Pastas

```
projbodysync/
├── bodysync-api/               # Backend Express + TypeScript
│   ├── src/
│   │   ├── modules/            # Módulos de domínio (auth, workout, user-profile, etc.)
│   │   ├── config/             # Conexão com Supabase / PostgreSQL (pg.Pool)
│   │   └── __tests__/          # Testes de regressão e segurança
│   └── package.json
│
├── src/                        # Frontend React Native (Expo)
│   ├── components/             # Componentes modulares (Skeleton, HydrationCard, etc.)
│   ├── context/                # AuthContext (com lock concorrente) e ThemeProvider
│   ├── hooks/                  # useApi (com timeout de 10s) e hooks customizados
│   ├── navigation/             # TabNavigator flutuante e Stack Principal
│   ├── screens/                # Telas (Home, Workouts, HIIT, Onboarding, Progresso)
│   ├── theme/                  # Design tokens (cores Dark/Light, tipografia, espaçamentos)
│   └── types/                  # Tipagens TypeScript compartilhadas
│
├── PROJECT_CONTEXT.md          # 🧠 Contexto permanente e histórico de decisões técnicas
├── tsconfig.json               # Configuração estrita do TypeScript
└── package.json
```

---

## 🧠 Contexto para IAs e Desenvolvedores

Para entender todas as decisões arquiteturais tomadas no projeto, consulte o arquivo:
👉 **[`PROJECT_CONTEXT.md`](PROJECT_CONTEXT.md)**

Nele constam:
- As regras de fuso horário brasileiro (`America/Sao_Paulo`) para não trocar a data após 21h UTC.
- A proteção anti-lockout e concorrência no token refresh do `AuthContext`.
- A regra de `paddingBottom: insets.bottom + 100` para a TabBar flutuante.
- Diretrizes de *Lazy Senior Dev* (o que foi rejeitado conscientemente para evitar over-engineering).

---

## 📜 Licença

Este projeto é desenvolvido para fins acadêmicos e educacionais sob a licença [MIT](LICENSE).
