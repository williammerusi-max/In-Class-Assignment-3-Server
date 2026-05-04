import { Router } from "express";
import {
  addQuestion,
  assignQuiz,
  createQuiz,
  deleteQuestion,
  deleteQuiz,
  getMyAssignedQuizzes,
  getMyAttempts,
  getQuiz,
  getQuizzes,
  getQuizScores,
  submitAttempt,
  updateQuestion,
  updateQuiz
} from "../controllers/quiz.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";

export const quizRouter = Router();

quizRouter.use(requireAuth);

quizRouter.get("/quizzes", getQuizzes);
quizRouter.get("/quizzes/:id", getQuiz);

quizRouter.post("/quizzes", requireRole("TEACHER"), createQuiz);
quizRouter.put("/quizzes/:id", requireRole("TEACHER"), updateQuiz);
quizRouter.delete("/quizzes/:id", requireRole("TEACHER"), deleteQuiz);

quizRouter.post("/quizzes/:quizId/questions", requireRole("TEACHER"), addQuestion);
quizRouter.put("/questions/:id", requireRole("TEACHER"), updateQuestion);
quizRouter.delete("/questions/:id", requireRole("TEACHER"), deleteQuestion);

quizRouter.post("/assignments", requireRole("TEACHER"), assignQuiz);
quizRouter.get("/quizzes/:quizId/scores", requireRole("TEACHER"), getQuizScores);

quizRouter.get("/students/me/quizzes", requireRole("STUDENT"), getMyAssignedQuizzes);
quizRouter.post("/quizzes/:quizId/attempts", requireRole("STUDENT"), submitAttempt);
quizRouter.get("/students/me/attempts", requireRole("STUDENT"), getMyAttempts);
