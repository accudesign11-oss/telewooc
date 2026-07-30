import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, jsonResponse, encryptToken, decryptToken } from "../_shared/social-engine.ts";

// ---------- Platform diagnostics ----------
// Each returns: { ok, account_id, account_name, page_id?, page_name?,
//   page_access_token?, scopes?: string[], required_scopes?: string[],
//   missing_scopes?: string[], can_publish?: boolean, details?: any, error? }

function isMissingAccountsFieldError(error: any): boolean {
  const message = String(error?.message || "").toLowerCase();
  return error?.code === 100 && message.includes("accounts");
}

async function readJson(url: string) {
  const res = await fetch(url);
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

function fbError(d: any): string {
  const e = d?.error;
  if (!e) return typeof d === "string" ? d : JSON.stringify(d);
  const sub = e.error_subcode ? ` (subcode ${e.error_subcode})` : "";
  return `[FB ${e.code || ""}${sub}] ${e.message}${e.error_user_msg ? " — " + e.error_user_msg : ""}`;
}

async function fbPost(path: string, params: Record<string, any>) {
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    body.append(key, String(value));
  }
  const res = await fetch(`https://graph.facebook.com/v21.0/${path.replace(/^\//, "")}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) throw new Error(fbError(data));
  return data;
}

async function verifyFacebookCanActuallyPublish(pageId: string, pageToken: string) {
  let createdId: string | null = null;
  try {
    const created = await fbPost(`${pageId}/feed`, {
      message: "TeleWoo connection permission test",
      published: "false",
      access_token: pageToken,
    });
    createdId = created.id || null;
    return { ok: true, probe_id: createdId };
  } catch (e: any) {
    return { ok: false, error: e.message || "فشل اختبار النشر الفعلي" };
  } finally {
    if (createdId) {
      try { await fbPost(createdId, { access_token: pageToken, method: "delete" }); } catch { /* best-effort cleanup */ }
    }
  }
}

async function diagFacebookPage(rawToken: string, pageIdHint?: string) {
  const userToken = String(rawToken || "").trim();
  const required = ["pages_show_list", "pages_read_engagement", "pages_manage_posts"];
  // 1. Verify user token + scopes via debug_token
  const { data: me } = await readJson(`https://graph.facebook.com/v21.0/me?fields=id,name&access_token=${encodeURIComponent(userToken)}`);
  if (me.error) return { ok: false, error: `User token: ${me.error.message}` };

  // 2. Get permissions on user token
  const { data: perm } = await readJson(`https://graph.facebook.com/v21.0/me/permissions?access_token=${encodeURIComponent(userToken)}`);
  const granted: string[] = perm.error ? [] : (perm.data || []).filter((p: any) => p.status === "granted").map((p: any) => p.permission);
  const missing = required.filter((r) => !granted.includes(r));

  // 3. List pages to obtain Page Access Token
  const { data: pages } = await readJson(`https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token,tasks&access_token=${encodeURIComponent(userToken)}`);
  if (pages.error) {
    // If the supplied token is already a Page Access Token, /me/accounts is not a valid edge.
    // In that case validate the page directly instead of failing the connection.
    if (isMissingAccountsFieldError(pages.error) || pageIdHint) {
      const directPageId = pageIdHint || me.id;
      const { data: pv } = await readJson(`https://graph.facebook.com/v21.0/${directPageId}?fields=id,name,fan_count&access_token=${encodeURIComponent(userToken)}`);
      if (!pv.error) {
        const publishProbe = await verifyFacebookCanActuallyPublish(pv.id, userToken);
        if (!publishProbe.ok) {
          return {
            ok: false,
            error: `اختبار النشر الفعلي فشل: ${publishProbe.error}`,
            account_id: pv.id,
            account_name: pv.name,
            page_id: pv.id,
            page_name: pv.name,
            scopes: granted,
            required_scopes: required,
            missing_scopes: [],
            can_publish: false,
            token_type: "page_access_token",
          };
        }
        return {
          ok: true,
          account_id: pv.id,
          account_name: pv.name,
          page_id: pv.id,
          page_name: pv.name,
          page_access_token: userToken,
          scopes: granted,
          required_scopes: required,
          missing_scopes: [],
          can_publish: true,
          token_type: "page_access_token",
          details: {
            fan_count: pv.fan_count,
            publish_probe: "تم إنشاء منشور اختبار غير منشور ثم حذفه بنجاح.",
            note: "تم التحقق من Page Access Token مباشرة؛ لا يحتاج التطبيق لقراءة /me/accounts في هذه الحالة.",
          },
          error: null,
        };
      }
      return {
        ok: false,
        error: `Page Access Token غير صالح لهذه الصفحة: ${pv.error?.message || pages.error.message}`,
        scopes: granted,
        required_scopes: required,
        missing_scopes: [],
      };
    }
    return {
      ok: false,
      error: `لا يمكن قراءة قائمة الصفحات: ${pages.error.message}`,
      scopes: granted, required_scopes: required, missing_scopes: missing,
    };
  }
  const list = pages.data || [];
  if (!list.length) {
    return {
      ok: false,
      error: "لا توجد صفحات مرتبطة بهذا التوكن. تأكد من منح صلاحية pages_show_list وأنك Admin على الصفحة.",
      scopes: granted, required_scopes: required, missing_scopes: missing,
    };
  }
  let chosen = list[0];
  if (pageIdHint) {
    const m = list.find((p: any) => String(p.id) === String(pageIdHint));
    if (m) chosen = m;
    else return {
      ok: false,
      error: `Page ID ${pageIdHint} غير موجود ضمن الصفحات المتاحة لهذا التوكن.`,
      details: { available_pages: list.map((p: any) => ({ id: p.id, name: p.name })) },
      scopes: granted, required_scopes: required, missing_scopes: missing,
    };
  }

  const tasks: string[] = chosen.tasks || [];
  const canPublish = tasks.includes("CREATE_CONTENT") || tasks.includes("MANAGE");

  // 4. Sanity: hit page with its OWN page_access_token
  const { data: pv } = await readJson(`https://graph.facebook.com/v21.0/${chosen.id}?fields=id,name,fan_count&access_token=${encodeURIComponent(chosen.access_token)}`);
  if (pv.error) {
    return {
      ok: false,
      error: `Page Access Token غير صالح: ${pv.error.message}`,
      scopes: granted, required_scopes: required, missing_scopes: missing,
    };
  }

  const publishProbe = canPublish && missing.length === 0
    ? await verifyFacebookCanActuallyPublish(chosen.id, chosen.access_token)
    : { ok: false, error: missing.length ? `صلاحيات مفقودة: ${missing.join(", ")}` : "حسابك ليس لديه صلاحية CREATE_CONTENT" };

  return {
    ok: missing.length === 0 && canPublish && publishProbe.ok,
    account_id: chosen.id,
    account_name: chosen.name,
    page_id: chosen.id,
    page_name: chosen.name,
    page_access_token: chosen.access_token,
    scopes: granted,
    required_scopes: required,
    missing_scopes: missing,
    can_publish: canPublish && publishProbe.ok,
    tasks,
    details: { fan_count: pv.fan_count, available_pages: list.map((p: any) => ({ id: p.id, name: p.name })), publish_probe: publishProbe.ok ? "تم إنشاء منشور اختبار غير منشور ثم حذفه بنجاح." : null },
    error: missing.length ? `صلاحيات مفقودة: ${missing.join(", ")}` : (!canPublish ? "حسابك ليس لديه صلاحية النشر على هذه الصفحة (CREATE_CONTENT)." : (!publishProbe.ok ? `اختبار النشر الفعلي فشل: ${publishProbe.error}` : null)),
  };
}

async function diagInstagram(rawToken: string, igAccountIdHint?: string) {
  const userOrPageToken = String(rawToken || "").trim();
  const required = ["instagram_basic", "instagram_content_publish", "pages_show_list"];
  // Try permissions on the token
  const { data: perm } = await readJson(`https://graph.facebook.com/v21.0/me/permissions?access_token=${encodeURIComponent(userOrPageToken)}`);
  const granted: string[] = perm.error ? [] : (perm.data || []).filter((p: any) => p.status === "granted").map((p: any) => p.permission);
  const missing = required.filter((r) => !granted.includes(r));

  // Discover IG accounts via pages
  const { data: pages } = await readJson(`https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token,instagram_business_account{id,username,name}&access_token=${encodeURIComponent(userOrPageToken)}`);
  if (pages.error) {
    // Support Page Access Token directly. The page can expose its linked IG business account.
    const { data: pageMe } = await readJson(`https://graph.facebook.com/v21.0/me?fields=id,name,instagram_business_account{id,username,name}&access_token=${encodeURIComponent(userOrPageToken)}`);
    let ig = pageMe?.instagram_business_account;
    if (!ig && igAccountIdHint) {
      const { data: directIg } = await readJson(`https://graph.facebook.com/v21.0/${igAccountIdHint}?fields=id,username,name,followers_count&access_token=${encodeURIComponent(userOrPageToken)}`);
      if (!directIg.error) ig = directIg;
    }
    if (ig) {
      const { data: v } = await readJson(`https://graph.facebook.com/v21.0/${ig.id}?fields=id,username,name,followers_count&access_token=${encodeURIComponent(userOrPageToken)}`);
      if (v.error) return { ok: false, error: v.error.message, scopes: granted, required_scopes: required, missing_scopes: [] };
      return {
        ok: true,
        account_id: ig.id,
        account_name: ig.username || ig.name,
        page_id: pageMe?.id || null,
        page_name: pageMe?.name || null,
        page_access_token: userOrPageToken,
        scopes: granted,
        required_scopes: required,
        missing_scopes: [],
        can_publish: true,
        token_type: "page_access_token",
        details: { followers: v.followers_count, note: "تم التحقق من Page Access Token مباشرة." },
        error: null,
      };
    }
    return { ok: false, error: pages.error.message, scopes: granted, required_scopes: required, missing_scopes: missing };
  }
  const igs: any[] = [];
  for (const p of pages.data || []) {
    if (p.instagram_business_account) {
      igs.push({ ig_id: p.instagram_business_account.id, ig_username: p.instagram_business_account.username, page_id: p.id, page_name: p.name, page_access_token: p.access_token });
    }
  }
  if (!igs.length) return { ok: false, error: "لا توجد حسابات Instagram Business مرتبطة بأي صفحة Facebook.", scopes: granted, required_scopes: required, missing_scopes: missing };

  let chosen = igs[0];
  if (igAccountIdHint) {
    const m = igs.find((x) => String(x.ig_id) === String(igAccountIdHint));
    if (m) chosen = m;
    else return { ok: false, error: `IG Account ID ${igAccountIdHint} غير موجود.`, details: { available: igs }, scopes: granted, required_scopes: required, missing_scopes: missing };
  }

  // Verify with page access token (IG publishing uses page token)
  const { data: v } = await readJson(`https://graph.facebook.com/v21.0/${chosen.ig_id}?fields=id,username,name,followers_count&access_token=${encodeURIComponent(chosen.page_access_token)}`);
  if (v.error) return { ok: false, error: v.error.message, scopes: granted, required_scopes: required, missing_scopes: missing };

  return {
    ok: missing.length === 0,
    account_id: chosen.ig_id,
    account_name: chosen.ig_username,
    page_id: chosen.page_id,
    page_name: chosen.page_name,
    page_access_token: chosen.page_access_token,
    scopes: granted,
    required_scopes: required,
    missing_scopes: missing,
    can_publish: missing.length === 0,
    details: { followers: v.followers_count, available: igs },
    error: missing.length ? `صلاحيات مفقودة: ${missing.join(", ")}` : null,
  };
}

async function diagX(token: string) {
  const r = await fetch("https://api.x.com/2/users/me", { headers: { Authorization: `Bearer ${token}` } });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) return { ok: false, error: d?.detail || d?.title || `HTTP ${r.status}` };
  return { ok: true, account_id: d.data?.id, account_name: d.data?.username, can_publish: true };
}

async function diagLinkedIn(token: string) {
  const r = await fetch("https://api.linkedin.com/v2/userinfo", { headers: { Authorization: `Bearer ${token}` } });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) return { ok: false, error: d?.message || `HTTP ${r.status}` };
  return { ok: true, account_id: d.sub, account_name: d.name, can_publish: true };
}

async function diagTikTok(token: string) {
  const r = await fetch("https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name", { headers: { Authorization: `Bearer ${token}` } });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || d.error?.code !== "ok") return { ok: false, error: d.error?.message || `HTTP ${r.status}` };
  return { ok: true, account_id: d.data?.user?.open_id, account_name: d.data?.user?.display_name, can_publish: true };
}

async function diagPinterest(token: string) {
  const r = await fetch("https://api.pinterest.com/v5/user_account", { headers: { Authorization: `Bearer ${token}` } });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) return { ok: false, error: d?.message || `HTTP ${r.status}` };
  return { ok: true, account_id: d.username, account_name: d.username, can_publish: true };
}

async function diagYouTube(token: string) {
  const r = await fetch("https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true", { headers: { Authorization: `Bearer ${token}` } });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) return { ok: false, error: d?.error?.message || `HTTP ${r.status}` };
  const ch = d.items?.[0];
  if (!ch) return { ok: false, error: "لا توجد قناة" };
  return { ok: true, account_id: ch.id, account_name: ch.snippet?.title, can_publish: true };
}

async function diagThreads(token: string) {
  const r = await fetch(`https://graph.threads.net/v1.0/me?fields=id,username&access_token=${token}`);
  const d = await r.json().catch(() => ({}));
  if (!r.ok || d.error) return { ok: false, error: d.error?.message || `HTTP ${r.status}` };
  return { ok: true, account_id: d.id, account_name: d.username, can_publish: true };
}

async function diagGoogleBusiness(token: string) {
  const r = await fetch("https://mybusinessaccountmanagement.googleapis.com/v1/accounts", { headers: { Authorization: `Bearer ${token}` } });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) return { ok: false, error: d?.error?.message || `HTTP ${r.status}` };
  const acc = d.accounts?.[0];
  if (!acc) return { ok: false, error: "لا توجد حسابات Google Business" };
  return { ok: true, account_id: acc.name, account_name: acc.accountName, can_publish: true };
}

async function diagnose(platform: string, token: string, pageId?: string, accountId?: string) {
  switch (platform) {
    case "facebook_page": return await diagFacebookPage(token, pageId || undefined);
    case "instagram": return await diagInstagram(token, accountId || undefined);
    case "x": return await diagX(token);
    case "linkedin": return await diagLinkedIn(token);
    case "tiktok": return await diagTikTok(token);
    case "pinterest": return await diagPinterest(token);
    case "youtube_community": return await diagYouTube(token);
    case "threads": return await diagThreads(token);
    case "google_business": return await diagGoogleBusiness(token);
    default: return { ok: false, error: `منصة غير مدعومة للاختبار: ${platform}` };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse({ error: "Missing authorization" }, 401);
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: { user }, error: ue } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    if (ue || !user) return jsonResponse({ error: "Invalid token" }, 401);

    const body = await req.json();
    const { save, connection_id, platform, access_token, page_id, account_id } = body;

    // Test existing connection
    if (connection_id) {
      const { data: conn } = await supabase.from("social_platform_connections").select("*").eq("id", connection_id).eq("user_id", user.id).single();
      if (!conn) return jsonResponse({ ok: false, error: "not found" });
      const dec = await decryptToken(conn.access_token_encrypted);
      if (!dec) return jsonResponse({ ok: false, error: "decryption failed" });
      const report = await diagnose(conn.platform, dec, conn.page_id, conn.account_id);
      // If FB/IG and we got a fresh page_access_token, persist it so publish uses the right token
      const updates: any = {
        last_tested_at: new Date().toISOString(),
        status: report.ok ? "connected" : "error",
        last_error: report.ok ? null : (report.error || "فشل الاختبار"),
        account_name: report.account_name || conn.account_name,
      };
      if (report.page_access_token && report.page_access_token !== dec) {
        updates.access_token_encrypted = await encryptToken(report.page_access_token);
      }
      if (report.page_id && !conn.page_id) updates.page_id = report.page_id;
      if (report.page_name) updates.page_name = report.page_name;
      await supabase.from("social_platform_connections").update(updates).eq("id", conn.id);
      return jsonResponse({ ok: report.ok, report });
    }

    // Save new connection
    if (save) {
      if (!platform || !access_token) return jsonResponse({ ok: false, error: "platform & access_token required" });
      const report = await diagnose(platform, access_token, page_id, account_id);
      if (!report.ok && !report.account_id) {
        return jsonResponse({ ok: false, error: report.error || "فشل التحقق", report });
      }
      // Store the right token (Page Access Token for FB/IG, else original)
      const tokenToStore = report.page_access_token || access_token;
      const enc = await encryptToken(tokenToStore);
      await supabase.from("social_platform_connections")
        .delete()
        .eq("user_id", user.id)
        .eq("platform", platform);
      const { error } = await supabase.from("social_platform_connections").insert({
        user_id: user.id,
        platform,
        account_name: report.account_name,
        account_id: report.account_id,
        page_id: report.page_id || null,
        page_name: report.page_name || null,
        access_token_encrypted: enc,
        status: report.ok ? "connected" : "error",
        last_tested_at: new Date().toISOString(),
        last_error: report.ok ? null : (report.error || null),
      });
      if (error) return jsonResponse({ ok: false, error: error.message });
      return jsonResponse({ ok: report.ok, report });
    }

    return jsonResponse({ ok: false, error: "no action" });
  } catch (e: any) {
    console.error("test-connection error:", e);
    return jsonResponse({ ok: false, error: e.message });
  }
});
