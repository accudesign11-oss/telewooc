<?php
/**
 * Plugin Name: TeleWoo Injector
 * Description: يستقبل CSS/JS المولد من تطبيق TeleWoo ويطبعه في واجهة الموقع. ثبّت هذا الملف داخل wp-content/mu-plugins/ (أنشئ المجلد إن لم يكن موجودًا) — لن يحتاج تفعيل.
 * Version: 1.0.0
 * Author: TeleWoo
 */

if (!defined('ABSPATH')) exit;

/** Ensure a stable API key exists (auto-generated on first load). */
function telewoo_get_api_key() {
  $key = get_option('telewoo_api_key');
  if (!$key) {
    $key = wp_generate_password(40, false, false);
    add_option('telewoo_api_key', $key, '', false);
  }
  return $key;
}

/** REST endpoints. */
add_action('rest_api_init', function () {
  $ns = 'telewoo/v1';

  register_rest_route($ns, '/ping', [
    'methods'             => 'GET',
    'permission_callback' => '__return_true',
    'callback'            => function ($req) {
      return [
        'ok'       => true,
        'version'  => '1.0.0',
        'has_key'  => (bool) get_option('telewoo_api_key'),
      ];
    },
  ]);

  register_rest_route($ns, '/key', [
    'methods'             => 'GET',
    'permission_callback' => function () { return current_user_can('manage_options'); },
    'callback'            => function ($req) {
      return [ 'ok' => true, 'api_key' => telewoo_get_api_key() ];
    },
  ]);

  register_rest_route($ns, '/snapshot', [
    'methods'             => 'GET',
    'permission_callback' => 'telewoo_check_key',
    'callback'            => function ($req) {
      return [
        'ok'  => true,
        'css' => (string) get_option('telewoo_custom_css', ''),
        'js'  => (string) get_option('telewoo_custom_js', ''),
      ];
    },
  ]);

  register_rest_route($ns, '/customize', [
    'methods'             => 'POST',
    'permission_callback' => 'telewoo_check_key',
    'callback'            => function ($req) {
      $body = $req->get_json_params();
      $css  = isset($body['css']) ? (string) $body['css'] : null;
      $js   = isset($body['js'])  ? (string) $body['js']  : null;
      $mode = isset($body['mode']) ? (string) $body['mode'] : 'replace'; // replace | append

      if ($css !== null) {
        if ($mode === 'append') {
          $css = trim(get_option('telewoo_custom_css', '')) . "\n\n/* -- TeleWoo append " . gmdate('c') . " -- */\n" . $css;
        }
        update_option('telewoo_custom_css', $css, false);
      }
      if ($js !== null) {
        if ($mode === 'append') {
          $js = trim(get_option('telewoo_custom_js', '')) . "\n\n// -- TeleWoo append " . gmdate('c') . " --\n" . $js;
        }
        update_option('telewoo_custom_js', $js, false);
      }
      return [ 'ok' => true, 'saved_css' => $css !== null, 'saved_js' => $js !== null ];
    },
  ]);

  register_rest_route($ns, '/reset', [
    'methods'             => 'POST',
    'permission_callback' => 'telewoo_check_key',
    'callback'            => function ($req) {
      update_option('telewoo_custom_css', '', false);
      update_option('telewoo_custom_js', '', false);
      return [ 'ok' => true ];
    },
  ]);
});

/** Key check: header X-TeleWoo-Key must match stored option. */
function telewoo_check_key(WP_REST_Request $req) {
  $header = $req->get_header('x_telewoo_key');
  if (!$header) $header = $req->get_header('x-telewoo-key');
  $expected = telewoo_get_api_key();
  if (!$header || !hash_equals($expected, $header)) {
    return new WP_Error('telewoo_forbidden', 'Invalid TeleWoo key', [ 'status' => 401 ]);
  }
  return true;
}

/** Print CSS in <head>. */
add_action('wp_head', function () {
  $css = trim(get_option('telewoo_custom_css', ''));
  if ($css) echo "\n<style id=\"telewoo-custom-css\">\n" . $css . "\n</style>\n";
}, 100);

/** Print JS before </body>. */
add_action('wp_footer', function () {
  $js = trim(get_option('telewoo_custom_js', ''));
  if ($js) echo "\n<script id=\"telewoo-custom-js\">\n" . $js . "\n</script>\n";
}, 100);

/** Admin notice showing where to find the key. */
add_action('admin_notices', function () {
  if (!current_user_can('manage_options')) return;
  $key = telewoo_get_api_key();
  echo '<div class="notice notice-info"><p><strong>TeleWoo Injector مثبَّت.</strong> مفتاح الربط الخاص بك (انسخه إلى إعدادات TeleWoo → WordPress Studio):<br><code style="user-select:all;">' . esc_html($key) . '</code></p></div>';
});