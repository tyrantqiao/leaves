package app.leaves.mobile;

import java.io.IOException;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Validate a resume response before appending any bytes to the saved file. */
final class UpdateDownloadPolicy {
    static long offset(int code, String range, long requested, long size, long contentLength) throws IOException {
        if (code == 200) {
            if (contentLength >= 0 && contentLength != size) throw new IOException("下载文件大小不匹配");
            return 0; // Server ignored Range: replace the partial file instead of appending.
        }
        if (code != 206 || requested <= 0) throw new IOException("GitHub HTTP " + code);
        Matcher match = Pattern.compile("bytes ([0-9]+)-([0-9]+)/([0-9]+)").matcher(range == null ? "" : range);
        try {
            if (match.matches()) {
                long start = Long.parseLong(match.group(1)), end = Long.parseLong(match.group(2)), total = Long.parseLong(match.group(3));
                if (start == requested && total == size && end == size - 1 && start <= end
                    && (contentLength < 0 || contentLength == end - start + 1)) return requested;
            }
        } catch (NumberFormatException ignored) {}
        throw new IOException("续传响应范围无效");
    }
}
