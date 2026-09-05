# Bees360 pre-hosting checklist

Use this checklist for the first production deployment and every release that changes the database.

## Server and secrets

1. Point the web server document root to the application's `public` directory.
2. Enable HTTPS and redirect HTTP traffic to HTTPS.
3. Copy `.env.production.example` to the server as `.env`, then replace every blank value with a production value.
4. Generate `APP_KEY` on the server with `php artisan key:generate`.
5. Use a dedicated database account with a long, unique password. Do not use the MySQL `root` account for the application.
6. Set the final HTTPS domain in `APP_URL`. Production host validation uses this value.
7. Set `APP_DEBUG=false`, `SESSION_ENCRYPT=true`, and `SESSION_SECURE_COOKIE=true`.
8. Configure working SMTP credentials so password reset emails can be delivered.
9. Set a unique initial Operations password, seed the first account once, then remove `BEES360_OPERATIONS_PASSWORD` from the runtime environment after the account exists.

## Build and release

Run these commands from the release directory:

```bash
composer install --no-dev --optimize-autoloader
npm ci
npm run build
php artisan migrate --force
php artisan optimize
php artisan storage:link
```

The application stores new profile images on the private local disk. The storage link is needed only for other public Laravel assets and must never expose `storage/app/private`.

Configure a supervised queue worker when queued jobs are enabled:

```bash
php artisan queue:work --sleep=3 --tries=3 --max-time=3600
```

Give the web server write access only to `storage` and `bootstrap/cache`. Keep `.env`, database backups, source files, and private storage unavailable over HTTP.

## Data protection

1. Create an encrypted database backup before running migrations.
2. Restore that backup into a temporary database and compare important table counts before deleting the temporary database.
3. Schedule encrypted daily backups and test a restore regularly.
4. Restrict MySQL to the application server or a private network. Do not expose port 3306 to the public internet.
5. Retain application and web-server security logs, and alert on repeated failed logins and server errors.

## Release verification

```bash
php artisan test --compact
npx tsc --noEmit
npm run build
composer audit --locked
npm audit --omit=dev
```

Verify `/up`, sign in with each role, confirm processors receive only their own dashboard and QA data, confirm staff role restrictions, import a small workbook, and verify account deactivation logs out an existing session.

