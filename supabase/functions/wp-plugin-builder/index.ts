import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import JSZip from "npm:jszip@3.10.1";
import { corsHeaders, jsonResponse, callAIJson, getAuthedUserAndAI } from "../_shared/social-engine.ts";

function slugify(s: string): string {
  return (s || "plugin")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 40) || "plugin";
}

function bumpVersion(v: string): string {
  const parts = (v || "1.0.0").split(".").map((n) => parseInt(n) || 0);
  while (parts.length < 3) parts.push(0);
  parts[2] += 1;
  return parts.join(".");
}

function buildPluginPhp(opts: {
  name: string;
  slug: string;
  version: string;
  description: string;
  prefix: string;
  css: string;
  js: string;
  extraPhp: string;
}): string {
  const { name, slug, version, description, prefix, css, js, extraPhp } = opts;
  const cssSafe = (css || "").replace(/<\/style/gi, "<\\/style");
  const jsSafe = (js || "").replace(/<\/script/gi, "<\\/script");
  const extra = (extraPhp || "").replace(/^<\?php\s*/i, "");

  return `<?php
/**
 * Plugin Name: ${name}
 * Description: ${description || name}
 * Version: ${version}
 * Author: TeleWoo Studio
 * Text Domain: ${slug}
 * Requires at least: 5.6
 * Requires PHP: 7.4
 */

if (!defined('ABSPATH')) { exit; }

if (!class_exists('${prefix}_Plugin')) {
class ${prefix}_Plugin {
    const VERSION = '${version}';
    const SLUG = '${slug}';
    const HANDLE = '${slug}';

    public static function init() {
        add_action('wp_enqueue_scripts', array(__CLASS__, 'enqueue_assets'));
    }

    public static function enqueue_assets() {
        $dir = plugin_dir_url(__FILE__);
        wp_enqueue_style(self::HANDLE . '-css', $dir . 'assets/style.css', array(), self::VERSION);
        wp_enqueue_script(self::HANDLE . '-js', $dir . 'assets/script.js', array(), self::VERSION, true);
    }
}
${prefix}_Plugin::init();
}

${extra}
`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { user, supabase, ai } = await getAuthedUserAndAI(req);
    const body = await req.json().catch(() => ({}));
    const prompt = String(body?.prompt || "").trim();
    const basePluginId: string | null = body?.base_plugin_id || null;
    const context = String(body?.context || "متجر WooCommerce عربي RTL");

    if (!prompt) return jsonResponse({ ok: false, error: "الرجاء إدخال طلبك" });

    const mergePluginIds: string[] = Array.isArray(body?.merge_plugin_ids) ? body.merge_plugin_ids : [];

    // Load base plugin (for versioning)
    let basePlugin: any = null;
    let lastVersion: any = null;
    if (basePluginId) {
      const { data } = await supabase.from("wp_plugins").select("*").eq("id", basePluginId).eq("user_id", user.id).maybeSingle();
      basePlugin = data;
      if (basePlugin) {
        const { data: lv } = await supabase.from("wp_plugin_versions").select("*").eq("plugin_id", basePlugin.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
        lastVersion = lv;
      }
    }

    // Load merged plugins context
    let mergePluginsContext = "";
    if (mergePluginIds.length > 0) {
      const { data: mPlugins } = await supabase.from("wp_plugins").select("*").in("id", mergePluginIds).eq("user_id", user.id);
      if (mPlugins && mPlugins.length > 0) {
        for (const mp of mPlugins) {
          const { data: lv } = await supabase.from("wp_plugin_versions").select("*").eq("plugin_id", mp.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
          mergePluginsContext += `\n--- إضافة للدمج: ${mp.name} (${mp.slug}) ---\nCSS:\n${lv?.css || ""}\nJS:\n${lv?.js || ""}\nPHP:\n${lv?.php_code || ""}\n`;
        }
      }
    }

    const sys = `أنت مطور WordPress خبير ومحترف. تولّد Plugin كامل ومستقل يعمل كإضافة WordPress قياسية.

قواعد صارمة:
- CSS يستخدم selectors عامة تعمل مع أغلب قوالب WooCommerce ويدعم RTL.
- JavaScript vanilla، ملفوف في IIFE، بدون jQuery إلا للضرورة.
- إن احتاج الأمر PHP إضافي (shortcodes، hooks، admin settings) ضعه في extra_php — بدون فتح <?php.
- لا تستخدم مكتبات خارجية أو CDN.
- إن كنت تعدل plugin موجود (base_plugin_id) فحافظ على نفس الوظيفة الأساسية وأضف التحسينات وحافظ على توافق الإصدارات.
- إن طُلب منك دمج عدة إضافات (merge_plugin_ids) قم بإعادة كتابة وتوحيد كافة الكود والمزايا في إضافة موحدة واحدة فائقة القوة دون أي تعارض في الأسماء أو المتغيرات.

أعد JSON فقط بهذا الشكل:
{
  "name": "اسم الـ Plugin بالعربية",
  "description": "وصف قصير لما يفعله",
  "css": "...",
  "js": "...",
  "extra_php": "",
  "changelog": "ما تغير في هذه النسخة (سطر أو سطران)"
}`;

    const usr = `السياق: ${context}

الطلب: ${prompt}

${mergePluginsContext ? `إعادة كتابة ودمج الإضافات التالية في إضافة موحدة أقوى:\n${mergePluginsContext}` : ""}

${basePlugin ? `تعديل وتطوير على Plugin موجود: ${basePlugin.name} (slug: ${basePlugin.slug}, آخر إصدار: ${basePlugin.current_version}).

CSS الحالي:
\`\`\`css
${(lastVersion?.css || "").slice(0, 4000)}
\`\`\`

JS الحالي:
\`\`\`js
${(lastVersion?.js || "").slice(0, 4000)}
\`\`\`
` : "إنشاء Plugin جديد من الصفر."}

أعد JSON فقط.`;

    let data: any = {};
    let provider = "unknown";
    try {
      const r = await callAIJson(ai, sys, usr, 3);
      data = r.data || {};
      provider = r.provider;
    } catch (e: any) {
      return jsonResponse({ ok: false, error: "تعذر الاتصال بالذكاء الاصطناعي: " + (e?.message || "خطأ") });
    }

    const name: string = String(data.name || prompt.slice(0, 40) || "TeleWoo Custom Plugin").trim();
    const description: string = String(data.description || prompt.slice(0, 120)).trim();
    const css = String(data.css || "").trim();
    const js = String(data.js || "").trim();
    const extraPhp = String(data.extra_php || "").trim();
    const changelog = String(data.changelog || (basePlugin ? "تحديث تلقائي" : "الإصدار الأول")).trim();

    if (!css && !js && !extraPhp) {
      return jsonResponse({ ok: false, error: "لم يتم توليد كود، جرّب صياغة الطلب بشكل أوضح." });
    }

    // Determine plugin record and version
    let pluginRow: any = basePlugin;
    let newVersion = "1.0.0";
    let slug = "";

    if (pluginRow) {
      slug = pluginRow.slug;
      newVersion = bumpVersion(pluginRow.current_version);
      await supabase.from("wp_plugins").update({ current_version: newVersion, name, description }).eq("id", pluginRow.id);
    } else {
      const base = slugify(name);
      slug = `telewoo-${base}-${Math.random().toString(36).slice(2, 6)}`;
      const { data: created, error: ce } = await supabase
        .from("wp_plugins")
        .insert({ user_id: user.id, slug, name, description, current_version: newVersion })
        .select()
        .single();
      if (ce) throw ce;
      pluginRow = created;
    }

    const prefix = "TW_" + slug.replace(/[^a-z0-9]/gi, "_").replace(/^_+/, "").slice(0, 30);

    const php = buildPluginPhp({ name, slug, version: newVersion, description, prefix, css, js, extraPhp });

    // Build ZIP
    const zip = new JSZip();
    const folder = zip.folder(slug)!;
    folder.file(`${slug}.php`, php);
    folder.folder("assets")!.file("style.css", css || `/* ${name} v${newVersion} */\n`);
    folder.folder("assets")!.file("script.js", js || `/* ${name} v${newVersion} */\n(function(){})();`);
    folder.file("readme.txt", `=== ${name} ===\nVersion: ${newVersion}\n\n${description}\n\n== Changelog ==\n= ${newVersion} =\n${changelog}\n`);
    const zipU8: Uint8Array = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
    let bin = "";
    for (let i = 0; i < zipU8.length; i++) bin += String.fromCharCode(zipU8[i]);
    const zipBase64 = btoa(bin);

    // Save version
    const { data: ver } = await supabase
      .from("wp_plugin_versions")
      .insert({
        plugin_id: pluginRow.id,
        user_id: user.id,
        version: newVersion,
        prompt,
        php_code: php,
        css,
        js,
        explanation: data.explanation || null,
        changelog,
        provider,
      })
      .select("id")
      .single();

    return jsonResponse({
      ok: true,
      plugin_id: pluginRow.id,
      version_id: ver?.id,
      slug,
      name,
      version: newVersion,
      description,
      changelog,
      css,
      js,
      extra_php: extraPhp,
      provider,
      zip_filename: `${slug}-${newVersion}.zip`,
      zip_base64: zipBase64,
    });
  } catch (e: any) {
    console.error("wp-plugin-builder error:", e);
    return jsonResponse({ ok: false, error: e?.message || String(e) });
  }
});