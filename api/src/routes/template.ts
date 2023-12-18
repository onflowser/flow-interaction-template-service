import express, { Request, Response, Router } from "express";
import { TemplateService } from "../services/template";
import { genHash } from "../utils/gen-hash";
import { mixpanelTrack } from "../utils/mixpanel";
import { parseCadence } from "../utils/parse-cadence";
import {AuditService} from "../services/audit";

function templateRouter(
  templateService: TemplateService,
  auditService: AuditService,
  namesJSONFile: JSON
): Router {
  const router = express.Router();

  router.get("/templates", async (req: Request, res: Response) => {
    const name = req.query.name as string | undefined;

    if (!name) {
      const allTemplates = await templateService.getAllTemplates();

      return res.send(allTemplates)
    }

    let templateId: string = "";
    let _name: string = name;
    while (_name !== undefined) {
      let foundName = namesJSONFile[_name];
      if (foundName !== undefined) templateId = foundName;
      _name = foundName;
    }

    const template = await templateService.getTemplate(templateId);

    if (!template) {
      mixpanelTrack("get_template_by_name", {
        name,
        templateId,
        status: 204,
      });

      res.status(204);
      return res.send(
        `GET /templates/:template_id -- Did not find template for template_id=${templateId}`
      );
    }

    mixpanelTrack("get_template_by_name", {
      name,
      templateId,
      status: 200,
    });

    return res.send(template);
  });

  router.get("/templates/manifest", async (req: Request, res: Response) => {
    const templateManifest = await templateService.getTemplateManifest();

    if (!templateManifest) {
      mixpanelTrack("get_template_manifest", {
        status: 204,
      });

      res.status(204);
      return res.send(
        `GET /templates/manifest -- Did not find template manifest`
      );
    }

    mixpanelTrack("get_template_manifest", {
      status: 200,
    });

    return res.send(templateManifest);
  });

  router.get("/templates/:template_id", async (req: Request, res: Response) => {
    const templateId = req.params.template_id;

    const template = await templateService.getTemplate(templateId);

    if (!template) {
      mixpanelTrack("get_template", {
        templateId,
        status: 204,
      });

      res.status(204);
      return res.send(
        `GET /templates/:template_id -- Did not find template for template_id=${templateId}`
      );
    }

    mixpanelTrack("get_template", {
      templateId,
      status: 200,
    });

    return res.send(template);
  });

  router.get("/templates/:template_id/auditors", async (req: Request, res: Response) => {
    const templateId = req.params.template_id;
    const network = req.query.network as string;

    if (!network) {
      res.status(400);
      return res.send(
          "GET /templates/:template_id/auditors -- 'network' in request body not found"
      );
    }

    const auditors = await auditService.getAuditorsByNetwork(network);

    if (auditors === undefined) {
      mixpanelTrack("get_auditors_by_template", {
        network,
        status: 400,
      });

      res.status(400);
      return res.send(
          "GET /templates/:template_id/auditors -- 'network' in request parameters not supported"
      );
    }

    const audits = await auditService.getAuditorsByTemplateId(templateId, network);

    mixpanelTrack("get_auditors_by_template", {
      templateId,
      status: 200,
    });

    return res.send(audits);
  });

  router.post("/templates/search", async (req: Request, res: Response) => {
    const cadence_base64 = req.body.cadence_base64 as string;
    const network = req.body.network as string;

    if (!cadence_base64) {
      res.status(400);
      return res.send(
        "POST /templates/search -- 'cadenceBase64' in request body not found"
      );
    }

    if (!network) {
      res.status(400);
      return res.send(
        "POST /templates/search -- 'network' in request body not found"
      );
    }

    let cadence = Buffer.from(cadence_base64, "base64").toString("utf8");
    let cadenceAST = await parseCadence(cadence);

    let template;
    try {
      template = await templateService.getTemplateByCadenceASTHash(
        await genHash(cadenceAST),
        network
      );
    } catch (e) {
      mixpanelTrack("search_template", {
        cadence_ast_hash: await genHash(cadenceAST),
        network,
        status: 400,
      });

      res.status(400);
      return res.send("GET /templates -- Error occured when getting template");
    }

    if (!template) {
      mixpanelTrack("search_template", {
        cadence_ast_hash: await genHash(cadenceAST),
        network,
        status: 204,
      });
      res.status(204);
      return res.send(
        `GET /templates -- Did not find template for network=${network} cadence=${cadence_base64}`
      );
    }

    mixpanelTrack("search_template", {
      cadence_ast_hash: await genHash(cadenceAST),
      network,
      found_template_id: template.id,
      status: 200,
    });

    return res.send(template);
  });

  return router;
}

export default templateRouter;
