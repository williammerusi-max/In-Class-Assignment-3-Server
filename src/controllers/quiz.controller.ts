import type { RequestHandler } from "express";
import { and, count, eq } from "drizzle-orm";
import { db, pool } from "../db/index.js";
import { user, options, questions, quizAssignments, quizHistory, quizzes} from "../db/schema.js";
import type { QuestionDB, Option, User } from "../types.js";
import { assignmentSchema, createQuestionSchema, quizSchema, submitAttemptSchema } from "../validators/quiz.validators.js";
import { AppError } from "../utils/app-error.js";
import type { RowDataPacket } from "mysql2";
import { join } from "path";
import { logger } from "../utils/logger.js";

//functions that I need 
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

const scoreAnswer = async (question: QuestionDB, answer: { selectedOptionId?: number | undefined;}): Promise<boolean> => {
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
    res.json({data : rows});
  } catch (error) {
    next(error);
  }
};

/*export const getQuiz: RequestHandler = async (req, res, next) => {
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
};*/

//going to try this one
export const getQuiz: RequestHandler = async (req, res, next) => {
  try {
    const quizId = getIdParam(req.params.id, "quiz id");
    const quizRows = await db.select().from(quizzes).where(eq(quizzes.id, quizId)).limit(1);
    const quiz = quizRows[0];
    
    if (!quiz) return next(new AppError("Quiz not found", 404));

    // Fetch Questions
    const questionRows = await db.select().from(questions).where(eq(questions.quizId, quizId));
    const questionsWithOptions = await Promise.all(questionRows.map(async (q) => ({
      ...q,
      options: await getQuestionOptions(q.id)
    })));

    // Fetch Assignments (Missing in your current code)
    const assignmentRows = await db.select({ studentId: quizAssignments.studentId })
      .from(quizAssignments)
      .where(eq(quizAssignments.quizId, quizId));
    
    const assignedId = assignmentRows.map(a => a.studentId);

    // Send wrapped response
    res.json({ 
      data: { 
        ...quiz, 
        questions: questionsWithOptions,
        assignedId: assignedId // Add this so the frontend doesn't crash
      } 
    });
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

/*export const updateQuiz: RequestHandler = async (req, res, next) => {
  try {
    const quizId = getIdParam(req.params.id, "quiz id");
    const data = quizSchema.parse(req.body);
    await db.update(quizzes).set({ ...data}).where(eq(quizzes.id, quizId));
    res.json({ id: quizId, ...data });
  } catch (error) {
    next(error);
  }
};*/
// 1. Make sure you are importing the actual table objects, not just types

export const updateQuiz: RequestHandler = async (req, res, next) => {
  const quizId = getIdParam(req.params.id, "quiz id");
  const { title, description, questions: questionsData, assignedId } = req.body;

  try {
    await db.transaction(async (tx) => {
      // FIX 1: Ensure table name and column are passed correctly
      await tx.update(quizzes)
        .set({ title, description })
        .where(eq(quizzes.id, quizId));

      // FIX 2: Check your delete clauses
      // It must be eq(TABLE.COLUMN, VALUE)
      await tx.delete(questions)
        .where(eq(questions.quizId, quizId));

      // Re-inserting questions logic...
      for (const q of questionsData) {
        const [newQuestion] = await tx.insert(questions)
          .values({
            quizId,
            questionText: q.questionText,
            correctOption: q.correctOption,
          })
          .$returningId();

        // Ensure options are handled correctly
        if (q.options && q.options.length > 0) {
          await tx.insert(options).values(
            q.options.map((optText: string) => ({
              questionId: newQuestion!.id,
              text: optText
            }))
          );
        }
      }

      // FIX 3: Sync Assignments
      await tx.delete(quizAssignments)
        .where(eq(quizAssignments.quizId, quizId));

      if (assignedId && assignedId.length > 0) {
        await tx.insert(quizAssignments).values(
          assignedId.map((sId: number) => ({
            quizId,
            studentId: sId
          }))
        );
      }
    });

    res.json({ message: "Quiz updated successfully" });
  } catch (error) {
    console.error("Transaction Error:", error);
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
      .where(eq(quizAssignments.studentId, Number(studentId)));
    res.json({data: rows.map((row) => row.quiz)});
  } catch (error) {
    next(error);
  }
};


export const submitAttempt: RequestHandler = async (req, res, next) => {
  try {
    // 1. Get Student ID from Auth Middleware
    // Cast to any briefly only for the req.user property, or use a custom Request type
    const user = (req as any).user;
    const studentId = user.id;

    // 2. Validate Quiz ID from URL
    const quizId = getIdParam(req.params.quizId, "quiz id");

    // 3. Validate Request Body with Zod
    const data = submitAttemptSchema.parse(req.body);
    logger.info(`Student ${studentId} is submitting quiz ${quizId}`);
    // 4. Verify Assignment
    const assignments = await db
      .select()
      .from(quizAssignments)
      .where(
        and(
          eq(quizAssignments.quizId, quizId),
          eq(quizAssignments.studentId, studentId)
        )
      )
      .limit(1);

    if (assignments.length === 0) {
      logger.warn(`Unauthorized attempt: Student ${studentId} on Quiz ${quizId}`);
      throw new AppError("You are not assigned to this quiz", 403);
    }

    // 5. Calculate Attempt Number (Count + 1)
    const historyCount = await db
      .select({ value: count() })
      .from(quizHistory)
      .where(
        and(
          eq(quizHistory.quizId, quizId),
          eq(quizHistory.studentId, studentId)
        )
      );
    
    const nextAttempt = (historyCount[0]?.value ?? 0) + 1;

    // 6. Fetch Quiz Questions for Grading
    const quizQuestions = await db
      .select()
      .from(questions)
      .where(eq(questions.quizId, quizId));

    // 7. Calculate Final Score
    let finalScore = 0;
    for (const answer of data.answers) {
      const question = quizQuestions.find((q) => q.id === answer.questionId);
      if (question) {
        const isCorrect = await scoreAnswer(question, answer);
        if (isCorrect) finalScore++;
      }
    }

    // 8. Save Result to Database
    await db.insert(quizHistory).values({
      quizId,
      studentId,
      score: finalScore,
      attempts: nextAttempt,
    });

    logger.info(`Quiz saved: Student ${studentId}, Score ${finalScore}, Attempt ${nextAttempt}`);

    // 9. Response
    res.status(201).json({
      score: finalScore,
      totalQuestions: quizQuestions.length,
      attempt: nextAttempt
    });

  } catch (error) {
    // Passes all errors (Zod, AppError, DB errors) to your Error Middleware
    next(error);
  }
};

export const getMyAttempts: RequestHandler = async (req, res, next) => {
  try {
    const studentId = getUserId(req);
    //const rows = await db.select().from(quizHistory).where(eq(quizHistory.studentId, studentId));
    
    const rows = await db.select({id: quizHistory.id, quiz_id: quizHistory.quizId, title: quizzes.title, student_Id: quizHistory.studentId, username: user.username, score: quizHistory.score ,attempts: quizHistory.attempts, }).from(quizHistory)
      
      .innerJoin(quizzes, eq(quizHistory.quizId, quizzes.id))
      .innerJoin(user, eq(quizHistory.studentId, user.id))
      .where(eq(quizHistory.studentId, studentId));
    res.json({data: rows});
    console.log("BACKEND LOG:", rows[0]);
  } catch (error) {
    next(error);
  }
};


/*export const getQuizScores: RequestHandler = async (req, res, next) => {
  try {
    const quizId = getIdParam(req.params.quizId, "quiz id");
    //const studentId = getUserId(req)
    //const rows = await db.select({ attempt: quizHistory, student: user }).from(quizHistory)
 
    const rows = await db.select({id: quizHistory.id, quiz_id: quizHistory.quizId, title: quizzes.title, student_Id: quizHistory.studentId, username: user.username, score: quizHistory.score ,attempts: quizHistory.attempts, }).from(quizHistory)
      .innerJoin(quizzes, eq(quizHistory.quizId, quizzes.id))
      .innerJoin(user, eq(quizHistory.studentId, user.id))
      .where(eq(quizHistory.quizId, quizId));

    
    res.json({data: rows});
    console.log("BACKEND LOG:", rows[0]);
  } catch (error) {
    next(error);
  }
};/*



/**
 * The function getAllQuizScores retrieves quiz scores along with related information from the database
 * and sends the data as a JSON response.
 * @param req - The `req` parameter in the `getAllQuizScores` function is the request object
 * representing the HTTP request made to the server. It contains information about the request such as
 * the URL, headers, parameters, body, etc. This parameter is used to extract data sent from the client
 * to the server.
 * @param res - The `res` parameter in the code snippet refers to the response object in an Express.js
 * route handler. It is used to send a response back to the client making the request. In this case,
 * the `res.json({data: rows})` statement is sending a JSON response containing the data fetched
 * @param next - The `next` parameter in your code refers to a function that is passed to the
 * middleware function. It is used to pass control to the next middleware function in the stack. If an
 * error occurs during the execution of your `getAllQuizScores` function, you can call `next(error)` to
 * pass
 */
export const getAllQuizScores: RequestHandler = async (req, res, next) => {
  try {
    //const quizId = getIdParam(req.params.quizId, "quiz id");

    
    const rows = await db.select({id: quizHistory.id, quiz_id: quizHistory.quizId, title: quizzes.title, student_Id: quizHistory.studentId, username: user.username, score: quizHistory.score ,attempts: quizHistory.attempts, }).from(quizHistory)
    .innerJoin(quizzes, eq(quizHistory.quizId, quizzes.id))
    .innerJoin(user, eq(quizHistory.studentId, user.id))
    
    res.json({data: rows});
  } catch (error) {
    next(error);
  }
};

export const getStudents: RequestHandler = async (req, res, next) => {
  try {
    
    const rows = await db.select({ 
        id: user.id, 
        username: user.username 
      })
      .from(user)
      .where(eq(user.role, 'student')); // probably only want students 

    res.json({ data: rows });
  } catch (error) {
    next(error);
  }
}

/*export const getHistoryById = async(id: number) => {
  try{
    await db.select({
    title: quizzes.title,
    score: quizHistory.score,
    attempt: quizHistory.attempt
  })
  .from(quizHistory)
  .innerJoin(quizzes, eq(quizHistory.quizId, quizzes.id))
  .where(eq(quizHistory.studentId, id));
  }catch(error){
    next(error)
  }
};
*/