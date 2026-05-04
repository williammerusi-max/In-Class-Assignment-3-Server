import "dotenv/config";
import bcrypt from "bcrypt";
import { db, pool } from "../src/db/index.js";
import { accounts, options, questions, quizAssignments, quizzes } from "../src/db/schema.js";

const main = async (): Promise<void> => {
  const password = await bcrypt.hash("password123", 10);

  const teacherRows = await db.insert(accounts).values({
    username: "teacher",
    password,
    isTeacher: true
  }).$returningId();

  const studentRows = await db.insert(accounts).values({
    username: "student",
    password,
    isTeacher: false
  }).$returningId();

  const quizRows = await db.insert(quizzes).values({
    title: "Web Dev Quiz",
    description: "Seeded quiz for testing the backend."
  }).$returningId();

  const quizId = quizRows[0]?.id;
  const studentId = studentRows[0]?.id;

  if (!quizId || !studentId || !teacherRows[0]?.id) {
    throw new Error("Seed failed because inserted IDs were not returned.");
  }

  const mcRows = await db.insert(questions).values({
    quizId,
    questionText: "Which language adds interactivity to websites?",
    questionType: "MULTIPLE_CHOICE"
  }).$returningId();

  const shortRows = await db.insert(questions).values({
    quizId,
    questionText: "What does CSS stand for?",
    questionType: "SHORT_ANSWER",
    correctAnswer: "Cascading Style Sheets"
  }).$returningId();

  const mcQuestionId = mcRows[0]?.id;
  const shortQuestionId = shortRows[0]?.id;

  if (!mcQuestionId || !shortQuestionId) {
    throw new Error("Seed failed because question IDs were not returned.");
  }

  await db.insert(options).values([
    { questionId: mcQuestionId, text: "HTML", isCorrect: false },
    { questionId: mcQuestionId, text: "CSS", isCorrect: false },
    { questionId: mcQuestionId, text: "JavaScript", isCorrect: true },
    { questionId: mcQuestionId, text: "SQL", isCorrect: false }
  ]);

  await db.insert(quizAssignments).values({ quizId, studentId });

  await pool.end();
};

main().catch(async (error: unknown) => {
  await pool.end();
  throw error;
});
