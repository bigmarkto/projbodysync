import { useApi } from './useApi'
import { RegisterData } from '../screens/Registration/RegisterContext'

export const useRegisterApi = () => {
  const { request } = useApi()

  const register = async (data: RegisterData) => {
    // ✅ Converter workoutDays para array de booleanos
    const boolDays = Array(7).fill(false)
    data.workoutDays.forEach(d => {
      if (d >= 0 && d < 7) boolDays[d] = true
    })

    const payload = {
      email: data.email,
      password: data.password,
      confirmPassword: data.password, // Adicionado
      name: data.name,
      birthYear: data.birthYear, // Enviar como string (não converter!)
      heightCm: data.heightCm,
      weightKg: data.weightKg,
      desiredWeightKg: data.desiredWeightKg,
      gender: data.gender,
      fitnessGoal: 'condicionamento_fisico', // Valor padrão
      experienceLevel: data.experienceLevel, // Campo correto
      activityLevel: 'moderado', // Valor padrão (ajuste conforme necessário)
      role: data.role || 'comum', // Adicionado
      subscriptionType: data.subscriptionType,
      hydrationReminder: data.hydrationReminder,
      hydrationTime: data.hydrationTime || null,
      modalities: data.modalities, // Enviar array completo
      workoutDays: data.workoutDays,
      workoutTime: data.workoutTime,
      workoutSchedule: {
        days: boolDays,
        time: data.workoutTime,
      },
    }

    const res = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    })

    const json = await res.json()

    return { res, json }
  }

  return { register }
}
