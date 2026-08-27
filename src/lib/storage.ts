import { supabase } from "@/integrations/supabase/client";

/**
 * Buckets are private. Values stored in the database may either be a raw object
 * path (new uploads) or a legacy public URL (older rows) — normalize both.
 */
export function storagePath(bucket: string, value: string | null | undefined): string | null {
  if (!value) return null;
  const marker = `/storage/v1/object/public/${bucket}/`;
  const idx = value.indexOf(marker);
  if (idx !== -1) {
    return decodeURIComponent(value.slice(idx + marker.length).split("?")[0]);
  }
  if (/^https?:\/\//i.test(value)) return null;
  return value.split("?")[0];
}

/** Create a short-lived signed URL for a private storage object. */
export async function signedUrl(
  bucket: string,
  value: string | null | undefined,
  expiresIn = 3600,
): Promise<string | null> {
  const path = storagePath(bucket, value);
  if (!path) return null;
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

/** Sign many objects at once; returns a map keyed by the original stored value. */
export async function signedUrlMap(
  bucket: string,
  values: (string | null | undefined)[],
  expiresIn = 3600,
): Promise<Record<string, string>> {
  const entries = await Promise.all(
    Array.from(new Set(values.filter(Boolean) as string[])).map(
      async (v) => [v, await signedUrl(bucket, v, expiresIn)] as const,
    ),
  );
  const map: Record<string, string> = {};
  for (const [k, v] of entries) if (v) map[k] = v;
  return map;
}
