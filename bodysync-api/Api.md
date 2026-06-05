# BodySync API - Documentação de Rotas

**URL Base:** `http://localhost:3000/api`

**Autenticação:** Rotas protegidas exigem o header:  
`Authorization: Bearer <ACCESS_TOKEN>`

---

## 📌 Autenticação (`/auth`)

### 1. POST `/auth/register`
**Descrição:** Registrar novo usuário com dados físicos completos  
**Autenticação:** Não necessária

**Enviar (JSON):**
```json
{
  "email": "usuario@email.com",
  "password": "senha123",
  "name": "Nome do Usuário",
  "heightCm": 175,
  "birthDate": "1995-06-15",
  "weightKg": 78.5,
  "gender": "masculino",
  "fitnessGoal": "ganho_massa_muscular",
  "experienceLevel": "intermediario",
  "activityLevel": "moderado"
}
```

**Campos obrigatórios:**
- `email`, `password` (mínimo 6 caracteres), `name`
- `heightCm` (número), `birthDate` (YYYY-MM-DD), `weightKg` (número)
- `gender`: `masculino` | `feminino` | `outro` | `nao_binario`
- `fitnessGoal`: `emagrecimento` | `ganho_peso` | `ganho_massa_muscular` | `condicionamento_fisico` | `saude_bem_estar`

**Campos opcionais:**
- `experienceLevel`: `iniciante` | `intermediario` | `avancado` (padrão: `iniciante`)
- `activityLevel`: `sedentario` | `leve` | `moderado` | `ativo` | `muito_ativo` (padrão: `sedentario`)

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
    "experienceLevel": "intermediario",
    "activityLevel": "moderado"
  },
  "accessToken": "eyJhbG...",
  "refreshToken": "eyJhbG..."
}
```

**Erros possíveis:**
- `400 Bad Request`: Campos obrigatórios faltando ou inválidos
- `409 Conflict`: Email já cadastrado

---

### 2. POST `/auth/login`
**Descrição:** Login de usuário  
**Autenticação:** Não necessária

**Enviar (JSON):**
```json
{
  "email": "usuario@email.com",
  "password": "senha123"
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
    "experienceLevel": "intermediario",
    "activityLevel": "moderado"
  },
  "accessToken": "eyJhbG...",
  "refreshToken": "eyJhbG..."
}
```

**Erros possíveis:**
- `401 Unauthorized`: Credenciais inválidas

---

### 3. POST `/auth/refresh`
**Descrição:** Renovar tokens de acesso  
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
- `401 Unauthorized`: Refresh token inválido ou expirado

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

---

## 📌 Perfil do Usuário (`/profile`)

**⚠️ Todas as rotas deste módulo exigem autenticação.**

### 1. GET `/profile`
**Descrição:** Buscar perfil completo do usuário logado (com idade e IMC calculados)  
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
    "createdAt": "2026-06-05T17:38:37.079Z",
    "updatedAt": "2026-06-05T17:38:37.079Z",
    "age": 28,
    "bmi": 25.63
  }
}
```
*Nota: `age` e `bmi` são calculados automaticamente pelo backend.*

**Erros possíveis:**
- `401 Unauthorized`: Token inválido ou não fornecido
- `404 Not Found`: Perfil não encontrado

---

### 2. POST `/profile`
**Descrição:** Criar ou atualizar perfil completo (upsert)  
**Autenticação:** Obrigatória

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
  "workoutDays": 4
}
```

**Retorno (200 OK):** Mesmo formato do GET `/profile`.

---

### 3. PUT `/profile`
**Descrição:** Atualizar campos específicos do perfil (atualização parcial)  
**Autenticação:** Obrigatória

**Enviar (JSON) - Exemplo:**
```json
{
  "weightKg": 76.2
}
```

**Retorno (200 OK):** Mesmo formato do GET `/profile` (com `age` e `bmi` recalculados).

**Erros possíveis:**
- `400 Bad Request`: Nenhum campo válido para atualizar
- `401 Unauthorized`: Token inválido ou não fornecido

---

##  Exercícios (`/exercises`)
*(A ser implementado - em breve)*

## 📌 Planos de Treino (`/workouts`)
*(A ser implementado - em breve)*

---
**Nota:** Esta documentação será atualizada conforme novos módulos forem implementados.