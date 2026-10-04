module.exports = {
  apps: [
    {
      name: "cybotz-web",
      script: "dist/index.js",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      env: {
        NODE_ENV: "production",
        PORT: 5000
      }
    },
    {
      name: "cybotz-worker",
      script: "npx",
      args: "tsx server/worker.ts",
      autorestart: true,
      watch: false,
      max_memory_restart: "300M",
      env: {
        NODE_ENV: "production"
      }
    },
    {
      name: "cybotz-wa-runner",
      script: "npx",
      args: "tsx server/run-whatsapp.ts",
      autorestart: true,
      watch: false,
      max_memory_restart: "400M",
      env: {
        NODE_ENV: "production"
      }
    }
  ]
};
