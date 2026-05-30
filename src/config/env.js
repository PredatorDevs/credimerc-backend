const dotenv = require('dotenv');

dotenv.config();

function asNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

module.exports = {
  port: asNumber(process.env.PORT, 3000),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET || '',
  jwtIssuer: process.env.JWT_ISSUER || 'credimerc-api',
  jwtAudience: process.env.JWT_AUDIENCE || 'credimerc-app',
  jwt: {
    accessExpiresInMinutes: asNumber(process.env.JWT_ACCESS_EXPIRES_IN_MINUTES, 15),
    refreshExpiresInDays: asNumber(process.env.JWT_REFRESH_EXPIRES_IN_DAYS, 30)
  },
  security: {
    bcryptSaltRounds: asNumber(process.env.BCRYPT_SALT_ROUNDS, 10)
  },
  mysql: {
    host: process.env.MYSQL_HOST || 'localhost',
    port: asNumber(process.env.MYSQL_PORT, 3306),
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'credimerc'
  },
  aws: {
    region: process.env.AWS_REGION || 'us-east-1',
    bucket: process.env.AWS_S3_BUCKET || '',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    presignedUrlTtlSeconds: asNumber(process.env.AWS_S3_PRESIGNED_URL_TTL_SECONDS, 300)
  },
  files: {
    maxProfileBytes: asNumber(process.env.FILES_MAX_PROFILE_MB, 3) * 1024 * 1024,
    maxIdBytes: asNumber(process.env.FILES_MAX_ID_MB, 6) * 1024 * 1024,
    maxSelfieBytes: asNumber(process.env.FILES_MAX_SELFIE_MB, 4) * 1024 * 1024,
    maxSupportBytes: asNumber(process.env.FILES_MAX_SUPPORT_MB, 10) * 1024 * 1024
  }
};
