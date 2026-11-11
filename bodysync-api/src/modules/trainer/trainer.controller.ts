// bodysync-api/src/modules/trainer/trainer.controller.ts
import { Request, Response, NextFunction } from 'express'
import { trainerService } from './trainer.service'

export const trainerController = {
  async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await trainerService.getOrCreateProfile(req.userId!)
      res.json(data)
    } catch (err) {
      next(err)
    }
  },

  async listStudents(req: Request, res: Response, next: NextFunction) {
    try {
      const students = await trainerService.listStudents(req.userId!)
      res.json({ students })
    } catch (err) {
      next(err)
    }
  },

  async getStudentDetail(req: Request, res: Response, next: NextFunction) {
    try {
      const studentId = Array.isArray(req.params.studentId)
        ? req.params.studentId[0]
        : req.params.studentId
      const detail = await trainerService.getStudentDetail(req.userId!, studentId)
      res.json(detail)
    } catch (err) {
      next(err)
    }
  },

  async prescribeWorkout(req: Request, res: Response, next: NextFunction) {
    try {
      const plan = await trainerService.prescribeWorkout(req.userId!, req.body)
      res.status(201).json({ plan, message: 'Treino prescrito com sucesso!' })
    } catch (err) {
      next(err)
    }
  },

  async getAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      const analytics = await trainerService.getAnalytics(req.userId!)
      res.json(analytics)
    } catch (err) {
      next(err)
    }
  },

  async lookupCode(req: Request, res: Response, next: NextFunction) {
    try {
      const code = Array.isArray(req.params.code) ? req.params.code[0] : req.params.code
      const trainer = await trainerService.lookupTrainerByCode(req.userId!, code)
      res.json(trainer)
    } catch (err) {
      next(err)
    }
  },

  async getMyTrainer(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await trainerService.getMyTrainer(req.userId!)
      res.json(data)
    } catch (err) {
      next(err)
    }
  },

  async connect(req: Request, res: Response, next: NextFunction) {
    try {
      const { inviteCode } = req.body
      const result = await trainerService.connectStudent(req.userId!, inviteCode)
      res.json(result)
    } catch (err) {
      next(err)
    }
  },

  async disconnect(req: Request, res: Response, next: NextFunction) {
    try {
      const targetId = Array.isArray(req.params.studentId)
        ? req.params.studentId[0]
        : req.params.studentId
      const result = await trainerService.disconnect(req.userId!, targetId)
      res.json(result)
    } catch (err) {
      next(err)
    }
  },
}
