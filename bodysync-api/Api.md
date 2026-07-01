# BodySync API - Documentação de Rotas

**URL Base:** `http://localhost:3000/api`

**Autenticação:** Rotas protegidas exigem o header:
```
Authorization: Bearer <ACCESS_TOKEN>
```

---

## 📌 Autenticação (`/auth`)

### 1. POST `/auth/register`
**Descrição:** Registrar novo usuário com dados físicos, preferências e condição física atual
**Autenticação:** Não necessária

**Enviar (JSON):**
```json
{
  "email": "usuario@email.com",
  "password": "Senha123",
  "confirmPassword": "Senha123",
  "name": "Nome do Usuário",
  "birthYear": "1995-06-15",
  "heightCm": 175,
  "weightKg": 78.5,
  "desiredWeightKg": 75,
  "gender": "masculino",
  "fitnessGoal": "condicionamento_fisico",
  "experienceLevel": "intermediario",
  "activityLevel": "moderado",
  "role": "comum",
  "subscriptionType": "premium",
  "hydrationReminder": true,
  "hydrationTime": "10:00",
  "modalities": ["musculacao", "calistenia"],
  "workoutDays": [1, 3, 5],
  "workoutTime": "18:00"
}
```

> **Nota:** O backend aceita **múltiplos formatos** para facilitar a integração com o frontend:
> - `birthYear` (string) OU `birthDate` (string)
> - `modalities` (array) OU `desiredModality` (string)
> - `workoutDays` + `workoutTime` OU `workoutSchedule` (objeto)
> - `confirmPassword` é opcional

**Campos obrigatórios:**
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `email` | string | Email válido (deve conter `@`) |
| `password` | string | **Mínimo 8 caracteres, 1 letra maiúscula e 1 número** |
| `name` | string | Nome completo do usuário |
| `heightCm` | number | Altura em centímetros (ex: `175`) |
| `birthYear` ou `birthDate` | string | Data de nascimento (`YYYY-MM-DD`) |
| `weightKg` | number | Peso atual em kg (ex: `78.5`) |
| `gender` | string | `masculino` \| `feminino` \| `outro` \| `nao_binario` |
| `role` | string | `comum` \| `admin` \| `professor` (padrão: `comum`) |
| `subscriptionType` | string | `free` \| `basic` \| `premium` (padrão: `free`) |
| `hydrationReminder` | boolean | `true` para ativar lembrete de água |

**Campos opcionais:**
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `confirmPassword` | string | Deve ser igual à senha (validado se enviado) |
| `desiredWeightKg` | number | Peso objetivo em kg |
| `fitnessGoal` | string | `emagrecimento` \| `ganho_peso` \| `ganho_massa_muscular` \| `condicionamento_fisico` \| `saude_bem_estar` |
| `experienceLevel` | string | `iniciante` \| `intermediario` \| `avancado` — apenas informativo |
| `activityLevel` | string | `sedentario` \| `leve` \| `moderado` \| `ativo` \| `muito_ativo` (padrão: `moderado`) |
| `hydrationTime` | string | Horário do lembrete (`HH:MM`) |
| `modalities` | array | Array de strings (ex: `["musculacao", "calistenia"]`) |
| `workoutDays` | array | Array de números (0-6) representando os dias da semana |
| `workoutTime` | string | Horário único do treino (`HH:MM`) |

**Regras de validação de senha (RFS03):**
- Mínimo **8 caracteres**
- Pelo menos **1 letra maiúscula**
- Pelo menos **1 número**

**Exemplos válidos:** `Senha123`, `MinhaSenha2024`, `Teste1A`
**Exemplos inválidos:** `senha123` (sem maiúscula), `Senha` (sem número), `12345678` (sem letra)

**Retorno (201 Created):**
```json
{
  "message": "Usuário cadastrado com sucesso!",
  "user": {
    "id": "uuid-...",
    "email": "usuario@email.com",
    "name": "Nome do Usuário",
    "heightCm": 175,
    "birthDate": "1995-06-15T00:00:00.000Z",
    "weightKg": 78.5,
    "gender": "masculino",
    "fitnessGoal": "condicionamento_fisico",
    "role": "comum",
    "experienceLevel": "intermediario",
    "activityLevel": "moderado",
    "workoutFrequency": 3,
    "lastWorkoutDate": null,
    "subscriptionType": "premium",
    "desiredWeightKg": 75,
    "hydrationReminder": true,
    "desiredModality": "musculacao",
    "workoutSchedule": {
      "days": [false, true, false, true, false, true, false],
      "time": "18:00"
    }
  },
  "accessToken": "eyJhbG...",
  "refreshToken": "eyJhbG..."
}
```

**Erros possíveis:**
| Status | Mensagem | Causa |
|--------|----------|-------|
| `400` | `"Formato de email inválido. Exemplo: usuario@email.com"` | Email sem `@` ou formato incorreto |
| `400` | `"Senha é obrigatória"` | Senha não enviada |
| `400` | `"A senha deve ter no mínimo 8 caracteres"` | Senha curta |
| `400` | `"A senha deve conter pelo menos uma letra maiúscula e um número"` | Senha fraca |
| `400` | `"As senhas não coincidem"` | `password` ≠ `confirmPassword` |
| `400` | `"Nome deve ter pelo menos 3 caracteres"` | Nome muito curto |
| `400` | `"Data de nascimento é obrigatória. Envie birthYear ou birthDate."` | Data faltando |
| `400` | `"Altura deve ser um número válido em centímetros"` | Altura inválida |
| `400` | `"Peso deve ser um número válido em quilogramas"` | Peso inválido |
| `400` | `"Gênero inválido. Use: masculino \| feminino \| outro \| nao_binario"` | Gênero inválido |
| `400` | `"Tipo de usuário inválido. Use: comum \| admin \| professor"` | Role inválido |
| `400` | `"Tipo de assinatura inválido. Use: free \| basic \| premium"` | Assinatura inválida |
| `409` | `"Este email já está cadastrado"` | Email duplicado |
| `500` | `"Erro interno ao cadastrar usuário. Tente novamente."` | Erro no servidor |

---

### 2. POST `/auth/login`
**Descrição:** Login de usuário
**Autenticação:** Não necessária

**Enviar (JSON):**
```json
{
  "email": "usuario@email.com",
  "password": "Senha123"
}
```

**Retorno (200 OK):**
```json
{
  "message": "Login realizado com sucesso!",
  "user": {
    "id": "uuid-...",
    "email": "usuario@email.com",
    "name": "Nome do Usuário",
    "heightCm": 175,
    "birthDate": "1995-06-15T00:00:00.000Z",
    "weightKg": 78.5,
    "gender": "masculino",
    "fitnessGoal": "condicionamento_fisico",
    "role": "comum",
    "experienceLevel": "intermediario",
    "activityLevel": "moderado",
    "workoutFrequency": 3,
    "lastWorkoutDate": null,
    "subscriptionType": "premium",
    "desiredWeightKg": 75,
    "hydrationReminder": true,
    "desiredModality": "musculacao",
    "workoutSchedule": {
      "days": [false, true, false, true, false, true, false],
      "time": "18:00"
    }
  },
  "accessToken": "eyJhbG...",
  "refreshToken": "eyJhbG..."
}
```

**Erros possíveis:**
| Status | Mensagem | Causa |
|--------|----------|-------|
| `400` | `"Email e senha são obrigatórios"` | Campos faltando no body |
| `401` | `"Email ou senha inválidos"` | Credenciais incorretas |

---

### 3. POST `/auth/forgot-password` 🔑 NOVO
**Descrição:** Solicitar link de recuperação de senha (RFS03)
**Autenticação:** Não necessária

> **Importante:** Sempre retorna 200 OK mesmo se o email não estiver cadastrado (segurança para não revelar emails existentes).

**Enviar (JSON):**
```json
{
  "email": "usuario@email.com"
}
```

**Retorno (200 OK):**
```json
{
  "message": "Se o e-mail estiver cadastrado, você receberá as instruções de recuperação em instantes."
}
```

**Comportamento interno:**
1. Gera um token único (64 caracteres hexadecimais)
2. Salva no banco com validade de **30 minutos**
3. Em produção: envia email com link contendo o token
4. Em desenvolvimento: exibe o token no console do backend

**Erros possíveis:**
| Status | Mensagem | Causa |
|--------|----------|-------|
| `400` | `"Formato de email inválido"` | Email mal formatado |

> **Nota:** Nunca é retornado erro para email não encontrado (proteção contra enumeração de usuários).

---

### 4. POST `/auth/reset-password` 🔑 NOVO
**Descrição:** Redefinir senha usando o token recebido por email (RFS03)
**Autenticação:** Não necessária

**Enviar (JSON):**
```json
{
  "token": "ffe46c5308ad9fc098f4b7dff4765c914471568a8bf71c83607b31f501c9d3f3",
  "password": "NovaSenha123",
  "confirmPassword": "NovaSenha123"
}
```

**Campos obrigatórios:**
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `token` | string | Token recebido por email (64 caracteres) |
| `password` | string | Nova senha (deve seguir as regras do cadastro) |
| `confirmPassword` | string | Confirmação da nova senha |

**Retorno (200 OK):**
```json
{
  "message": "Senha redefinida com sucesso! Faça login com a nova senha."
}
```

**Comportamento interno:**
1. Valida o token (verifica se existe, se não expirou e se não foi usado)
2. Valida a força da nova senha (8 chars, maiúscula, número)
3. Atualiza a senha no banco
4. **Invalida o token usado** (não pode ser reutilizado)

**Erros possíveis:**
| Status | Mensagem | Causa |
|--------|----------|-------|
| `400` | `"Token de recuperação é obrigatório"` | Token não enviado |
| `400` | `"Senha é obrigatória"` | Senha não enviada |
| `400` | `"A senha deve ter no mínimo 8 caracteres"` | Senha curta |
| `400` | `"A senha deve conter pelo menos uma letra maiúscula e um número"` | Senha fraca |
| `400` | `"As senhas não coincidem"` | Senha ≠ confirmação |
| `400` | `"Token inválido ou expirado"` | Token não existe, já foi usado ou passou de 30 minutos |

---

### 5. POST `/auth/refresh`
**Descrição:** Renovar tokens de acesso (quando o access token expira)
**Autenticação:** Não necessária (usa o refresh token no corpo)

**Enviar (JSON):**
```json
{
  "refreshToken": "eyJhbG..."
}
```

**Retorno (200 OK):**
```json
{
  "accessToken": "novo_eyJhbG...",
  "refreshToken": "novo_eyJhbG..."
}
```

**Erros possíveis:**
| Status | Mensagem | Causa |
|--------|----------|-------|
| `400` | `"Refresh token é obrigatório"` | Campo faltando no body |
| `401` | `"Refresh token inválido ou expirado"` | Token inválido, expirado ou já usado |

---

### 6. POST `/auth/logout`
**Descrição:** Invalidar todos os refresh tokens do usuário (logout)
**Autenticação:** Não necessária (usa o refresh token no corpo)

**Enviar (JSON):**
```json
{
  "refreshToken": "eyJhbG..."
}
```

**Retorno (204 No Content):** Sem corpo de resposta.

**Erros possíveis:**
| Status | Mensagem | Causa |
|--------|----------|-------|
| `400` | `"Refresh token é obrigatório"` | Campo faltando no body |
| `401` | `"Refresh token inválido"` | Token mal formatado |
| `500` | `"Nenhum token ativo encontrado"` | Token não existe no banco |

---

## 📌 Perfil do Usuário (`/profile`)

**⚠️ Todas as rotas deste módulo exigem autenticação.**

### 1. GET `/profile`
**Descrição:** Buscar perfil completo do usuário logado (com idade e IMC calculados automaticamente)
**Autenticação:** Obrigatória

**Headers:**
```
Authorization: Bearer <ACCESS_TOKEN>
```

**Retorno (200 OK):**
```json
{
  "profile": {
    "id": "uuid-...",
    "userId": "uuid-...",
    "weightKg": 70,
    "heightCm": 175,
    "birthDate": "1995-01-01T02:00:00.000Z",
    "gender": "masculino",
    "fitnessGoal": "condicionamento_fisico",
    "role": "comum",
    "experienceLevel": "iniciante",
    "activityLevel": "moderado",
    "workoutDays": null,
    "workoutFrequency": 3,
    "lastWorkoutDate": null,
    "subscriptionType": "premium",
    "desiredWeightKg": 68,
    "hydrationReminder": true,
    "desiredModality": "musculacao",
    "workoutSchedule": {
      "days": [false, true, false, true, false, true, false],
      "time": "18:00"
    },
    "createdAt": "2026-06-06T15:07:41.138Z",
    "updatedAt": "2026-06-06T15:07:41.138Z",
    "age": 31,
    "bmi": 22.86
  }
}
```

**Campos calculados automaticamente:**
- `age`: Idade em anos (calculada a partir de `birthDate`)
- `bmi`: Índice de Massa Corporal (calculado a partir de `weightKg` e `heightCm`)

**Erros possíveis:**
| Status | Mensagem | Causa |
|--------|----------|-------|
| `401` | `"Usuário não autenticado"` | Token inválido ou ausente |
| `404` | `"Perfil não encontrado"` | Usuário não tem perfil cadastrado |

---

### 2. POST `/profile`
**Descrição:** Criar ou atualizar perfil completo (upsert). Se o perfil já existir, atualiza todos os campos.
**Autenticação:** Obrigatória

**Headers:**
```
Authorization: Bearer <ACCESS_TOKEN>
```

**Enviar (JSON):**
```json
{
  "weightKg": 78.5,
  "heightCm": 175,
  "birthDate": "1995-06-15",
  "gender": "masculino",
  "fitnessGoal": "ganho_massa_muscular",
  "experienceLevel": "intermediario",
  "activityLevel": "moderado",
  "workoutDays": 4,
  "workoutFrequency": 3,
  "lastWorkoutDate": "2026-05-01",
  "subscriptionType": "premium",
  "desiredWeightKg": 75,
  "hydrationReminder": true,
  "desiredModality": "musculacao",
  "workoutSchedule": {
    "days": [false, true, false, true, false, true, false],
    "time": "18:00"
  }
}
```

**Retorno (200 OK):** Mesmo formato do GET `/profile`.

---

### 3. PUT `/profile`
**Descrição:** Atualizar campos específicos do perfil (atualização parcial). Apenas os campos enviados serão atualizados.
**Autenticação:** Obrigatória

**Headers:**
```
Authorization: Bearer <ACCESS_TOKEN>
```

**Enviar (JSON) - Exemplo:**
```json
{
  "weightKg": 76.2,
  "hydrationReminder": true
}
```

**Retorno (200 OK):** Mesmo formato do GET `/profile` (com `age` e `bmi` recalculados).

**Erros possíveis:**
| Status | Mensagem | Causa |
|--------|----------|-------|
| `400` | `"Nenhum campo para atualizar"` | Body vazio ou todos os valores são `null` |
| `401` | `"Usuário não autenticado"` | Token inválido ou ausente |
| `404` | `"Perfil não encontrado"` | Usuário não tem perfil cadastrado |

---

## 💳 Pagamento (`/payment`)

### POST `/payment/subscribe`
**Descrição:** Simular ativação de assinatura (placeholder para integração futura com gateway de pagamento)
**Autenticação:** Obrigatória

**Headers:**
```
Authorization: Bearer <ACCESS_TOKEN>
```

**Enviar (JSON):**
```json
{
  "subscriptionType": "premium"
}
```

**Retorno (200 OK):**
```json
{
  "success": true,
  "message": "Pagamento simulado com sucesso. Assinatura ativada.",
  "data": {
    "subscription": "premium",
    "status": "active"
  }
}
```

**Erros possíveis:**
| Status | Mensagem | Causa |
|--------|----------|-------|
| `401` | `"Token inválido ou expirado"` | Usuário não autenticado |

---

## 🎯 Regra de Negócio: Recomendação de Exercícios

O sistema **NÃO restringe** exercícios com base em nível de experiência (`experienceLevel`). Esse campo é apenas informativo.

### Como funciona a personalização:

1. **Catálogo completo**: Todos os usuários veem todos os exercícios disponíveis.
2. **Ordem inteligente**: Exercícios compatíveis com sua condição atual aparecem primeiro.
3. **Filtros manuais**: O usuário pode filtrar por dificuldade se desejar.

### Fatores que influenciam a recomendação:

| Fator | Impacto |
|-------|---------|
| `activityLevel` | Define a intensidade base sugerida |
| `workoutFrequency` | Frequência alta → progressão mais rápida |
| `lastWorkoutDate` | Inatividade longa → recomendação de retomada |
| `fitnessGoal` | Direciona o tipo de exercício (força, cardio, etc.) |

---

## 🔐 Fluxo de Recuperação de Senha (RFS03)

### Visão Geral

O fluxo de recuperação funciona em **3 etapas**:

```
[Esqueci minha senha] → [Solicita recuperação] → [Recebe email com link] → [Redefine senha]
```

### Etapa 1: Solicitar Recuperação
- **Endpoint:** `POST /auth/forgot-password`
- **Ação:** Frontend envia o email
- **Resposta:** Sempre 200 OK (mensagem genérica)
- **Backend:** Gera token válido por 30 minutos e envia email

### Etapa 2: Redefinir Senha
- **Endpoint:** `POST /auth/reset-password`
- **Ação:** Frontend envia token + nova senha
- **Validações:**
  - Token válido e não expirado (30 min)
  - Senha forte (8 chars, maiúscula, número)
  - Confirmação de senha
- **Backend:** Atualiza senha e invalida o token

### Regras de Segurança
- ✅ Mensagem genérica (não revela se email existe)
- ✅ Token válido por apenas 30 minutos
- ✅ Token só pode ser usado 1 vez
- ✅ Senha forte obrigatória (mesmas regras do cadastro)
- ✅ Confirmação de senha (digitar 2x)

### Em Desenvolvimento (sem email configurado):
1. Faça `POST /auth/forgot-password` com o email
2. Copie o token que aparece no **console do backend**
3. Faça `POST /auth/reset-password` com o token copiado

---

## 📌 Exercícios (`/exercises`)
*(A ser implementado - em breve)*

## 📌 Planos de Treino (`/workouts`)
*(A ser implementado - em breve)*

---

**Nota:** Esta documentação será atualizada conforme novos módulos forem implementados.

**Última atualização:** 02/07/2026 - Adicionadas rotas de recuperação de senha e flexibilizadas validações do registro.