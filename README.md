# Development Guide

## Generate Prisma Client

- Per service

```
npx prisma generate --schema=apps/identity/prisma/schema.prisma
npx prisma generate --schema=apps/booking/prisma/schema.prisma
npx prisma generate --schema=apps/payment/prisma/schema.prisma
npx prisma generate --schema=apps/trip/prisma/schema.prisma
npx prisma generate --schema=apps/support/prisma/schema.prisma
```

- Or generate all Prisma clients at once

```
npm run prisma:generate:all
```

## Database Migration

- Navigate to the target service directory before running migration

```
cd apps/<service-name>
```

- Run Prisma migration

```
npx prisma migrate dev --name <migration_name>
```

Example

```
npx prisma migrate dev --name init_local
```

## Run All Services

```
npm run start:all
```
