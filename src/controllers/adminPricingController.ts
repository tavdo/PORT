import type { Request, Response, NextFunction } from "express";
import {
  listPricingConfig,
  upsertPricingConfig,
  deletePricingKey,
  PRICING_EXTRA_KEYS,
} from "../services/pricingConfigService";
import { logAudit } from "../services/auditService";

export async function getAdminPricing(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rows = await listPricingConfig();
    res.json({
      entries: rows,
      extraKeys: [...PRICING_EXTRA_KEYS],
      hint: "Keys match batumi-tanker.json fields (e.g. berthPerGrtUsd) plus optional cargoPerTnUsd, lengthAdjustmentPerMUsd, customFlatFeeUsd.",
    });
  } catch (err) {
    next(err);
  }
}

export async function putAdminPricing(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const values = req.body?.values as Record<string, number> | undefined;
    if (!values || typeof values !== "object") {
      res.status(400).json({ error: "values object required" });
      return;
    }
    await upsertPricingConfig(values);
    logAudit(req.userId!, "pricing_updated", "pricing_config", null, { keys: Object.keys(values) });
    res.json({ ok: true, keys: Object.keys(values) });
  } catch (err) {
    next(err);
  }
}

export async function deleteAdminPricingKey(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const key = req.params.key;
    if (!key) {
      res.status(400).json({ error: "key required" });
      return;
    }
    const ok = await deletePricingKey(key);
    if (!ok) {
      res.status(404).json({ error: "Key not found" });
      return;
    }
    logAudit(req.userId!, "pricing_key_deleted", "pricing_config", null, { key });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
}
