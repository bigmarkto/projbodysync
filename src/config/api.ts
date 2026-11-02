/**
 * CONFIGURAÇÃO DA API
 *
 * INSTRUÇÕES PARA O DESENVOLVEDOR:
 * 1. Configure `EXPO_PUBLIC_API_URL` no arquivo `.env` na raiz do projeto com o IP da sua máquina.
 * 2. O celular e o computador DEVEM estar na mesma rede Wi-Fi.
 */
export const API_URL =
  process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.81:3000/api'
