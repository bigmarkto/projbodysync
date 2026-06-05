# BodySync API - Documentação de Rotas

**URL Base:** `http://localhost:3000/api`

**Autenticação:** Rotas protegidas exigem o header:  
`Authorization: Bearer <ACCESS_TOKEN>`

---

## 📌 Autenticação (`/auth`)

### 1. POST `/auth/register`
**Descrição:** Registrar novo usuário  
**Autenticação:** Não necessária

**Enviar (JSON):**
```
{
  "email": "usuario@email.com",
  "password": "senha123",
  "name": "Nome do Usuário"
}
```

**Retorno (201 Created):**
```
{
  "user": {
    "id": "uuid-...",
    "email": "usuario@email.com",
    "name": "Nome do Usuário"
  },
  "accessToken": "eyJhbG...",
  "refreshToken": "eyJhbG..."
}
```
**Erros possíveis:**
- `400 Bad Request`: Campos inválidos (ex: email sem @, senha curta).
- `409 Conflict`: Email já cadastrado.

---

### 2. POST `/auth/login`
**Descrição:** Login de usuário  
**Autenticação:** Não necessária

**Enviar (JSON):**
```
{
  "email": "usuario@email.com",
  "password": "senha123"
}
```
**Retorno (200 OK):**
```
{
  "user": {
    "id": "uuid-...",
    "email": "usuario@email.com",
    "name": "Nome do Usuário"
  },
  "accessToken": "eyJhbG...",
  "refreshToken": "eyJhbG..."
}
```
**Erros possíveis:**
- `401 Unauthorized`: Credenciais inválidas.

---

### 3. POST `/auth/refresh`
**Descrição:** Renovar tokens de acesso (quando o access token expira)  
**Autenticação:** Não necessária (usa o refresh token no corpo)

**Enviar (JSON):**
```
{
  "refreshToken": "eyJhbG..."
}
```

**Retorno (200 OK):**
```
{
  "accessToken": "novo_eyJhbG...",
  "refreshToken": "novo_eyJhbG..."
}
```

**Erros possíveis:**
- `401 Unauthorized`: Refresh token inválido ou expirado.

---

### 4. POST `/auth/logout`
**Descrição:** Invalidar refresh token (logout)  
**Autenticação:** Não necessária (usa o refresh token no corpo)

**Enviar (JSON):**
```
{
  "refreshToken": "eyJhbG..."
}
```
**Retorno (204 No Content):** Sem corpo de resposta.

---

## 📌 Exercícios (`/exercises`)
*(A ser implementado - em breve)*

---

## 📌 Planos de Treino (`/workouts`)
*(A ser implementado - em breve)*

---

**Nota:** Esta documentação será atualizada conforme novos módulos forem implementados.