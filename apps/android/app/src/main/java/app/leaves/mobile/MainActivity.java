package app.leaves.mobile;

import android.app.*;
import android.os.Bundle;
import android.content.*;
import android.net.Uri;
import android.webkit.*;
import android.widget.*;
import org.json.*;
import java.io.*;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.*;

public class MainActivity extends Activity {
    private static final String LOCAL_ORIGIN = "https://leaves.android.local";
    private WebView web;
    private AppUpdater updater;
    private boolean migrating;
    private String pendingExport;
    private ValueCallback<Uri[]> fileCallback;
    private final ExecutorService network = Executors.newFixedThreadPool(2);
    private final Map<String, HttpURLConnection> connections = new ConcurrentHashMap<>();
    private final Set<String> cancelled = ConcurrentHashMap.newKeySet();
    private static final int EXPORT = 11, IMPORT = 12;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        updater = new AppUpdater(this);
        String oldServer = getPreferences(0).getString("server", "");
        migrating = !oldServer.isEmpty() && !getPreferences(0).getBoolean("migrationCaptured", false);
        open();
        web.loadUrl((migrating ? oldServer : LOCAL_ORIGIN) + "/");
    }

    @SuppressWarnings("SetJavaScriptEnabled") private void open() {
        LinearLayout root = new LinearLayout(this); root.setOrientation(LinearLayout.VERTICAL);
        root.setOnApplyWindowInsetsListener((v, insets) -> {
            v.setPadding(insets.getSystemWindowInsetLeft(), insets.getSystemWindowInsetTop(), insets.getSystemWindowInsetRight(), insets.getSystemWindowInsetBottom()); return insets.consumeSystemWindowInsets();
        });
        web = new WebView(this); root.addView(web, new LinearLayout.LayoutParams(-1, -1)); setContentView(root);
        web.getSettings().setJavaScriptEnabled(true);
        web.getSettings().setDomStorageEnabled(true);
        web.getSettings().setAllowFileAccess(false);
        web.getSettings().setAllowContentAccess(false);
        CookieManager.getInstance().setAcceptCookie(true);
        web.addJavascriptInterface(new AppBridge(), "LeavesAndroid");
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) { return true; }
            @Override public void onPageFinished(WebView view, String url) {
                if (!migrating || !sameOrigin(Uri.parse(url), getPreferences(0).getString("server", ""))) return;
                web.evaluateJavascript("(()=>{const data={};for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k.startsWith('leaves.prototype.')||k==='leaves.android.lastUser')data[k]=localStorage.getItem(k);}return data;})()", value -> {
                    if (value == null || value.equals("null")) { Toast.makeText(MainActivity.this, "旧版记录读取失败，请重启重试", Toast.LENGTH_LONG).show(); return; }
                    getPreferences(0).edit().putString("legacyData", value).putBoolean("migrationCaptured", true).apply();
                    migrating = false; web.loadUrl(LOCAL_ORIGIN + "/");
                });
            }
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                String allowed = migrating ? getPreferences(0).getString("server", "") : LOCAL_ORIGIN;
                if (!sameOrigin(uri, allowed)) return null;
                String path = uri.getPath();
                if (path.startsWith("/api/")) return empty();
                if (migrating) return new WebResourceResponse("text/html", "UTF-8", new ByteArrayInputStream("<!doctype html><meta charset='utf-8'><p>正在迁移本机记录…</p>".getBytes(StandardCharsets.UTF_8)));
                String asset = path.equals("/") ? "index.html" : path.substring(1);
                if (asset.contains("..")) return empty();
                try {
                    InputStream stream = getAssets().open(asset);
                    String mime = asset.endsWith(".js") ? "application/javascript" : asset.endsWith(".css") ? "text/css" : asset.endsWith(".html") ? "text/html" : asset.endsWith(".png") ? "image/png" : "application/json";
                    if (asset.equals("index.html")) {
                        String html = readText(stream);
                        html = html.replace("</head>", "<script src=\"./android-offline.js\"></script></head>");
                        stream = new ByteArrayInputStream(html.getBytes(StandardCharsets.UTF_8));
                    }
                    Map<String,String> headers = new HashMap<>();
                    headers.put("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self'; frame-src 'none'; object-src 'none'; base-uri 'none'");
                    return new WebResourceResponse(mime, "UTF-8", 200, "OK", headers, stream);
                } catch (IOException e) { return empty(); }
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                startActivityForResult(new Intent(Intent.ACTION_OPEN_DOCUMENT).setType("*/*").addCategory(Intent.CATEGORY_OPENABLE), IMPORT); return true;
            }
        });
    }
    private boolean sameOrigin(Uri uri, String origin) {
        Uri base = Uri.parse(origin);
        return Objects.equals(base.getScheme(), uri.getScheme()) && Objects.equals(base.getHost(), uri.getHost()) && base.getPort() == uri.getPort();
    }
    private WebResourceResponse empty() { return new WebResourceResponse("text/plain", "UTF-8", new ByteArrayInputStream(new byte[0])); }
    private String readText(InputStream stream) throws IOException {
        try (InputStream input = stream; ByteArrayOutputStream bytes = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[8192]; int count;
            while ((count = input.read(buffer)) != -1) {
                bytes.write(buffer, 0, count);
                if (bytes.size() > 16 * 1024 * 1024) throw new IOException("响应过大");
            }
            return new String(bytes.toByteArray(), StandardCharsets.UTF_8);
        }
    }
    private void deliver(String id, JSONObject result) {
        runOnUiThread(() -> {
            if (web != null && !isFinishing()) web.evaluateJavascript("window.LeavesAndroidNetwork?.resolve(" + JSONObject.quote(id) + "," + result + ")", null);
        });
    }
    private class AppBridge {
        @JavascriptInterface public void showUpdates() { runOnUiThread(() -> updater.showSettings()); }
        @JavascriptInterface public String legacyData() { return getPreferences(0).getString("legacyData", "null"); }
        @JavascriptInterface public String legacyServer() { return getPreferences(0).getString("server", ""); }
        @JavascriptInterface public void finishMigration() { getPreferences(0).edit().remove("legacyData").apply(); }
        @JavascriptInterface public void cancelRequest(String id) {
            cancelled.add(id); HttpURLConnection connection = connections.get(id); if (connection != null) connection.disconnect();
        }
        @JavascriptInterface public void request(String id, String address, String method, String body, String headers) {
            network.execute(() -> {
                JSONObject result = new JSONObject(); HttpURLConnection connection = null;
                try {
                    Uri uri = Uri.parse(address);
                    Set<String> paths = new HashSet<>(Arrays.asList("/api/auth/me", "/api/auth/login", "/api/auth/register", "/api/auth/logout", "/api/data/trips", "/api/12306/search-stations", "/api/12306/train-route", "/api/12306/train-no", "/api/12306/query-transfer", "/api/12306/current-time"));
                    if (!("https".equals(uri.getScheme()) || "http".equals(uri.getScheme())) || uri.getHost() == null || uri.getUserInfo() != null || !paths.contains(uri.getPath()) || !Arrays.asList("GET", "POST", "PUT").contains(method) || body.length() > 2 * 1024 * 1024) throw new IOException("同步地址或请求无效");
                    if (cancelled.contains(id)) throw new IOException("已取消");
                    connection = (HttpURLConnection) new URL(address).openConnection();
                    connections.put(id, connection);
                    connection.setInstanceFollowRedirects(false); connection.setConnectTimeout(15000); connection.setReadTimeout(15000); connection.setRequestMethod(method);
                    connection.setRequestProperty("Accept", "application/json");
                    String cookie = CookieManager.getInstance().getCookie(address);
                    if (cookie != null) connection.setRequestProperty("Cookie", cookie);
                    JSONObject requestedHeaders = new JSONObject(headers);
                    for (String name : Arrays.asList("Content-Type", "If-Match")) if (requestedHeaders.has(name)) connection.setRequestProperty(name, requestedHeaders.getString(name));
                    if (!"GET".equals(method)) {
                        connection.setDoOutput(true);
                        try (OutputStream out = connection.getOutputStream()) { out.write(body.getBytes(StandardCharsets.UTF_8)); }
                    }
                    if (cancelled.contains(id)) throw new IOException("已取消");
                    int code = connection.getResponseCode();
                    for (Map.Entry<String,List<String>> header : connection.getHeaderFields().entrySet()) {
                        if ("Set-Cookie".equalsIgnoreCase(header.getKey())) for (String value : header.getValue()) {
                            CountDownLatch latch = new CountDownLatch(1);
                            runOnUiThread(() -> CookieManager.getInstance().setCookie(address, value, success -> latch.countDown()));
                            if (!latch.await(5, TimeUnit.SECONDS)) throw new IOException("保存同步会话超时");
                        }
                    }
                    JSONObject responseHeaders = new JSONObject();
                    if (connection.getHeaderField("ETag") != null) responseHeaders.put("ETag", connection.getHeaderField("ETag"));
                    result.put("status", code).put("headers", responseHeaders);
                    InputStream input = code >= 400 ? connection.getErrorStream() : connection.getInputStream();
                    result.put("body", input == null ? "" : readText(input));
                } catch (Exception e) {
                    try { result.put("error", "无法同步：" + e.getMessage()); } catch (JSONException ignored) { }
                } finally {
                    connections.remove(id); cancelled.remove(id);
                    if (connection != null) connection.disconnect();
                }
                deliver(id, result);
            });
        }
        @JavascriptInterface public void exportJson(String text, String filename) {
            if (text.length() > 16 * 1024 * 1024) return;
            runOnUiThread(() -> {
                if (pendingExport != null) return;
                pendingExport = text;
                Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT).setType("application/json").addCategory(Intent.CATEGORY_OPENABLE);
                intent.putExtra(Intent.EXTRA_TITLE, filename.replaceAll("[^a-zA-Z0-9._-]", "_")); startActivityForResult(intent, EXPORT);
            });
        }
    }
    @Override protected void onActivityResult(int request, int result, Intent data) {
        super.onActivityResult(request, result, data);
        updater.onActivityResult(request);
        if (request == IMPORT && fileCallback != null) {
            fileCallback.onReceiveValue(result == RESULT_OK && data != null ? new Uri[]{data.getData()} : null); fileCallback = null;
        }
        if (request == EXPORT) {
            if (result == RESULT_OK && data != null && pendingExport != null) {
                try (OutputStream out = getContentResolver().openOutputStream(data.getData())) {
                    out.write(pendingExport.getBytes(StandardCharsets.UTF_8)); Toast.makeText(this, "备份已导出", Toast.LENGTH_SHORT).show();
                } catch (IOException e) { Toast.makeText(this, "导出失败，请重试", Toast.LENGTH_LONG).show(); }
            }
            pendingExport = null;
        }
    }
    @Override protected void onPause() { super.onPause(); CookieManager.getInstance().flush(); }
    @Override protected void onResume() { super.onResume(); if (updater != null) updater.check(false); }
    @Override protected void onDestroy() {
        if (updater != null) updater.close();
        connections.values().forEach(HttpURLConnection::disconnect); network.shutdownNow();
        if (fileCallback != null) fileCallback.onReceiveValue(null);
        if (web != null) { web.removeJavascriptInterface("LeavesAndroid"); web.destroy(); web = null; }
        super.onDestroy();
    }
    @Override public void onBackPressed() {
        if (web == null) { finish(); return; }
        web.evaluateJavascript("(()=>{const d=document.querySelector('dialog[open]');if(d){if(d.id==='androidSyncDialog'){if(d.dispatchEvent(new Event('cancel',{cancelable:true})))d.close();return true;}document.querySelector('#pauseEditor')?.click();if(d.open)d.close();return true;}return false;})()", value -> { if (!"true".equals(value)) finish(); });
    }
}

