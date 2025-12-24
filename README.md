prisma generate:
npx prisma generate --schema=apps/identity/prisma/schema.prisma
npx prisma generate --schema=apps/booking/prisma/schema.prisma
npx prisma generate --schema=apps/payment/prisma/schema.prisma
npx prisma generate --schema=apps/trip/prisma/schema.prisma
npx prisma generate --schema=apps/support/prisma/schema.prisma

migrate:
cd ....
npx prisma migrate dev --name <....>
eg. npx prisma migrate dev --name init_local

run all:
npm run start:all
