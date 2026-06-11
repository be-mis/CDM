# CMD Backend (Express)

Run:

```
cd backend
npm install
cp .env.example .env
# edit .env then:
npm run dev
```

API endpoints:
- POST `/api/auth/register` { name, email, password }
- POST `/api/auth/login` { email, password }
- POST `/api/upload` (auth required, multipart form `file`)

Database migrations:

Run migrations to create `cash_disbursement` database and tables:

```
cd backend
npm run migrate
```

The migrate script executes SQL files in `backend/sql/migrations` in filename order.
