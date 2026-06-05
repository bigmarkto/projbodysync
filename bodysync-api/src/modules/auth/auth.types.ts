// Dados que o cliente envia no Registro
export interface RegisterRequest {
  email: string
  password: string
  name?: string // Opcional no registro
}

// Dados que o cliente envia no Login
export interface LoginRequest {
  email: string
  password: string
}

// Dados que o cliente envia para Refresh/Logout
export interface RefreshRequest {
  refreshToken: string
}

// Estrutura do usuário que volta do banco (sem a senha!)
export interface User {
  id: string
  email: string
  name: string | null
}

// O que o backend retorna após login/registro/refresh
export interface AuthResponse {
  user: User
  accessToken: string
  refreshToken: string
}

// O que fica dentro do Payload do JWT (Access Token)
// Isso é o que o middleware vai extrair e colocar no request
export interface JwtPayload {
  userId: string
  email: string
}
