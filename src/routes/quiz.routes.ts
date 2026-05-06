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
 
  submitAttempt,
  updateQuestion,
  updateQuiz,
  getStudents,
  getAllQuizScores
} from "../controllers/quiz.controller.js";
import { requireAuth, requireRole } from "../middleware/auth.middleware.js";

export const quizRouter = Router();

quizRouter.use(requireAuth);

quizRouter.get("/quizzes", getQuizzes);
quizRouter.get("/quizzes/scores", requireRole("teacher"), getAllQuizScores);
quizRouter.get("/quizzes/:id", getQuiz);

quizRouter.post("/quizzes", requireRole("teacher"), createQuiz);
quizRouter.put("/quizzes/:id", requireRole("teacher"), updateQuiz);
quizRouter.delete("/quizzes/:id", requireRole("teacher"), deleteQuiz);

quizRouter.post("/quizzes/:quizId/questions", requireRole("teacher"), addQuestion);
quizRouter.put("/questions/:id", requireRole("teacher"), updateQuestion);
quizRouter.delete("/questions/:id", requireRole("teacher"), deleteQuestion);

quizRouter.post("/assignments", requireRole("teacher"), assignQuiz);

//quizRouter.get("/quizzes/:quizId/scores", requireRole("teacher"), getQuizScores);



quizRouter.get("/students/me/quizzes", requireRole("student"), getMyAssignedQuizzes);
quizRouter.post("/quizzes/:quizId/attempts", requireRole("student"), submitAttempt);
quizRouter.get("/students/me/attempts", requireRole("student"), getMyAttempts);

quizRouter.get("/students", requireRole("teacher"), getStudents);