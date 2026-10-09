package app.leaves.mobile;

import java.io.IOException;

public final class UpdateDownloadPolicyTest {
    private static int checks;
    private static void check(int code, String range, long offset, long size, long length, long expected) throws Exception {
        long actual = UpdateDownloadPolicy.offset(code, range, offset, size, length);
        if (actual != expected) throw new AssertionError("Unexpected offset: " + actual);
        checks++;
    }
    private static void reject(int code, String range, long offset, long size, long length) throws Exception {
        try { UpdateDownloadPolicy.offset(code, range, offset, size, length); }
        catch (IOException expected) { checks++; return; }
        throw new AssertionError("Invalid response accepted: " + range);
    }
    public static void main(String[] args) throws Exception {
        check(206, "bytes 40-99/100", 40, 100, 60, 40);
        check(206, "bytes 40-99/100", 40, 100, -1, 40);
        check(200, null, 40, 100, 100, 0);
        check(200, null, 0, 100, -1, 0);
        reject(200, null, 40, 100, 60);
        reject(206, "bytes 0-99/100", 40, 100, 100);
        reject(206, "bytes 40-99/101", 40, 100, 60);
        reject(206, "bytes 40-98/100", 40, 100, 59);
        reject(206, "bytes 40-99/100", 40, 100, 59);
        reject(206, null, 40, 100, 60);
        reject(206, "bytes 0-99/100", 0, 100, 100);
        reject(206, "bytes 999999999999999999999-99/100", 40, 100, 60);
        reject(416, "bytes */100", 40, 100, 0);
        System.out.println("PASS " + checks + " resume response checks");
    }
}
