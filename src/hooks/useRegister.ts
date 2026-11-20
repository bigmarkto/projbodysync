import { fetchWithApiFallback } from '../config/api'
import { RegisterData } from '../screens/Registration/RegisterContext'

export const useRegisterApi = () => {
  const register = async (data: RegisterData) => {
    const boolDays = Array(7).fill(false)
    data.workoutDays.forEach(d => {
      if (d >= 0 && d < 7) boolDays[d] = true
    })

    const mappedRole =
      data.role === 'personal' ? 'professor' : data.role || 'comum'
    // Cadastro público sempre inicia como 'free'; plano pago é ativado via PaymentScreen (/payment/subscribe)
    const mappedSubscription = 'free'

    const payload = {
      email: data.email,
      password: data.password,
      confirmPassword: data.password,
      name: data.name,
      birthYear: data.birthYear || '1990-01-01',
      heightCm: Number(data.heightCm) || 170,
      weightKg: Number(data.weightKg) || 70,
      desiredWeightKg: data.desiredWeightKg
        ? Number(data.desiredWeightKg)
        : null,
      gender: data.gender || 'outro',
      fitnessGoal: 'condicionamento_fisico',
      experienceLevel: data.experienceLevel || 'iniciante',
      activityLevel: 'moderado',
      role: mappedRole,
      subscriptionType: mappedSubscription,
      hydrationReminder: data.hydrationReminder,
      hydrationTime: data.hydrationTime || null,
      modalities: data.modalities,
      workoutDays: data.workoutDays,
      workoutTime: data.workoutTime,
      workoutSchedule: {
        days: boolDays,
        time: data.workoutTime,
      },
    }

    const res = await fetchWithApiFallback('/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const json = await res.json().catch(() => ({}))

    return { res, json }
  }

  return { register }
}
