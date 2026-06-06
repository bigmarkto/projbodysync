# BodySync API - Documentação de Rotas

**URL Base:** `http://localhost:3000/api`

**Autenticação:** Rotas protegidas exigem o header:
```
Authorization: Bearer <ACCESS_TOKEN>
```

---

## 📌 Autenticação (`/auth`)

### 1. POST `/auth/register`
**Descrição:** Registrar novo usuário com dados físicos e preferências completas  
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
  "subscriptionType": "premium",
  "desiredWeightKg": 75,
  "hydrationReminder": true,
  "desiredModality": "musculacao",
  "workoutSchedule": "segunda 18:00",
  "experienceLevel": "intermediario",
  "activityLevel": "moderado"
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
| `subscriptionType` | string | `free` \| `basic` \| `premium` |
| `desiredWeightKg` | number | Peso objetivo em kg (ex: `75`) |
| `hydrationReminder` | boolean | `true` para ativar lembrete de água |
| `desiredModality` | string | Ex: `musculacao`, `crossfit`, `yoga`, `corrida` |
| `workoutSchedule` | string | Ex: `segunda 18:00`, `terca 07:00` |

**Campos opcionais:**
- `experienceLevel`: `iniciante` \| `intermediario` \| `avancado` (padrão: `iniciante`)
- `activityLevel`: `sedentario` \| `leve` \| `moderado` \| `ativo` \| `muito_ativo` (padrão: `sedentario`)

**Retorno (201 Created):**
```json
{
  "user": {
    "id": "uuid-...",
    "email": "usuario@email.com",
    "name": "Nome do Usuário",
    "heightCm": 175,
    "birthDate": "1995-06-15",
    "weightKg": 78.5,
    "gender": "masculino",
    "fitnessGoal": "ganho_massa_muscular",
    "subscriptionType": "premium",
    "desiredWeightKg": 75,
    "hydrationReminder": true,
    "desiredModality": "musculacao",
    "workoutSchedule": "segunda 18:00",
    "experienceLevel": "intermediario",
    "activityLevel": "moderado"
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
| `400` | `"Tipo de assinatura inválido"` | `subscriptionType` fora dos valores permitidos |
| `400` | `"Peso desejado deve ser um número"` | `desiredWeightKg` não é número |
| `400` | `"Lembrete de hidratação deve ser true ou false"` | `hydrationReminder` não é boolean |
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
    "birthDate": "1995-06-15",
    "weightKg": 78.5,
    "gender": "masculino",
    "fitnessGoal": "ganho_massa_muscular",
    "subscriptionType": "premium",
    "desiredWeightKg": 75,
    "hydrationReminder": true,
    "desiredModality": "musculacao",
    "workoutSchedule": "segunda 18:00",
    "experienceLevel": "intermediario",
    "activityLevel": "moderado"
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
    "weightKg": 78.5,
    "heightCm": 175,
    "birthDate": "1995-06-15T00:00:00.000Z",
    "gender": "masculino",
    "fitnessGoal": "ganho_massa_muscular",
    "experienceLevel": "intermediario",
    "activityLevel": "moderado",
    "workoutDays": null,
    "subscriptionType": "premium",
    "desiredWeightKg": 75,
    "hydrationReminder": true,
    "desiredModality": "musculacao",
    "workoutSchedule": "segunda 18:00",
    "createdAt": "2026-06-05T17:38:37.079Z",
    "updatedAt": "2026-06-05T17:38:37.079Z",
    "age": 28,
    "bmi": 25.63
  }
}
```

**Campos calculados automaticamente:**
- `age`: Idade em anos (calculada a partir de `birthDate`)
- `bmi`: Índice de Massa Corporal (calculado a partir de `weightKg` e `heightCm`)

**Erros possíveis:**
| Status | Mensagem | Causa |
|--------|----------|-------|
| `401` | `"Token não fornecido"` | Header `Authorization` ausente |
| `401` | `"Formato de token inválido"` | Header não está no formato `Bearer <token>` |
| `401` | `"Token inválido ou expirado"` | Token JWT inválido ou expirado |
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
  "subscriptionType": "premium",
  "desiredWeightKg": 75,
  "hydrationReminder": true,
  "desiredModality": "musculacao",
  "workoutSchedule": "segunda 18:00"
}
```

**Retorno (200 OK):** Mesmo formato do GET `/profile`.

**Erros possíveis:**
| Status | Mensagem | Causa |
|--------|----------|-------|
| `401` | `"Usuário não autenticado"` | Token inválido ou ausente |

---

### 3. PUT `/profile`
**Descrição:** Atualizar campos específicos do perfil (atualização parcial). Apenas os campos enviados serão atualizados.  
**Autenticação:** Obrigatória

**Headers:**
```
Authorization: Bearer <ACCESS_TOKEN>
```

**Enviar (JSON) - Exemplo (apenas atualizar peso e ativar lembrete de hidratação):**
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

## 📌 Exercícios (`/exercises`)
*(A ser implementado - em breve)*

## 📌 Planos de Treino (`/workouts`)
*(A ser implementado - em breve)*

---

**Nota:** Esta documentação será atualizada conforme novos módulos forem implementados.