import type { questions, UserRole } from "./db/schema.js";


export type AuthUser = {
  id: number;
  role: UserRole;
};

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}


export type Question = {
    id: number,
    quizId: number,
    questionText: string,
    options: Option[]
    correctOption:number
}

export type QuestionDB = typeof questions.$inferSelect; //removing options for the scoreanswer func

export type Option = {
    id: number,
    questionId: number,
    text: string
}
