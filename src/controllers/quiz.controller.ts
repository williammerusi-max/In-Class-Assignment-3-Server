import type { RequestHandler } from "express";
import { and, eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { user, options, questions, quizAssignments, quizHistory, quizzes} from "../db/schema.js";
import type { QuestionDB, Option } from "../types.js";
import { assignmentSchema, createQuestionSchema, quizSchema, submitAttemptSchema } from "../validators/quiz.validators.js";
import { AppError } from "../utils/app-error.js";

const getIdParam = (value: string | string[] | undefined, label: string): number => {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new AppError(`Invalid ${label}`, 400);
  return id;
};

const getUserId = (req: Parameters<RequestHandler>[0]): number => {
  if (!req.user) throw new AppError("Authentication required", 401);
  return req.user.id;
};

//helper function more or less
const getQuestionOptions = async (questionId: number): Promise<Option[]> => {
  return db.select().from(options).where(eq(options.questionId, questionId)).orderBy(options.id);
};

const scoreAnswer = async (question: QuestionDB, answer: { selectedOptionId?: number;}): Promise<boolean> => {
  if (!answer.selectedOptionId) return false;

  const allOptions = await getQuestionOptions(question.id)
  // Find the correct option based on the index stored in the question

 // const correctOption = getQuestionOptions(question.correctOption);
  const correctOption = allOptions[question.correctOption]
  //  Compare the ID of the correct record to the ID the student selected
  
  if (!correctOption) return false;

  return correctOption.id === answer.selectedOptionId; //maybe this will work?
 
  
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
    await db.update(quizzes).set({ ...data}).where(eq(quizzes.id, quizId));
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
    if (data.correctOption === undefined) {
    throw new AppError("You must select a correct answer", 400);
    }
    const inserted = await db.insert(questions).values({
      quizId,
      questionText: data.questionText,
      correctOption: data.correctOption,
    }).$returningId();
    const questionId = inserted[0]?.id;
    if (!questionId) throw new AppError("Could not create question", 500);

      await db.insert(options).values(data.Options.map((option) => ({
        questionId,
        text: option.text,
      })));

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
      correctOption: data.correctOption,
    }).where(eq(questions.id, questionId));

    await db.delete(options).where(eq(options.questionId, questionId));
    await db.insert(options).values(data.Options.map((option) => ({ questionId, text: option.text, })));
  

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
    const studentRows = await db.select().from(user).where(eq(user.id, data.studentId)).limit(1);
    if (!studentRows[0] || studentRows[0].role !== "student") throw new AppError("Student not found", 404);
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
    const rows = await db.select({ attempt: quizHistory, student: user }).from(quizHistory)
      .innerJoin(user, eq(quizHistory.studentId, user.id))
      .where(eq(quizHistory.quizId, quizId));
    res.json(rows);
  } catch (error) {
    next(error);
  }
};
