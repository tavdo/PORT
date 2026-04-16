import { Router } from "express";
import {
  postCalculate,
  postFda,
  getPdf,
  postPdf,
  getExportXlsx,
} from "../controllers/disbursementController";
import { postRegister, postLogin, getMe } from "../controllers/authController";
import { requireAuth, requireRole } from "../middleware/authMiddleware";
import { postCreateRequest, getMyRequests, getOneRequest } from "../controllers/portRequestController";
import { getAdminRequests, patchAdminRequest } from "../controllers/adminPortRequestController";
import { getAdminPricing, putAdminPricing, deleteAdminPricingKey } from "../controllers/adminPricingController";
import { getAdminAudit } from "../controllers/adminAuditController";

const router = Router();

router.post("/calculate", postCalculate);
router.post("/fda", postFda);
router.post("/pdf", postPdf);
router.get("/pdf/:imo", getPdf);
router.get("/export/xlsx/:imo", getExportXlsx);

router.post("/auth/register", postRegister);
router.post("/auth/login", postLogin);
router.get("/auth/me", requireAuth, getMe);

router.post("/port-requests", requireAuth, requireRole("captain"), postCreateRequest);
router.get("/port-requests", requireAuth, requireRole("captain"), getMyRequests);
router.get("/port-requests/:id", requireAuth, getOneRequest);

router.get("/admin/requests", requireAuth, requireRole("admin"), getAdminRequests);
router.patch("/admin/requests/:id", requireAuth, requireRole("admin"), patchAdminRequest);

router.get("/admin/pricing", requireAuth, requireRole("admin"), getAdminPricing);
router.put("/admin/pricing", requireAuth, requireRole("admin"), putAdminPricing);
router.delete("/admin/pricing/:key", requireAuth, requireRole("admin"), deleteAdminPricingKey);

router.get("/admin/audit", requireAuth, requireRole("admin"), getAdminAudit);

export { router as apiRouter };
