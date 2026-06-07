import { useApi } from './useApi';
import { RegisterData } from '../screens/Registration/RegisterContext';

export const useRegisterApi = () => {
  const { request } = useApi();

  const register = async (data: RegisterData) => {
    const payload = {
      email: data.email,
      password: data.password,
      name: data.name,
      heightCm: Number(data.heightCm),
      birthDate: Number(data.birthYear),
      weightKg: Number(data.weightKg),
      gender: data.gender,
      fitnessGoal: data.experienceLevel,
      subscriptionType: data.subscriptionType,
      desiredWeightKg: Number(data.desiredWeightKg),
      hydrationReminder: data.hydrationReminder,
      desiredModality: data.modalities[0] || "",
      workoutSchedule: {
        days: (() => {
          const boolDays = Array(7).fill(false);
          data.workoutDays.forEach((d) => {
            if (d >= 0 && d < 7) boolDays[d] = true;
          });
          return boolDays;
        })(),
        time: data.workoutTime,
      },
    };
    const res = await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return { res, json: await res.json() };
  };

  return { register };
};
