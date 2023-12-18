import { json, urlencoded } from "body-parser";
import cors from "cors";
import express, { Request, Response } from "express";
import "express-async-errors";
import templateRouter from "./routes/template";
import auditorsRouter from "./routes/auditors";
import { TemplateService } from "./services/template";
import {AuditService} from "./services/audit";

const V1 = "/v1/";

const corsOptions = {
  origin: "*",
  credentials: true,
  optionSuccessStatus: 200,
};

// Init all routes, setup middlewares and dependencies
const initApp = (
  templateService: TemplateService,
  auditService: AuditService,
  namesJSONFile: JSON
) => {
  const app = express();

  app.use(cors(corsOptions));
  app.use(json());
  app.use(urlencoded({ extended: false }));
  app.use(V1, templateRouter(templateService, auditService, namesJSONFile));
  app.use(V1, auditorsRouter(auditService));

  app.all("*", async (req: Request, res: Response) => {
    return res.sendStatus(404);
  });

  return app;
};

export default initApp;
