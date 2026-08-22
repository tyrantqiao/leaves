const path = require("path");

module.exports = {
  apps: [
    {
      name: "leaves",
      script: "apps/desktop-prototype/dev-server.js",
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        LEAVES_HOST: "127.0.0.1",
        LEAVES_PORT: "4173",
        LEAVES_DATA_DIR:
          process.env.LEAVES_DATA_DIR || path.join(__dirname, "apps/desktop-prototype/data"),
        LEAVES_READ_ONLY: process.env.LEAVES_READ_ONLY || "false",
        LEAVES_CORS_ORIGIN: process.env.LEAVES_CORS_ORIGIN || ""
      }
    }
  ]
};
