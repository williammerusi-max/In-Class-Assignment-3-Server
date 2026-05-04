import { app } from "./app.js";
import { logger } from "./utils/logger.js";

const port = Number(process.env.PORT ?? 3000);

app.listen(port, () => {
  logger.info("Server started", { port });
});
