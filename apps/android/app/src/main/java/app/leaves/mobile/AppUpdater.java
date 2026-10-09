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
    private final File part;
    private volatile JSONObject release;
    private volatile boolean paused;
    private volatile String status = "尚未检查更新";
    private volatile long downloaded;
    private TextView statusView, releaseView;
    private ProgressBar progressView;
    private Button checkButton, downloadButton, pauseButton, installButton;
    private AlertDialog settingsDialog;
    private boolean ready(JSONObject metadata) {
        return metadata!=null && apk.isFile() && metadata.optString("sha256").equalsIgnoreCase(prefs.getString("sha256",""));
    }

    public AppUpdater(Activity activity) {
        this.activity=activity; prefs=activity.getSharedPreferences("leaves-updates",0);
        apk=new File(activity.getCacheDir(),"leaves-update.apk");
        part=new File(activity.getFilesDir(),"leaves-update.part");
        try {
            JSONObject saved=new JSONObject(prefs.getString("pendingRelease","{}"));
            validateMetadata(saved,saved.getString("tag"));
            if(saved.getLong("versionCode")>version(installed())) {
                release=saved; downloaded=partialIdentity(saved).equals(prefs.getString("partialIdentity",""))?part.length():0;
                status=downloaded>0 ? "下载已暂停，可以继续下载" : "发现新版本，可以下载";
                if(ready(saved)){downloaded=saved.getLong("size");status="新版已下载，可以安装";}
            }
        } catch(Exception ignored) {}
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
        if(settingsDialog!=null && settingsDialog.isShowing())return;
        LinearLayout layout=new LinearLayout(activity);layout.setOrientation(LinearLayout.VERTICAL);
        int padding=(int)(20*activity.getResources().getDisplayMetrics().density);layout.setPadding(padding,padding,padding,padding);
        statusView=new TextView(activity);statusView.setAccessibilityLiveRegion(android.view.View.ACCESSIBILITY_LIVE_REGION_POLITE);layout.addView(statusView);
        releaseView=new TextView(activity);layout.addView(releaseView);
        progressView=new ProgressBar(activity,null,android.R.attr.progressBarStyleHorizontal);progressView.setMax(100);layout.addView(progressView);
        checkButton=button(layout,"检查更新",()->check(true));
        downloadButton=button(layout,"下载新版",()->{if(release!=null)downloadLater(release);});
        pauseButton=button(layout,"暂停下载",()->{paused=true;HttpURLConnection connection=active;if(connection!=null)connection.disconnect();});
        installButton=button(layout,"安装更新",this::install);layout.addView(auto);
        TextView hint=new TextView(activity);hint.setText("更新来自 GitHub Release。下载中断后保留进度，重新打开应用可继续。安装需系统确认，覆盖更新保留本机记录。");layout.addView(hint);
        ScrollView scroll=new ScrollView(activity);scroll.addView(layout);
        settingsDialog=new AlertDialog.Builder(activity).setTitle("应用更新 · "+current).setView(scroll).setNegativeButton("关闭",null).create();
        settingsDialog.show();refresh();
    }
    private Button button(LinearLayout layout,String label,Runnable action) {
        Button button=new Button(activity);button.setText(label);button.setOnClickListener(view->action.run());layout.addView(button);return button;
    }
    private void refresh() {ui(()->{
        if(settingsDialog==null || !settingsDialog.isShowing())return;
        statusView.setText(status);JSONObject m=release;long size=m==null?0:m.optLong("size");
        releaseView.setText(m==null ? "" : "新版 "+m.optString("versionName")+"\n"+String.format(Locale.CHINA,"%.2f / %.2f MB",downloaded/1048576.0,size/1048576.0)+"\n"+m.optString("notes",""));
        progressView.setProgress(size>0?(int)(downloaded*100/size):0);
        checkButton.setEnabled(!busy.get());downloadButton.setEnabled(!busy.get() && m!=null && !ready(m));
        downloadButton.setText(downloaded>0 ? "继续下载" : "下载新版");
        pauseButton.setEnabled(busy.get() && status.startsWith("正在下载"));installButton.setEnabled(!busy.get() && apk.isFile());
    });}
    public void check(boolean manual) {
        if (closed || (!manual && (!prefs.getBoolean("auto",true) || startupChecked))) return;
        if (!busy.compareAndSet(false,true)) {if(manual)toast("正在检查或下载更新…");return;}
        status="正在检查更新…";refresh();
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
                if(metadata.getLong("versionCode")<=version(installed())) {status="当前已是最新版本";if(manual)toast(status);return;}
                release=metadata;status="发现新版本，可以下载";
                if(!prefs.edit().putString("pendingRelease",metadata.toString()).commit())throw new IOException("无法保存更新信息");
                if(ready(metadata)){downloaded=metadata.getLong("size");status="新版已下载，可以安装";return;}
                downloaded=partialIdentity(metadata).equals(prefs.getString("partialIdentity",""))?part.length():0;
                if(prefs.getBoolean("auto",true))download(metadata);
                else ui(()->new AlertDialog.Builder(activity).setTitle("发现新版本 "+metadata.optString("versionName")).setMessage("可下载并覆盖更新，本机记录会保留。")
                    .setPositiveButton("下载更新",(d,w)->downloadLater(metadata)).setNegativeButton("稍后",null).show());
            }catch(Exception e){status=paused?"下载已暂停，可以继续下载":"检查或下载失败，可重试："+e.getMessage();if(manual)toast(status+"，本机使用不受影响。");}
            finally{busy.set(false);refresh();}
        });
    }
    private void validateMetadata(JSONObject m,String tag) throws Exception {
        if(!tag.matches("android-v[0-9]+\\.[0-9]+\\.[0-9]+") || !activity.getPackageName().equals(m.getString("packageName")) || !tag.equals(m.getString("tag")) || m.getLong("versionCode")<1 || !m.getString("sha256").matches("[a-fA-F0-9]{64}")
            || m.getLong("size")<1 || m.getLong("size")>100*1024*1024L || !m.getString("apkUrl").equals(ASSET_PREFIX+tag+"/Leaves-Android.apk"))throw new IOException("更新清单无效");
    }
    private void downloadLater(JSONObject metadata) {
        if(closed)return;
        if(!busy.compareAndSet(false,true))return;
        worker.execute(()->{try{download(metadata);}catch(Exception e){status=paused?"下载已暂停，可以继续下载":"下载中断，点击继续下载："+e.getMessage();toast(status);}finally{busy.set(false);refresh();}});
    }
    private void download(JSONObject m) throws Exception {
        paused=false;
        String identity=partialIdentity(m);
        if(!identity.equals(prefs.getString("partialIdentity","")) || part.length()>m.getLong("size")) {
            if(part.exists() && !part.delete())throw new IOException("无法重置临时更新包");
        }
        if(!prefs.edit().putString("partialIdentity",identity).putString("pendingRelease",m.toString()).commit())throw new IOException("无法保存下载状态");
        release=m;downloaded=part.length();status="正在下载新版…";refresh();
        try {
            long total=part.length();
            if(total<m.getLong("size")) {
            HttpURLConnection connection=connection(m.getString("apkUrl"),total);
            try {
                total=UpdateDownloadPolicy.offset(connection.getResponseCode(),connection.getHeaderField("Content-Range"),total,m.getLong("size"),connection.getContentLengthLong());
            } catch(Exception invalid) {connection.disconnect();active=null;throw invalid;}
            downloaded=total;
            try(InputStream input=connection.getInputStream();OutputStream output=new FileOutputStream(part,total>0)) {
                byte[] buffer=new byte[8192];int count;
                int last=-1;
                while((count=input.read(buffer))!=-1){if(closed || paused)throw new IOException("已暂停");total+=count;if(total>m.getLong("size"))throw new IOException("文件大小不匹配");output.write(buffer,0,count);downloaded=total;int percent=(int)(total*100/m.getLong("size"));if(percent!=last){last=percent;refresh();}}
            }finally{connection.disconnect();active=null;}
            }
            if(paused || closed)throw new IOException("已暂停");
            if(total!=m.getLong("size"))throw new IOException("下载尚未完成");
            status="正在校验更新包…";refresh();
            try {
                if(!hash(part).equalsIgnoreCase(m.getString("sha256")))throw new IOException("文件校验失败，请重新下载");
                verifyPackage(part,m.getLong("versionCode"));
            } catch(Exception invalid) {part.delete();downloaded=0;throw invalid;}
            if(apk.exists() && !apk.delete())throw new IOException("无法替换更新包");
            if(!part.renameTo(apk))throw new IOException("无法保存更新包");
            if(!prefs.edit().putString("sha256",m.getString("sha256")).commit())throw new IOException("无法保存更新包校验状态");
            status="新版本已下载并校验，可以安装";
            ui(()->new AlertDialog.Builder(activity).setTitle("新版本已下载").setMessage("更新包已验证，安装后保留本机数据。")
                .setPositiveButton("安装更新",(d,w)->install()).setNegativeButton("稍后",null).show());
        } catch(Exception error) {downloaded=part.length();status=paused?"下载已暂停，可以继续下载":"下载中断，可继续下载："+error.getMessage();throw error;}
    }
    private String partialIdentity(JSONObject m) throws JSONException {
        return m.getString("sha256")+":"+m.getLong("size")+":"+m.getString("apkUrl");
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
        return connection(address,0);
    }
    private HttpURLConnection connection(String address,long offset) throws Exception {
        for(int hop=0;hop<6;hop++) {
            if(closed || (offset>0 && paused))throw new IOException("已暂停");
            URL url=new URL(address);String host=url.getHost();
            if(!"https".equals(url.getProtocol()) || !(host.equals("api.github.com") || host.equals("github.com") || host.equals("release-assets.githubusercontent.com") || host.equals("objects.githubusercontent.com")))throw new IOException("更新下载来源不受信任");
            HttpURLConnection connection=(HttpURLConnection)url.openConnection();active=connection;
            connection.setConnectTimeout(15000);connection.setReadTimeout(30000);connection.setInstanceFollowRedirects(false);connection.setRequestProperty("User-Agent","Leaves-Android");connection.setRequestProperty("Accept","application/json");
            connection.setRequestProperty("Accept-Encoding","identity");
            if(offset>0)connection.setRequestProperty("Range","bytes="+offset+"-");
            int code=connection.getResponseCode();
            if(code==301 || code==302 || code==303 || code==307 || code==308){String next=connection.getHeaderField("Location");connection.disconnect();address=new URL(url,next).toString();continue;}
            if(code==416 && offset>0){connection.disconnect();return connection(address,0);}
            if(code!=200 && !(code==206 && offset>0)){connection.disconnect();throw new IOException("GitHub HTTP "+code);}
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

