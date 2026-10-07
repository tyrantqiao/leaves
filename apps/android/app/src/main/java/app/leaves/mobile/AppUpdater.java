package app.leaves.mobile;

import android.app.*;
import android.content.*;
import android.content.pm.*;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import android.widget.*;
import org.json.*;
import java.io.*;
import java.net.*;
import java.security.MessageDigest;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicBoolean;

/** Optional foreground updater. Local trips and sync never depend on this service. */
public final class AppUpdater {
    private static final String REPO = "tyrantqiao/leaves";
    private static final String ASSET_PREFIX = "https://github.com/" + REPO + "/releases/download/";
    private static final int INSTALL_PERMISSION = 73;
    private final Activity activity;
    private final SharedPreferences prefs;
    private final ExecutorService worker = Executors.newSingleThreadExecutor();
    private final AtomicBoolean busy = new AtomicBoolean();
    private volatile boolean closed;
    private boolean permissionPending;
    private boolean startupChecked;
    private volatile HttpURLConnection active;
    private final File apk;

    public AppUpdater(Activity activity) {
        this.activity=activity; prefs=activity.getSharedPreferences("leaves-updates",0);
        apk=new File(activity.getCacheDir(),"leaves-update.apk");
    }
    private PackageInfo installed() throws PackageManager.NameNotFoundException {
        return activity.getPackageManager().getPackageInfo(activity.getPackageName(), Build.VERSION.SDK_INT>=28 ? PackageManager.GET_SIGNING_CERTIFICATES : PackageManager.GET_SIGNATURES);
    }
    private long version(PackageInfo info) { return Build.VERSION.SDK_INT>=28 ? info.getLongVersionCode() : info.versionCode; }
    public void showSettings() {
        String current;
        try {current=installed().versionName;} catch(Exception e) {current="未知";}
        CheckBox auto=new CheckBox(activity); auto.setText("自动检查并下载新版本"); auto.setChecked(prefs.getBoolean("auto",true));
        auto.setOnCheckedChangeListener((button,checked)->prefs.edit().putBoolean("auto",checked).apply());
        new AlertDialog.Builder(activity).setTitle("应用更新 · "+current).setMessage("更新来自 GitHub Release。启用自动更新后，每次启动应用时检查并下载；安装需要安卓系统确认，不影响本机使用。")
            .setView(auto).setPositiveButton("检查更新",(d,w)->check(true)).setNeutralButton("安装已下载更新",(d,w)->install()).setNegativeButton("关闭",null).show();
    }
    public void check(boolean manual) {
        if (closed || (!manual && (!prefs.getBoolean("auto",true) || startupChecked))) return;
        if (!busy.compareAndSet(false,true)) {if(manual)toast("正在检查或下载更新…");return;}
        // onResume also runs after settings and installer; check once per app startup.
        if (!manual) startupChecked = true;
        if(manual)toast("正在检查 GitHub 更新…");
        worker.execute(()->{
            try {
                // Public Release asset avoids GitHub's shared anonymous API rate limit.
                JSONObject metadata=json("https://github.com/"+REPO+"/releases/latest/download/leaves-android-update.json");
                String tag=metadata.getString("tag");
                if(!tag.matches("android-v[0-9]+\\.[0-9]+\\.[0-9]+"))throw new IOException("更新版本标签无效");
                validateMetadata(metadata,tag);
                if(metadata.getLong("versionCode")<=version(installed())) {if(manual)toast("当前已是最新版本");return;}
                if(prefs.getBoolean("auto",true))download(metadata);
                else ui(()->new AlertDialog.Builder(activity).setTitle("发现新版本 "+metadata.optString("versionName")).setMessage("可下载并覆盖更新，本机记录会保留。")
                    .setPositiveButton("下载更新",(d,w)->downloadLater(metadata)).setNegativeButton("稍后",null).show());
            }catch(Exception e){if(manual)toast("更新检查失败："+e.getMessage()+"，本机使用不受影响。");}
            finally{busy.set(false);}
        });
    }
    private void validateMetadata(JSONObject m,String tag) throws Exception {
        if(!activity.getPackageName().equals(m.getString("packageName")) || !tag.equals(m.getString("tag")) || m.getLong("versionCode")<1 || !m.getString("sha256").matches("[a-fA-F0-9]{64}")
            || m.getLong("size")<1 || m.getLong("size")>100*1024*1024L || !m.getString("apkUrl").equals(ASSET_PREFIX+tag+"/Leaves-Android.apk"))throw new IOException("更新清单无效");
    }
    private void downloadLater(JSONObject metadata) {
        if(!busy.compareAndSet(false,true))return;
        worker.execute(()->{try{download(metadata);}catch(Exception e){toast("更新下载失败："+e.getMessage());}finally{busy.set(false);}});
    }
    private void download(JSONObject m) throws Exception {
        File part=new File(activity.getCacheDir(),"leaves-update.part");
        try {
            toast("发现新版本，正在下载…");
            HttpURLConnection connection=connection(m.getString("apkUrl"));
            MessageDigest digest=MessageDigest.getInstance("SHA-256"); long total=0;
            try(InputStream input=connection.getInputStream();OutputStream output=new FileOutputStream(part)) {
                byte[] buffer=new byte[8192];int count;
                while((count=input.read(buffer))!=-1){if(closed)throw new IOException("已取消");total+=count;if(total>m.getLong("size"))throw new IOException("文件大小不匹配");digest.update(buffer,0,count);output.write(buffer,0,count);}
            }finally{connection.disconnect();active=null;}
            if(total!=m.getLong("size") || !hex(digest.digest()).equalsIgnoreCase(m.getString("sha256")))throw new IOException("文件校验失败");
            verifyPackage(part,m.getLong("versionCode"));
            if(apk.exists() && !apk.delete())throw new IOException("无法替换更新包");
            if(!part.renameTo(apk))throw new IOException("无法保存更新包");
            prefs.edit().putString("sha256",m.getString("sha256")).apply();
            ui(()->new AlertDialog.Builder(activity).setTitle("新版本已下载").setMessage("更新包已验证，安装后保留本机数据。")
                .setPositiveButton("安装更新",(d,w)->install()).setNegativeButton("稍后",null).show());
        } finally {if(part.exists())part.delete();}
    }
    private String hex(byte[] bytes) {StringBuilder result=new StringBuilder();for(byte b:bytes)result.append(String.format(Locale.ROOT,"%02x",b&255));return result.toString();}
    private String hash(File file) throws Exception {
        MessageDigest digest=MessageDigest.getInstance("SHA-256");
        try(InputStream input=new FileInputStream(file)){byte[] buffer=new byte[8192];int count;while((count=input.read(buffer))!=-1)digest.update(buffer,0,count);}
        return hex(digest.digest());
    }
    private Set<String> signers(PackageInfo info) {
        android.content.pm.Signature[] signatures=Build.VERSION.SDK_INT>=28 ? info.signingInfo.getApkContentsSigners() : info.signatures;
        Set<String> result=new HashSet<>();for(android.content.pm.Signature signature:signatures)result.add(signature.toCharsString());return result;
    }
    private void verifyPackage(File file,long expectedVersion) throws Exception {
        PackageInfo incoming=activity.getPackageManager().getPackageArchiveInfo(file.getAbsolutePath(),Build.VERSION.SDK_INT>=28 ? PackageManager.GET_SIGNING_CERTIFICATES : PackageManager.GET_SIGNATURES);
        PackageInfo current=installed();
        if(incoming==null || !activity.getPackageName().equals(incoming.packageName) || version(incoming)<=version(current) || (expectedVersion>0 && version(incoming)!=expectedVersion)
            || !signers(current).equals(signers(incoming)))throw new IOException("更新包版本、包名或签名不一致");
    }
    private void install() {
        if(!apk.exists()){toast("尚未下载新版本，请先检查更新");return;}
        try {
            if(!hash(apk).equalsIgnoreCase(prefs.getString("sha256","")))throw new IOException("缓存文件校验失败");
            verifyPackage(apk,0);
            if(!activity.getPackageManager().canRequestPackageInstalls()) {
                permissionPending=true;
                activity.startActivityForResult(new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,Uri.parse("package:"+activity.getPackageName())),INSTALL_PERMISSION);return;
            }
            Uri uri=Uri.parse("content://"+activity.getPackageName()+".updates/update.apk");
            Intent intent=new Intent(Intent.ACTION_VIEW).setDataAndType(uri,"application/vnd.android.package-archive").addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            activity.startActivity(intent);
        }catch(Exception e){toast("无法安装更新："+e.getMessage());}
    }
    public void onActivityResult(int request) {if(request==INSTALL_PERMISSION && permissionPending){permissionPending=false;if(activity.getPackageManager().canRequestPackageInstalls())install();else toast("未授予安装权限，更新包已保留");}}
    private HttpURLConnection connection(String address) throws Exception {
        for(int hop=0;hop<6;hop++) {
            URL url=new URL(address);String host=url.getHost();
            if(!"https".equals(url.getProtocol()) || !(host.equals("api.github.com") || host.equals("github.com") || host.equals("release-assets.githubusercontent.com") || host.equals("objects.githubusercontent.com")))throw new IOException("更新下载来源不受信任");
            HttpURLConnection connection=(HttpURLConnection)url.openConnection();active=connection;
            connection.setConnectTimeout(15000);connection.setReadTimeout(30000);connection.setInstanceFollowRedirects(false);connection.setRequestProperty("User-Agent","Leaves-Android");connection.setRequestProperty("Accept","application/json");
            int code=connection.getResponseCode();
            if(code>=300 && code<400){String next=connection.getHeaderField("Location");connection.disconnect();address=new URL(url,next).toString();continue;}
            if(code!=200){connection.disconnect();throw new IOException("GitHub HTTP "+code);}
            return connection;
        }
        throw new IOException("重定向过多");
    }
    private JSONObject json(String address) throws Exception {
        HttpURLConnection connection=connection(address);
        try(InputStream input=connection.getInputStream();ByteArrayOutputStream bytes=new ByteArrayOutputStream()) {
            byte[] buffer=new byte[8192];int count;
            while((count=input.read(buffer))!=-1){bytes.write(buffer,0,count);if(bytes.size()>1024*1024)throw new IOException("清单过大");}
            return new JSONObject(bytes.toString("UTF-8"));
        }finally{connection.disconnect();active=null;}
    }
    private void ui(Runnable action){activity.runOnUiThread(()->{if(!closed && !activity.isFinishing() && !activity.isDestroyed())action.run();});}
    private void toast(String message){ui(()->Toast.makeText(activity,message,Toast.LENGTH_LONG).show());}
    public void close(){closed=true;if(active!=null)active.disconnect();worker.shutdownNow();}
}

