# Quiz System Server

Backend-only quiz system for In-class Assignment 3.

This version uses **Drizzle ORM**, not Prisma.

## Tech Used

- Node.js
- Express
- TypeScript strict mode
- Drizzle ORM
- MySQL
- Drizzle migrations
- Winston logging
- Zod validation
- JWT authentication
- bcrypt password hashing
- Central error middleware

## Setup

```bash
npm install
cp .env.example .env
npm run db:migrate
npm run db:seed
npm run dev
```

Default seeded users:

```txt
Teacher: teacher / password123
Student: student / password123
```

## Scripts

```bash
npm run dev          # start development server
npm run build        # compile TypeScript
npm run lint         # strict TypeScript check
npm run db:generate  # generate Drizzle migration files from schema
npm run db:migrate   # run migrations
npm run db:seed      # seed demo accounts and quiz data
```

## API Routes

### Auth

```txt
POST /api/auth/register
POST /api/auth/login
```

### Teacher

```txt
GET    /api/quizzes
GET    /api/quizzes/:id
POST   /api/quizzes
PUT    /api/quizzes/:id
DELETE /api/quizzes/:id
POST   /api/quizzes/:quizId/questions
PUT    /api/questions/:id
DELETE /api/questions/:id
POST   /api/assignments
GET    /api/quizzes/:quizId/scores
```

### Student

```txt
GET  /api/students/me/quizzes
POST /api/quizzes/:quizId/attempts
GET  /api/students/me/attempts
```

## Assignment Notes

This project incorporates the provided MySQL table names:

- `accounts`
- `quizzes`
- `questions`
- `options`
- `quiz_assignments`
- `quiz_history`

It also adds `student_answers` so every quiz attempt can store answers per question.

The original SQL dump is not imported directly because the assignment says **no raw SQL**. Instead, the database is represented as a Drizzle ORM schema in `src/db/schema.ts`, and migrations are managed through Drizzle.

## Multiple Choice Rules

The backend validates that every multiple-choice question has:

- exactly 4 answer options
- exactly 1 correct answer

## Strict TypeScript

The project has strict TypeScript enabled and does not use `any`.
