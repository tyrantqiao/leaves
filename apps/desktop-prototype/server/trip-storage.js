const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const writes = new Map();

function revision(trips) {
  return `"${crypto.createHash("sha256").update(JSON.stringify(trips)).digest("hex")}"`;
}

async function readTrips(file) {
  let content;
  try { content = await fs.readFile(file, "utf8"); }
  catch (error) { if (error.code !== "ENOENT") throw error; content = "[]"; }
  const trips = JSON.parse(content);
  if (!Array.isArray(trips)) throw new Error("Invalid trip file");
  return { trips, etag: revision(trips) };
}

function writeTrips(file, trips, expectedRevision) {
  const pending = (writes.get(file) || Promise.resolve()).catch(() => {}).then(async () => {
    const current = await readTrips(file);
    if (expectedRevision && expectedRevision !== current.etag) {
      const error = new Error("行程已更新，请重新同步后再保存");
      error.status = 412;
      throw error;
    }
    await fs.mkdir(path.dirname(file), { recursive: true });
    const temporary = `${file}.${crypto.randomUUID()}.tmp`;
    try {
      await fs.writeFile(temporary, JSON.stringify(trips, null, 2));
      await fs.rename(temporary, file);
    } finally {
      await fs.unlink(temporary).catch(() => {});
    }
    return { etag: revision(trips) };
  });
  writes.set(file, pending);
  const clear = () => { if (writes.get(file) === pending) writes.delete(file); };
  pending.then(clear, clear);
  return pending;
}

module.exports = { readTrips, writeTrips };
