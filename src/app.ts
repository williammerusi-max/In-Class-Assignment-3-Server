import "dotenv/config";
import cors from "cors";
import express from "express";
import { authRouter } from "./routes/auth.routes.js";
import { quizRouter } from "./routes/quiz.routes.js";
import { errorMiddleware } from "./middleware/error.middleware.js";
import { notFoundMiddleware } from "./middleware/not-found.middleware.js";
import { requestLogger } from "./middleware/request-logger.middleware.js";

export const app = express();

app.use(cors());
app.use(express.json());
app.use(requestLogger);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRouter);
app.use("/api", quizRouter);

app.use(notFoundMiddleware);
app.use(errorMiddleware);
