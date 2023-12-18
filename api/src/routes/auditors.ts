import express, { Request, Response, Router } from "express";
import { mixpanelTrack } from "../utils/mixpanel";
import {AuditService} from "../services/audit";

function auditorsRouter(auditService: AuditService): Router {
  const router = express.Router();

  router.get("/auditors", async (req: Request, res: Response) => {
    const network = req.query.network as string;

    if (!network) {
      mixpanelTrack("get_auditors", {
        network,
        status: 400,
      });

      res.status(400);
      return res.send(
        "GET /auditors -- 'network' in request parameters not found"
      );
    }

    const auditors = await auditService.getAuditorsByNetwork(network);

    if (auditors === undefined) {
      mixpanelTrack("get_auditors", {
        network,
        status: 400,
      });

      res.status(400);
      return res.send(
        "GET /auditors -- 'network' in request parameters not supported"
      );
    }

    mixpanelTrack("get_auditors", {
      network,
      status: 200,
    });

    return res.send(auditors);
  });

  router.get("/auditors/:address/audits", async (req: Request, res: Response) => {
    const network = req.query.network as string;

    if (!network) {
      mixpanelTrack("get_auditor_audits", {
        network,
        status: 400,
      });

      res.status(400);
      return res.send(
          "GET /auditors/:address/audits -- 'network' in request parameters not found"
      );
    }

    const auditors = await auditService.getAuditorsByNetwork(network);

    if (auditors === undefined) {
      mixpanelTrack("get_auditor_audits", {
        network,
        status: 400,
      });

      res.status(400);
      return res.send(
          "GET /auditors/:address/audits -- 'network' in request parameters not supported"
      );
    }

    mixpanelTrack("get_auditor_audits", {
      network,
      status: 200,
    });

    const audits = await auditService.getAuditedTemplateIdsByAuditor(req.params.address, network);

    return res.send(audits);
  });

  return router;
}

export default auditorsRouter;
