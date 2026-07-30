// Audit log helper — writes to public.activity_log with before/after diffs.
// Append-only; undo is done by callers using old_values, then insert_encrypted_activity_log() to record it.

import { supabase } from "@/integrations/supabase/client";

export type AuditAction =
  | "create"
  | "update"
  | "delete"
  | "publish"
  | "schedule"
  | "ai_process"
  | "connect"
  | "disconnect"
  | "upload"
  | "revert";

export type EntityType =
  | "draft_product"
  | "woo_product"
  | "social_post"
  | "template"
  | "setting"
  | "social_connection"
  | "telegram_source"
  | "brand_kit"
  | "wp_plugin"
  | "image";

export interface AuditParams {
  action: AuditAction;
  entity_type: EntityType;
  entity_id?: string | number | null;
  metadata?: Record<string, any>;
  old_values?: Record<string, any> | null;
  new_values?: Record<string, any> | null;
  status?: "success" | "failed";
  error_message?: string | null;
  resource_url?: string | null;
}

/** Fire-and-forget audit log write. Failures are logged but never thrown. */
export async function logActivity(p: AuditParams) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("activity_log").insert({
      user_id: user?.id || null,
      action: p.action,
      entity_type: p.entity_type,
      entity_id: p.entity_id ? String(p.entity_id) : null,
      metadata: p.metadata ?? {},
      old_values: p.old_values ?? null,
      new_values: p.new_values ?? null,
      status: p.status ?? "success",
      error_message: p.error_message ?? null,
      resource_url: p.resource_url ?? null,
    } as any);
  } catch (e) {
    console.warn("audit log write failed:", e);
  }
}

/** Wraps an async op and records success/failure with diffs. */
export async function withAudit<T>(
  params: Omit<AuditParams, "status" | "error_message" | "new_values"> & {
    getNewValues?: (result: T) => Record<string, any> | undefined | null;
  },
  op: () => Promise<T>
): Promise<T> {
  try {
    const result = await op();
    await logActivity({
      ...params,
      new_values: params.getNewValues ? (params.getNewValues(result) ?? null) : null,
      status: "success",
    });
    return result;
  } catch (e: any) {
    await logActivity({
      ...params,
      new_values: null,
      status: "failed",
      error_message: e?.message || String(e),
    });
    throw e;
  }
}