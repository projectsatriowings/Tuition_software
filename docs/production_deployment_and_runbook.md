# TuitionOS — Production Deployment Guide & Disaster Recovery Runbook

## 1. Environment Variables Configuration

The system uses layered configuration with strict isolation between development, staging, and production.
**Rule:** Never commit `.env` or production credentials to Git. Use environment secret injection (e.g. AWS Secrets Manager, Doppler, Vault, or Cloud Run Environment Variables).

### Required Production Environment Variables

| Variable | Description | Production Requirement / Example |
|---|---|---|
| `NODE_ENV` | Runtime environment mode | `production` |
| `PORT` | API server listen port | `5000` or assigned container port |
| `HOST` | Bind host address | `0.0.0.0` |
| `DATABASE_URL` | Neon PostgreSQL pooled connection string | `postgresql://user:pass@ep-xyz-pooler.us-east-1.aws.neon.tech/tuitionos?sslmode=require&pgbouncer=true` |
| `DIRECT_URL` | Non-pooled connection string (for migrations) | `postgresql://user:pass@ep-xyz.us-east-1.aws.neon.tech/tuitionos?sslmode=require` |
| `JWT_SECRET` | Primary JWT signing secret | 64+ char random hex/base64 string (`openssl rand -hex 32`) |
| `JWT_EXPIRES_IN` | Access token lifespan | `7d` |
| `REFRESH_TOKEN_SECRET` | Refresh token signing secret | Distinct 64+ char random hex string |
| `REFRESH_TOKEN_EXPIRES_IN` | Refresh token lifespan | `30d` |
| `API_BASE_URL` | Public HTTPS backend URL | `https://api.tuitionos.com/api` |
| `CORS_ORIGIN` | Allowed client origins | `https://app.tuitionos.com,https://admin.tuitionos.com` |
| `STORAGE_DRIVER` | File storage engine | `s3` (or `local` with persistent volume mount) |
| `STORAGE_LOCAL_PATH` | Local file uploads directory | `/var/data/tuitionos/uploads` |
| `SMS_PROVIDER` | Active SMS provider | `fast2sms` or `twilio` (defaults to `mock` in dev) |
| `FAST2SMS_API_KEY` | Fast2SMS Gateway Authorization Key | Required if `SMS_PROVIDER=fast2sms` |
| `FAST2SMS_SENDER_ID` | Approved DLT 6-character Header | e.g. `TUINOS` |
| `TWILIO_ACCOUNT_SID` | Twilio Account SID | Required if `SMS_PROVIDER=twilio` |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token | Required if `SMS_PROVIDER=twilio` |
| `TWILIO_FROM_NUMBER` | Twilio registered phone number | e.g. `+1234567890` |

---

## 2. Neon Serverless PostgreSQL Backup & Point-in-Time Restore (PITR)

Neon PostgreSQL natively provides automated branch snapshots, continuous Write-Ahead Log (WAL) archiving, and point-in-time recovery (PITR) up to 7–30 days depending on plan.

### 2.1 Automated Snapshots via Neon CLI
To create an explicit pre-deployment database snapshot before applying schema changes:
```bash
# Install Neon CLI if not already present
npm install -g neonctl

# Authenticate with Neon API token
neonctl auth

# Create an instant point-in-time branch snapshot
neonctl branches create --project-id <project-id> --name pre-deploy-snapshot-$(date +%Y%m%d%H%M%S)
```

### 2.2 Logical SQL Backup via `pg_dump`
To create a portable off-site backup:
```bash
pg_dump "$DATABASE_URL" \
  --format=custom \
  --no-owner \
  --no-privileges \
  --file="tuitionos_backup_$(date +%Y%m%d_%H%M%S).dump"
```

### 2.3 Documented Restore Procedure
**CRITICAL SAFETY RULE:** Never restore over the active live production database. Always restore to an isolated target branch or staging database first.

1. **Restore to Staging Branch:**
   ```bash
   # Create a staging branch from the desired point in time or snapshot
   neonctl branches create --project-id <project-id> --name staging-restore-test --parent pre-deploy-snapshot-20261029

   # Or restore from pg_dump into a fresh staging database:
   pg_restore --clean --if-exists --no-owner --dbname="$STAGING_DATABASE_URL" "tuitionos_backup_20261029.dump"
   ```
2. **Validate Integrity in Staging:**
   ```bash
   # Run the regression and security audit test suites against the staging DB
   DATABASE_URL="$STAGING_DATABASE_URL" node server/scripts/regression_test_suite.cjs
   DATABASE_URL="$STAGING_DATABASE_URL" node server/scripts/test-phase6-extended-security.cjs
   ```
3. **Switch Traffic (if disaster recovery is warranted):**
   Update `DATABASE_URL` in container environment secrets to the validated branch connection string and restart API pods.

---

## 3. Database Schema Migration Strategy

1. **Strictly Non-Destructive Migrations**:
   - Use `prisma migrate deploy` in production CI/CD pipelines.
   - Never use `prisma migrate reset` or `prisma db push --force-reset` in production.
2. **Backward-Compatible Schema Evolutions**:
   - Add new columns as optional or with default values.
   - Deprecate old fields in phase 1, update code in phase 2, drop old fields in phase 3.

---

## 4. Mobile Android Build & Release Configuration

### 4.1 Production Signing Configuration
Generate a private release keystore (do not commit to Git):
```bash
keytool -genkeypair -v -storetype PKCS12 -keystore tuitionos-release.keystore \
  -alias tuitionos-key -keyalg RSA -keysize 2048 -validity 10000
```
Place in secure CI build runner and configure environment variables:
- `TUITION_KEYSTORE_PASSWORD`
- `TUITION_KEY_ALIAS`
- `TUITION_KEY_PASSWORD`

### 4.2 Building Production AAB (Android App Bundle)
```bash
cd apps/mobile
EXPO_PUBLIC_API_URL="https://api.tuitionos.com/api" npx eas-cli build --platform android --profile production
```
