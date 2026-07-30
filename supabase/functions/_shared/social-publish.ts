export type PublishResult = {
  id: string | null;
  url: string | null;
  raw: any;
};

export function normalizeMedia(media: any): string[] {
  const list = Array.isArray(media) ? media : [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of list) {
    const url = typeof item === "string" ? item.trim() : String(item?.url || "").trim();
    if (!/^https:\/\//i.test(url)) continue;
    const key = url.replace(/[?#].*$/, "").toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(url);
  }
  return out.slice(0, 10);
}

export async function resolvePublishMedia(supabase: any, media: any): Promise<string[]> {
  const list = Array.isArray(media) ? media : [];
  const resolved: string[] = [];
  for (const item of list) {
    if (typeof item === "string") {
      if (/^https:\/\//i.test(item.trim())) resolved.push(item.trim());
      continue;
    }
    const direct = String(item?.url || item?.media_url || item?.signedUrl || "").trim();
    if (/^https:\/\//i.test(direct)) {
      resolved.push(direct);
      continue;
    }
    const bucket = String(item?.bucket || item?.storage_bucket || "social-media").trim();
    const path = String(item?.path || item?.storage_path || "").trim();
    if (bucket && path) {
      try {
        const { data } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60 * 24);
        if (data?.signedUrl) resolved.push(data.signedUrl);
      } catch { /* ignore invalid storage references */ }
    }
  }
  return normalizeMedia(resolved);
}

export function normalizePlatform(platform: string): string {
  const p = String(platform || "").trim();
  if (p === "facebook") return "facebook_page";
  if (p === "twitter") return "x";
  if (p === "youtube") return "youtube_community";
  return p;
}

export function connectionScore(c: any): number {
  const tested = c.last_tested_at || c.updated_at || c.created_at || "";
  const ts = tested ? Math.floor(new Date(tested).getTime() / 100000) : 0;
  return (c.status === "connected" ? 1000000 : 0) + (!c.last_error ? 100000 : 0) + (c.access_token_encrypted ? 10000 : 0) + ts;
}

export function getConnectionCandidates(connections: any[] | null | undefined, platform: string): any[] {
  const wanted = normalizePlatform(platform);
  return [...(connections || [])]
    .filter((c) => normalizePlatform(c.platform) === wanted && c.access_token_encrypted)
    .sort((a, b) => connectionScore(b) - connectionScore(a));
}

function isWebpUrl(url: string): boolean {
  return /\.webp([?#].*)?$/i.test(url);
}

function isLikelyImageUrl(url: string): boolean {
  return !/\.(mp4|mov|webm|m4v|avi)([?#].*)?$/i.test(url);
}

export function isAuthOrPermissionError(message: string): boolean {
  const m = String(message || "").toLowerCase();
  return /fb\s*190|oauth|access token|invalid token|error validating application|application has been deleted|permission|permissions|pages_manage_posts|pages_read_engagement|instagram_content_publish|create_content|not authorized|unauthorized|forbidden|\(#200\)|\[fb 200\]/i.test(m);
}

export function fbError(d: any): string {
  const e = d?.error;
  if (!e) return typeof d === "string" ? d : JSON.stringify(d);
  const code = e.code ? ` ${e.code}` : "";
  const sub = e.error_subcode ? ` subcode ${e.error_subcode}` : "";
  const title = e.error_user_title ? ` — ${e.error_user_title}` : "";
  const userMsg = e.error_user_msg ? ` — ${e.error_user_msg}` : "";
  return `[FB${code}${sub ? ` (${sub})` : ""}] ${e.message || "Graph API error"}${title}${userMsg}`;
}

function withMediaHint(error: string, platform: string, media: string[]): string {
  const hasWebp = media.some(isWebpUrl);
  const mediaLike = /image|photo|media|url|format|download|fetch|carousel|container/i.test(error);
  if (hasWebp && (platform === "instagram" || mediaLike)) {
    return `${error} — ملاحظة: Instagram وكثير من مسارات Meta لا تقبل WebP كصورة نشر مباشرة. ارفع الصور من تبويب إنشاء المنشور بزر صور السوشيال JPG ثم أعد النشر.`;
  }
  if (/application has been deleted|error validating application/i.test(error)) {
    return `${error} — هذا يعني أن التوكن صادر من تطبيق Meta محذوف/غير صالح. احذف الربط القديم وأعد الحفظ بتوكن Page Access Token جديد من التطبيق الصحيح.`;
  }
  return error;
}

function appendMediaLinks(message: string, media: string[]) {
  if (!media.length) return message;
  return `${message || ""}\n\nالصور:\n${media.map((url) => `• ${url}`).join("\n")}`.trim();
}

async function graphPost(host: string, version: string, path: string, params: Record<string, any>) {
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    body.append(key, typeof value === "object" ? JSON.stringify(value) : String(value));
  }
  const res = await fetch(`https://${host}/${version}/${path.replace(/^\//, "")}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const text = await res.text();
  let data: any = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  if (!res.ok || data.error) throw new Error(fbError(data));
  return data;
}

async function graphGet(host: string, version: string, path: string, params: Record<string, any>) {
  const q = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    q.append(key, String(value));
  }
  const res = await fetch(`https://${host}/${version}/${path.replace(/^\//, "")}?${q.toString()}`);
  const text = await res.text();
  let data: any = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  if (!res.ok || data.error) throw new Error(fbError(data));
  return data;
}

async function waitForInstagramContainer(token: string, creationId: string) {
  for (let i = 0; i < 15; i++) {
    const d = await graphGet("graph.facebook.com", "v21.0", creationId, {
      fields: "status_code,status",
      access_token: token,
    });
    if (!d.status_code || d.status_code === "FINISHED") return;
    if (d.status_code === "ERROR" || d.status_code === "EXPIRED") throw new Error(`Instagram media container: ${d.status || d.status_code}`);
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
  throw new Error("Instagram media container لم يكتمل في الوقت المتوقع. جرّب صورة أصغر بصيغة JPG أو أعد النشر بعد لحظات.");
}

export async function publishToFacebookPage(token: string, pageId: string, message: string, rawMedia: any): Promise<PublishResult> {
  if (!pageId) throw new Error("Page ID مفقود. أعد ربط الصفحة.");
  const media = normalizeMedia(rawMedia).filter(isLikelyImageUrl);
  try {
    if (media.length === 1) {
      const d = await graphPost("graph.facebook.com", "v21.0", `${pageId}/photos`, {
        url: media[0],
        caption: message,
        access_token: token,
      });
      return { id: d.post_id || d.id || null, url: d.post_id ? `https://www.facebook.com/${d.post_id}` : null, raw: d };
    }

    if (media.length > 1) {
      const ids: string[] = [];
      for (const url of media) {
        const d = await graphPost("graph.facebook.com", "v21.0", `${pageId}/photos`, {
          url,
          published: false,
          temporary: true,
          access_token: token,
        });
        if (!d.id) throw new Error("Facebook لم يرجع media id للصورة");
        ids.push(d.id);
      }
      const d = await graphPost("graph.facebook.com", "v21.0", `${pageId}/feed`, {
        message,
        attached_media: ids.map((id) => ({ media_fbid: id })),
        access_token: token,
      });
      return { id: d.id || null, url: d.id ? `https://www.facebook.com/${d.id}` : null, raw: d };
    }

    const d = await graphPost("graph.facebook.com", "v21.0", `${pageId}/feed`, { message, access_token: token });
    return { id: d.id || null, url: d.id ? `https://www.facebook.com/${d.id}` : null, raw: d };
  } catch (e: any) {
    const messageWithHint = withMediaHint(e.message, "facebook_page", media);
    if (media.length && !isAuthOrPermissionError(messageWithHint)) {
      const d = await graphPost("graph.facebook.com", "v21.0", `${pageId}/feed`, {
        message: appendMediaLinks(message, media),
        access_token: token,
      });
      return {
        id: d.id || null,
        url: d.id ? `https://www.facebook.com/${d.id}` : null,
        raw: { ...d, media_fallback: true, original_media_error: messageWithHint },
      };
    }
    throw new Error(messageWithHint);
  }
}

export async function publishToInstagram(token: string, igAccountId: string, message: string, rawMedia: any): Promise<PublishResult> {
  if (!igAccountId) throw new Error("Instagram Account ID مفقود.");
  const media = normalizeMedia(rawMedia).filter(isLikelyImageUrl);
  if (!media.length) throw new Error("Instagram يتطلب صورة واحدة على الأقل");
  const webp = media.find(isWebpUrl);
  if (webp) throw new Error("Instagram لا يقبل WebP كرابط نشر مباشر. استخدم زر تهيئة/رفع صور السوشيال JPG داخل إنشاء المنشور ثم أعد النشر.");

  try {
    if (media.length === 1) {
      const created = await graphPost("graph.facebook.com", "v21.0", `${igAccountId}/media`, {
        image_url: media[0],
        caption: message,
        access_token: token,
      });
      await waitForInstagramContainer(token, created.id);
      const pub = await graphPost("graph.facebook.com", "v21.0", `${igAccountId}/media_publish`, {
        creation_id: created.id,
        access_token: token,
      });
      let permalink: string | null = null;
      try {
        const v = await graphGet("graph.facebook.com", "v21.0", pub.id, { fields: "permalink", access_token: token });
        permalink = v.permalink || null;
      } catch { /* permalink is optional */ }
      return { id: pub.id || null, url: permalink, raw: pub };
    }

    const childIds: string[] = [];
    for (const url of media) {
      const d = await graphPost("graph.facebook.com", "v21.0", `${igAccountId}/media`, {
        image_url: url,
        is_carousel_item: true,
        access_token: token,
      });
      await waitForInstagramContainer(token, d.id);
      childIds.push(d.id);
    }
    const container = await graphPost("graph.facebook.com", "v21.0", `${igAccountId}/media`, {
      media_type: "CAROUSEL",
      children: childIds.join(","),
      caption: message,
      access_token: token,
    });
    await waitForInstagramContainer(token, container.id);
    const pub = await graphPost("graph.facebook.com", "v21.0", `${igAccountId}/media_publish`, {
      creation_id: container.id,
      access_token: token,
    });
    return { id: pub.id || null, url: null, raw: pub };
  } catch (e: any) {
    throw new Error(withMediaHint(e.message, "instagram", media));
  }
}

export async function publishToThreads(token: string, accountId: string, message: string, rawMedia: any): Promise<PublishResult> {
  if (!accountId) throw new Error("Threads Account ID مفقود.");
  const media = normalizeMedia(rawMedia).filter(isLikelyImageUrl);
  if (media.length > 1) throw new Error("Threads carousel غير مفعل هنا بعد؛ استخدم صورة واحدة أو نص فقط.");
  const params: any = {
    media_type: media.length ? "IMAGE" : "TEXT",
    text: message,
    access_token: token,
  };
  if (media.length === 1) params.image_url = media[0];
  const d = await graphPost("graph.threads.net", "v1.0", `${accountId}/threads`, params);
  const p = await graphPost("graph.threads.net", "v1.0", `${accountId}/threads_publish`, {
    creation_id: d.id,
    access_token: token,
  });
  return { id: p.id || null, url: null, raw: p };
}

export async function publishToX(token: string, message: string): Promise<PublishResult> {
  const r = await fetch("https://api.x.com/2/tweets", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ text: message.slice(0, 280) }),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d?.detail || d?.title || `X HTTP ${r.status}`);
  return { id: d.data?.id || null, url: d.data?.id ? `https://x.com/i/web/status/${d.data.id}` : null, raw: d };
}

export async function publishToLinkedIn(token: string, accountId: string, message: string): Promise<PublishResult> {
  const author = accountId?.startsWith("urn:") ? accountId : `urn:li:person:${accountId}`;
  const r = await fetch("https://api.linkedin.com/v2/ugcPosts", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "X-Restli-Protocol-Version": "2.0.0" },
    body: JSON.stringify({
      author,
      lifecycleState: "PUBLISHED",
      specificContent: { "com.linkedin.ugc.ShareContent": { shareCommentary: { text: message }, shareMediaCategory: "NONE" } },
      visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
    }),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d?.message || `LinkedIn HTTP ${r.status}`);
  return { id: d.id || null, url: null, raw: d };
}

export async function publishToPlatform(platform: string, token: string, conn: any, message: string, media: any): Promise<PublishResult> {
  const p = normalizePlatform(platform);
  if (p === "facebook_page") return await publishToFacebookPage(token, conn.page_id || conn.account_id, message, media);
  if (p === "instagram") return await publishToInstagram(token, conn.account_id, message, media);
  if (p === "threads") return await publishToThreads(token, conn.account_id, message, media);
  if (p === "x") return await publishToX(token, message);
  if (p === "linkedin") return await publishToLinkedIn(token, conn.account_id, message);
  throw new Error(`النشر الفعلي على ${platform} يحتاج API إضافي غير متاح في هذا المسار. المدعوم حالياً للنشر الفعلي: Facebook Page، Instagram Business، Threads، X، LinkedIn.`);
}