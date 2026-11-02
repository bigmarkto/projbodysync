import { useApi } from './useApi'
import { RegisterData } from '../screens/Registration/RegisterContext'

export const useRegisterApi = () => {
  const { request } = useApi()

  const register = async (data: RegisterData) => {
    const boolDays = Array(7).fill(false)
    data.workoutDays.forEach(d => {
      if (d >= 0 && d < 7) boolDays[d] = true
    })

    const mappedRole =
      data.role === 'personal' ? 'professor' : data.role || 'comum'
    const validSubscriptions = ['free', 'basic', 'premium']
    const mappedSubscription = validSubscriptions.includes(data.subscriptionType)
      ? data.subscriptionType
      : 'premium'

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

    const res = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    })

    const json = await res.json()

    return { res, json }
  }

  return { register }
}
