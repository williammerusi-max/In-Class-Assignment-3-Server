import type { RequestHandler } from "express";
import { and, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { accounts, options, questions, quizAssignments, quizHistory, quizzes, studentAnswers, type Question, type AnswerOption } from "../db/schema.js";
import { assignmentSchema, createQuestionSchema, quizSchema, submitAttemptSchema } from "../validators/quiz.validators.js";
import { AppError } from "../utils/app-error.js";

const getIdParam = (value: string | undefined, label: string): number => {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new AppError(`Invalid ${label}`, 400);
  return id;
};

const getUserId = (req: Parameters<RequestHandler>[0]): number => {
  if (!req.user) throw new AppError("Authentication required", 401);
  return req.user.id;
};

const getQuestionOptions = async (questionId: number): Promise<AnswerOption[]> => {
  return db.select().from(options).where(eq(options.questionId, questionId));
};

const scoreAnswer = async (question: Question, answer: { selectedOptionId?: number; answerText?: string }): Promise<boolean> => {
  if (question.questionType === "MULTIPLE_CHOICE") {
    if (!answer.selectedOptionId) return false;
    const selected = await db.select().from(options).where(eq(options.id, answer.selectedOptionId)).limit(1);
    return selected[0]?.questionId === question.id && selected[0].isCorrect;
  }
  return answer.answerText?.trim().toLowerCase() === question.correctAnswer?.trim().toLowerCase();
};

export const getQuizzes: RequestHandler = async (_req, res, next) => {
  try {
    const rows = await db.select().from(quizzes);
    res.json(rows);
  } catch (error) {
    next(error);
  }
};

export const getQuiz: RequestHandler = async (req, res, next) => {
  try {
    const quizId = getIdParam(req.params.id, "quiz id");
    const quizRows = await db.select().from(quizzes).where(eq(quizzes.id, quizId)).limit(1);
    const quiz = quizRows[0];
    if (!quiz) throw new AppError("Quiz not found", 404);

    const questionRows = await db.select().from(questions).where(eq(questions.quizId, quizId));
    const questionsWithOptions = await Promise.all(questionRows.map(async (question) => ({
      ...question,
      options: await getQuestionOptions(question.id)
    })));

    res.json({ ...quiz, questions: questionsWithOptions });
  } catch (error) {
    next(error);
  }
};

export const createQuiz: RequestHandler = async (req, res, next) => {
  try {
    const data = quizSchema.parse(req.body);
    const inserted = await db.insert(quizzes).values(data).$returningId();
    const id = inserted[0]?.id;
    if (!id) throw new AppError("Could not create quiz", 500);
    res.status(201).json({ id, ...data });
  } catch (error) {
    next(error);
  }
};

export const updateQuiz: RequestHandler = async (req, res, next) => {
  try {
    const quizId = getIdParam(req.params.id, "quiz id");
    const data = quizSchema.parse(req.body);
    await db.update(quizzes).set({ ...data, updatedAt: new Date() }).where(eq(quizzes.id, quizId));
    res.json({ id: quizId, ...data });
  } catch (error) {
    next(error);
  }
};

export const deleteQuiz: RequestHandler = async (req, res, next) => {
  try {
    await db.delete(quizzes).where(eq(quizzes.id, getIdParam(req.params.id, "quiz id")));
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const addQuestion: RequestHandler = async (req, res, next) => {
  try {
    const quizId = getIdParam(req.params.quizId, "quiz id");
    const data = createQuestionSchema.parse(req.body);
    const inserted = await db.insert(questions).values({
      quizId,
      questionText: data.questionText,
      questionType: data.questionType,
      correctAnswer: data.questionType === "SHORT_ANSWER" ? data.correctAnswer : null
    }).$returningId();
    const questionId = inserted[0]?.id;
    if (!questionId) throw new AppError("Could not create question", 500);

    if (data.questionType === "MULTIPLE_CHOICE") {
      await db.insert(options).values(data.answerOptions.map((option) => ({
        questionId,
        text: option.text,
        isCorrect: option.isCorrect
      })));
    }

    res.status(201).json({ id: questionId, ...data, quizId });
  } catch (error) {
    next(error);
  }
};

export const updateQuestion: RequestHandler = async (req, res, next) => {
  try {
    const questionId = getIdParam(req.params.id, "question id");
    const data = createQuestionSchema.parse(req.body);
    await db.update(questions).set({
      questionText: data.questionText,
      questionType: data.questionType,
      correctAnswer: data.questionType === "SHORT_ANSWER" ? data.correctAnswer : null,
      correctOption: null
    }).where(eq(questions.id, questionId));

    await db.delete(options).where(eq(options.questionId, questionId));
    if (data.questionType === "MULTIPLE_CHOICE") {
      await db.insert(options).values(data.answerOptions.map((option) => ({ questionId, text: option.text, isCorrect: option.isCorrect })));
    }

    res.json({ id: questionId, ...data });
  } catch (error) {
    next(error);
  }
};

export const deleteQuestion: RequestHandler = async (req, res, next) => {
  try {
    await db.delete(questions).where(eq(questions.id, getIdParam(req.params.id, "question id")));
    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

export const assignQuiz: RequestHandler = async (req, res, next) => {
  try {
    const data = assignmentSchema.parse(req.body);
    const studentRows = await db.select().from(accounts).where(eq(accounts.id, data.studentId)).limit(1);
    if (!studentRows[0] || studentRows[0].isTeacher) throw new AppError("Student not found", 404);
    await db.insert(quizAssignments).values(data);
    res.status(201).json(data);
  } catch (error) {
    next(error);
  }
};

export const getMyAssignedQuizzes: RequestHandler = async (req, res, next) => {
  try {
    const studentId = getUserId(req);
    const rows = await db.select({ quiz: quizzes }).from(quizAssignments)
      .innerJoin(quizzes, eq(quizAssignments.quizId, quizzes.id))
      .where(eq(quizAssignments.studentId, studentId));
    res.json(rows.map((row) => row.quiz));
  } catch (error) {
    next(error);
  }
};

export const submitAttempt: RequestHandler = async (req, res, next) => {
  try {
    const studentId = getUserId(req);
    const quizId = getIdParam(req.params.quizId, "quiz id");
    const data = submitAttemptSchema.parse(req.body);

    const assignmentRows = await db.select().from(quizAssignments)
      .where(and(eq(quizAssignments.quizId, quizId), eq(quizAssignments.studentId, studentId))).limit(1);
    if (!assignmentRows[0]) throw new AppError("Quiz is not assigned to this student", 403);

    const quizQuestions = await db.select().from(questions).where(eq(questions.quizId, quizId));
    let score = 0;
    const gradedAnswers = await Promise.all(data.answers.map(async (answer) => {
      const question = quizQuestions.find((item) => item.id === answer.questionId);
      if (!question) throw new AppError("Answer contains a question that does not belong to this quiz", 400);
      const isCorrect = await scoreAnswer(question, answer);
      if (isCorrect) score += 1;
      return { ...answer, isCorrect };
    }));

    const inserted = await db.insert(quizHistory).values({ quizId, studentId, score, totalQuestions: quizQuestions.length }).$returningId();
    const attemptId = inserted[0]?.id;
    if (!attemptId) throw new AppError("Could not save quiz attempt", 500);

    await db.insert(studentAnswers).values(gradedAnswers.map((answer) => ({
      attemptId,
      questionId: answer.questionId,
      selectedOptionId: answer.selectedOptionId ?? null,
      answerText: answer.answerText ?? null,
      isCorrect: answer.isCorrect
    })));

    res.status(201).json({ attemptId, score, totalQuestions: quizQuestions.length });
  } catch (error) {
    next(error);
  }
};

export const getMyAttempts: RequestHandler = async (req, res, next) => {
  try {
    const studentId = getUserId(req);
    const rows = await db.select().from(quizHistory).where(eq(quizHistory.studentId, studentId));
    res.json(rows);
  } catch (error) {
    next(error);
  }
};

export const getQuizScores: RequestHandler = async (req, res, next) => {
  try {
    const quizId = getIdParam(req.params.quizId, "quiz id");
    const rows = await db.select({ attempt: quizHistory, student: accounts }).from(quizHistory)
      .innerJoin(accounts, eq(quizHistory.studentId, accounts.id))
      .where(eq(quizHistory.quizId, quizId));
    res.json(rows);
  } catch (error) {
    next(error);
  }
};
