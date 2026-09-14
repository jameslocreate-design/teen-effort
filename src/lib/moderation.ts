import { supabase } from "@/integrations/supabase/client";

export type ReportContentType =
  | "partner_profile"
  | "partner_request"
  | "love_letter"
  | "expert_post"
  | "expert_reply"
  | "date_review";

export const REPORT_REASONS = [
  "Harassment or bullying",
  "Sexual or explicit content",
  "Threats or violence",
  "Someone may be a minor being targeted",
  "Spam or scam",
  "Impersonation or fake account",
  "Something else",
] as const;

export interface ReportInput {
  contentType: ReportContentType;
  contentId?: string | null;
  reportedUserId?: string | null;
  snapshot?: string | null;
  reason: string;
  details?: string;
}

/** File a report. Reviewed by the Teen Effort team. */
export async function submitReport(input: ReportInput) {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) throw new Error("You need to be signed in to report.");

  const { error } = await supabase.from("content_reports").insert({
    reporter_id: uid,
    reported_user_id: input.reportedUserId ?? null,
    content_type: input.contentType,
    content_id: input.contentId ?? null,
    content_snapshot: input.snapshot ? input.snapshot.slice(0, 2000) : null,
    reason: input.reason,
    details: input.details?.trim() ? input.details.trim() : null,
  });

  if (error) throw error;
}

/**
 * Block someone: records the block (so they can never link with you again)
 * and removes any existing or pending link between you.
 */
export async function blockUser(blockedId: string) {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) throw new Error("You need to be signed in to block someone.");

  const { error } = await supabase
    .from("blocked_users")
    .upsert({ blocker_id: uid, blocked_id: blockedId }, { onConflict: "blocker_id,blocked_id" });
  if (error) throw error;

  // Remove any link rows in either direction
  await supabase
    .from("partner_links")
    .delete()
    .or(
      `and(user1_id.eq.${uid},user2_id.eq.${blockedId}),and(user1_id.eq.${blockedId},user2_id.eq.${uid})`
    );
}

export async function unblockUser(blockedId: string) {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return;
  await supabase.from("blocked_users").delete().eq("blocker_id", uid).eq("blocked_id", blockedId);
}

export async function listBlockedIds(): Promise<string[]> {
  const { data } = await supabase.from("blocked_users").select("blocked_id");
  return (data ?? []).map((r) => r.blocked_id as string);
}

export const BLOCKED_MESSAGE =
  "You can't connect with this account because one of you blocked the other.";

export function isBlockedError(error: unknown): boolean {
  const message = (error as { message?: string } | null)?.message ?? "";
  return message.includes("USER_BLOCKED");
}
