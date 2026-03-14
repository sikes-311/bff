export default () => ({
  port: parseInt(process.env.PORT ?? '3001', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  jwt: {
    secret: process.env.JWT_SECRET ?? 'default-secret',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '1h',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  },
  services: {
    serviceA: { url: process.env.SERVICE_A_URL ?? 'http://localhost:4001' },
    serviceB: { url: process.env.SERVICE_B_URL ?? 'http://localhost:4002' },
  },
  logLevel: process.env.LOG_LEVEL ?? 'debug',
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:3000',
});
