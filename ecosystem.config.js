module.exports = {
  apps: [
    {
      name: "tcredit",
      script: "npm",
      args: "start",
      env: {
        NODE_ENV: "production",
        PORT: 3000
      }
    }
  ]
};
