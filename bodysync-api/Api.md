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
  "password": "senha123456",
  "name": "Nome do Usuário",
  "heightCm": 175,
  "birthDate": "1995-06-15",
  "weightKg": 78.5,
  "gender": "masculino",
  "fitnessGoal": "ganho_massa_muscular",
  "activityLevel": "moderado",
  "workoutFrequency": 3,
  "subscriptionType": "premium",
  "desiredWeightKg": 75,
  "hydrationReminder": true,
  "desiredModality": "musculacao",
  "workoutSchedule": {
    "days": [false, true, false, true, false, true, false],
    "time": "18:00"
  },
  "experienceLevel": "intermediario",
  "lastWorkoutDate": "2026-05-01",
  "consistencyScore": "medium"
}
```

**Campos obrigatórios:**
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `email` | string | Email válido (deve conter `@`) |
| `password` | string | Mínimo **8 caracteres** |
| `name` | string | Nome completo do usuário |
| `heightCm` | number | Altura em centímetros (ex: `175`) |
| `birthDate` | string | Data de nascimento (`YYYY-MM-DD`) |
| `weightKg` | number | Peso atual em kg (ex: `78.5`) |
| `gender` | string | `masculino` \| `feminino` \| `outro` \| `nao_binario` |
| `fitnessGoal` | string | `emagrecimento` \| `ganho_peso` \| `ganho_massa_muscular` \| `condicionamento_fisico` \| `saude_bem_estar` |
| `activityLevel` | string | `sedentario` \| `leve` \| `moderado` \| `ativo` \| `muito_ativo` |
| `workoutFrequency` | number | Dias de treino por semana (0-7) |
| `subscriptionType` | string | `free` \| `basic` \| `premium` |
| `desiredWeightKg` | number | Peso objetivo em kg (ex: `75`) |
| `hydrationReminder` | boolean | `true` para ativar lembrete de água |
| `desiredModality` | string | Ex: `musculacao`, `crossfit`, `yoga`, `corrida` |

**Campos opcionais:**
| Campo | Tipo | Descrição |
|-------|------|-----------|
| `experienceLevel` | string | `iniciante` \| `intermediario` \| `avancado` (padrão: `iniciante`) — **apenas informativo, não restringe exercícios** |
| `lastWorkoutDate` | string | Data do último treino (`YYYY-MM-DD`) |
| `consistencyScore` | string | `low` \| `medium` \| `high` |
| `workoutSchedule` | object | Estrutura `{ days, time }` (ver abaixo) |

**Estrutura de `workoutSchedule`:**
```json
{
  "workoutSchedule": {
    "days": [false, true, false, true, false, true, false],
    "time": "18:00"
  }
}
```
- `days`: Array fixo de **7 booleanos** representando `[domingo, segunda, terca, quarta, quinta, sexta, sabado]`
- `time`: Horário único no formato `HH:MM` (ex: `"18:00"`) ou `null` se não treina

**Retorno (201 Created):**
```json
{
  "user": {
    "id": "uuid-...",
    "email": "usuario@email.com",
    "name": "Nome do Usuário",
    "heightCm": 175,
    "birthDate": "1995-06-15T00:00:00.000Z",
    "weightKg": 78.5,
    "gender": "masculino",
    "fitnessGoal": "ganho_massa_muscular",
    "experienceLevel": "intermediario",
    "activityLevel": "moderado",
    "workoutFrequency": 3,
    "lastWorkoutDate": "2026-05-01",
    "consistencyScore": "medium",
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
| `400` | `"Formato de email inválido"` | Email sem `@` ou formato incorreto |
| `400` | `"A senha deve ter no mínimo 8 caracteres"` | Senha com menos de 8 caracteres |
| `400` | `"Campos obrigatórios faltando"` | Algum campo obrigatório não enviado |
| `400` | `"Nível de atividade inválido..."` | `activityLevel` fora dos valores permitidos |
| `400` | `"Frequência de treino deve ser um número entre 0 e 7"` | `workoutFrequency` inválido |
| `400` | `"Tipo de assinatura inválido"` | `subscriptionType` fora dos valores permitidos |
| `400` | `"Peso desejado deve ser um número"` | `desiredWeightKg` não é número |
| `400` | `"Lembrete de hidratação deve ser true ou false"` | `hydrationReminder` não é boolean |
| `400` | `"workoutSchedule deve ser um objeto"` | Estrutura inválida |
| `400` | `"days deve ser um array de exatamente 7 booleanos..."` | Array de dias inválido |
| `400` | `"time deve ser uma string no formato HH:MM..."` | Horário em formato inválido |
| `409` | `"Email já cadastrado"` | Email já existe no banco |

---

### 2. POST `/auth/login`
**Descrição:** Login de usuário
**Autenticação:** Não necessária

**Enviar (JSON):**
```json
{
  "email": "usuario@email.com",
  "password": "senha123456"
}
```

**Retorno (200 OK):**
```json
{
  "user": {
    "id": "uuid-...",
    "email": "usuario@email.com",
    "name": "Nome do Usuário",
    "heightCm": 175,
    "birthDate": "1995-06-15T00:00:00.000Z",
    "weightKg": 78.5,
    "gender": "masculino",
    "fitnessGoal": "ganho_massa_muscular",
    "experienceLevel": "intermediario",
    "activityLevel": "moderado",
    "workoutFrequency": 3,
    "lastWorkoutDate": "2026-05-01",
    "consistencyScore": "medium",
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

### 3. POST `/auth/refresh`
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

### 4. POST `/auth/logout`
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
    "experienceLevel": "iniciante",
    "activityLevel": "moderado",
    "workoutDays": null,
    "workoutFrequency": 3,
    "lastWorkoutDate": null,
    "consistencyScore": null,
    "subscriptionType": "free",
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
  "consistencyScore": "medium",
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

### Exemplos de cenários:

| Cenário | Resultado |
|---------|-----------|
| Usuário treinou regularmente nos últimos meses | Recebe recomendações com maior intensidade |
| Usuário com experiência mas sedentário há meses | Recebe planos de retomada gradual |
| Usuário nunca treinou mas pratica atividades regularmente | Pode ter progressões mais rápidas |

---

## 📌 Exercícios (`/exercises`)
*(A ser implementado - em breve)*

## 📌 Planos de Treino (`/workouts`)
*(A ser implementado - em breve)*

---

**Nota:** Esta documentação será atualizada conforme novos módulos forem implementados.