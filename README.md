# NextGen Learn — Paid Video Course Platform (Cloudflare D1 Stack)

NextGen Learn is a high-performance online video course marketplace and learning management system (LMS). The platform allows students to browse courses, preview free lessons, complete secure purchases via Razorpay, and stream protected high-definition video through Cloudflare Stream. Administrators manage the full course catalog, curriculum hierarchy (chapters and lessons), direct video uploads, student enrollments, and payment audit logs.

---

## 1. System Architecture: Cloudflare Edge Stack

The system is designed for modern, serverless edge deployment:

```
[GitHub Repository]
       │
       ├───> [Cloudflare Pages] ─── Frontend (React 19 + TypeScript + Tailwind CSS)
       │
       ├───> [Cloudflare Workers / Pages Functions] ─── Backend APIs (Edge TypeScript)
       │
       ├───> [Cloudflare D1] ─── Serverless SQL Database (SQLite at the Edge)
       │
       ├───> [Cloudflare Stream] ─── Adaptive Bitrate Video Hosting & DRM Playback
       │
       └───> [Razorpay] ─── Payments & Cryptographic HMAC Verification
```

### Directory Structure
```
├── client (React 19 + TypeScript + Vite + Tailwind CSS)
│   ├── src/components/       # Reusable UI widgets (Navbar, VideoPlayer, RazorpayModal)
│   ├── src/context/          # AuthContext (JWT & roles), ToastContext
│   ├── src/pages/            # Home, Courses, Details, Login, Register, MyCourses, Watch, Admin
│   ├── src/services/         # Abstracted API service layer (Auth, Courses, Lessons, Payments, Playback)
│   └── src/types/            # Strongly-typed domain interfaces
│
├── migrations/
│   └── 0001_initial_schema.sql # Official Cloudflare D1 DDL migration script
│
├── server (Node.js / Cloudflare D1 Layer)
│   ├── server/d1/
│   │   ├── types.ts          # Cloudflare D1 interfaces (D1Database, D1PreparedStatement, D1Result)
│   │   ├── nodeAdapter.ts    # Native Node.js 22 SQLite adapter implementing D1Database
│   │   ├── client.ts         # D1 client & automatic migration/seed initializer
│   │   ├── mappers.ts        # SQLite row-to-domain object mappers (0/1 boolean & JSON parsing)
│   │   └── repository.ts     # Complete SQL queries executing against Cloudflare D1
│   ├── server/routes/
│   │   ├── auth.ts           # Authentication (Register, Login, /me)
│   │   ├── courses.ts        # Public catalog, filters, student enrolled courses
│   │   ├── payments.ts       # Razorpay order generation, HMAC verification, webhook ingestion
│   │   ├── watch.ts          # Curriculum state, progress tracking, Cloudflare playback authorization
│   │   └── admin.ts          # RBAC-gated management APIs (courses, chapters, lessons, users, orders)
│   ├── server/auth.ts        # JWT token generation, password hashing (bcrypt), RBAC middlewares
│   ├── server/db.ts          # Unified D1 repository bridge exporting `db`
│   ├── server/razorpay.ts    # Razorpay payment service abstraction
│   ├── server/cloudflare.ts  # Cloudflare Stream video service abstraction
│   ├── server/d1_schema.sql  # Standalone D1 schema definition
│   └── server.ts             # Express server entry point & Vite middleware
│
├── wrangler.jsonc            # Cloudflare Wrangler configuration with D1 binding
├── wrangler.toml             # Cloudflare Wrangler TOML configuration with D1 binding
└── .env.example              # Documented environment variables (no PostgreSQL DATABASE_URL required)
```

---

## 2. Cloudflare D1 Database Setup

Cloudflare D1 is Cloudflare's native serverless SQL database built on SQLite.

### Expected Database Details
- **Database Name**: `nextgen_learn_d1`
- **Wrangler Binding**: `DB`
- **Migrations Directory**: `migrations`

### Step-by-Step Provisioning with Cloudflare Wrangler

#### Step 1: Log in to Cloudflare
```bash
npx wrangler login
```

#### Step 2: Create the D1 Database
```bash
npx wrangler d1 create nextgen_learn_d1
```
Wrangler will output something like:
```
[[d1_databases]]
binding = "DB"
database_name = "nextgen_learn_d1"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

#### Step 3: Configure Wrangler
Paste the `database_id` into `wrangler.jsonc` and `wrangler.toml`:
```jsonc
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "nextgen_learn_d1",
    "database_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    "migrations_dir": "migrations"
  }
]
```

#### Step 4: Apply Database Migrations

**Local development (Wrangler local D1 state):**
```bash
npx wrangler d1 execute nextgen_learn_d1 --local --file=./migrations/0001_initial_schema.sql
# OR using migration runner:
npx wrangler d1 migrations apply nextgen_learn_d1 --local
```

**Production (Remote Cloudflare Edge D1):**
```bash
npx wrangler d1 execute nextgen_learn_d1 --remote --file=./migrations/0001_initial_schema.sql
# OR using migration runner:
npx wrangler d1 migrations apply nextgen_learn_d1 --remote
```

---

## 3. Local Development (Zero Credentials Needed)

In local development, the application uses an internal SQLite engine with full D1 interface compatibility:
- Relational integrity (`PRAGMA foreign_keys = ON;`)
- Write-Ahead Logging (`PRAGMA journal_mode = WAL;`)
- Database automatically created and seeded at `data/d1_local.sqlite`
- **No external PostgreSQL server, Docker, or DATABASE_URL required.**

```bash
# 1. Start development server (Node.js + Vite HMR on port 3000)
npm run dev

# 2. Open browser:
# http://localhost:3000
```

---

## 4. Production Build & Deployment

### Build Application
```bash
npm run build
```
This builds:
1. The client-side SPA into `dist/`
2. The server bundle into `dist/server.cjs` via esbuild

### Cloudflare Pages Deployment
To deploy via Cloudflare Pages:
```bash
# Deploy to Cloudflare Pages
npx wrangler pages deploy dist --project-name=nextgen-learn
```

---

## 5. Core Features

### Public Storefront & Student Experience
- **Catalog & Discovery**: Multi-category browsing, real-time search, difficulty level filtering, and sorting (popularity, price, recency).
- **Course Detail Pages**: Comprehensive curriculum overview with breakdown of chapters, lessons, instructor details, FAQs, and learning outcomes.
- **Authentication**: JWT-based authentication with bcrypt password hashing, secure token storage, and student/admin roles.
- **Free Previews**: Visitors and prospective students can stream designated free preview lessons before purchasing.
- **Razorpay Checkout**: Seamless purchase flow with server-side order generation and HMAC SHA256 cryptographic signature verification.
- **Learning Classroom (Watch Page)**: Responsive video player with chapter curriculum navigation, previous/next lesson switching, and automatic lesson completion tracking.
- **My Courses**: Dedicated dashboard for enrolled students showing overall completion percentage and direct "Resume Course" links.

### Private Admin Operations Console
- **Protected Access**: Enforced role-based access control (RBAC). Only authenticated users with `role: "admin"` can access admin endpoints.
- **Operations Dashboard**: Live metrics tracking total revenue, paid orders, active courses, student count, recent purchases, and student directories.
- **Course Management**: Full CRUD capabilities for courses, including metadata editing, price configuration, thumbnail updates, and draft/published status toggling.
- **Curriculum Management**: Section/chapter creation, inline title editing, and deletion.
- **Lesson Management**: Lesson creation and editing with duration settings, free preview flags, and Cloudflare Stream Direct Creator Upload integration.
- **Order Audit Table**: Full audit history of Razorpay orders, payment IDs, verification statuses, and amounts.
- **Student Directory**: Student listing with total spent, enrollment counts, and registration dates.

---

## 6. Environment Variables

Documented in `.env.example`:

| Variable | Description | Required in Production |
| :--- | :--- | :--- |
| `PORT` | Web server port (defaults to `3000`) | No |
| `NODE_ENV` | `development` or `production` | Yes |
| `JWT_SECRET` | Secret key used to sign JWT auth tokens (32+ chars) | Yes |
| `CLOUDFLARE_D1_DATABASE_NAME` | Name of your Cloudflare D1 database (`nextgen_learn_d1`) | Yes |
| `CLOUDFLARE_D1_DATABASE_ID` | Cloudflare D1 database UUID | When deployed |
| `RAZORPAY_KEY_ID` | Razorpay API Key ID (`rzp_live_...` or `rzp_test_...`) | For live payments |
| `RAZORPAY_KEY_SECRET` | Razorpay Key Secret for HMAC verification | For live payments |
| `RAZORPAY_WEBHOOK_SECRET` | Secret for validating webhook events from Razorpay | Recommended |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Account identifier | For live video hosting |
| `CLOUDFLARE_STREAM_TOKEN` | Cloudflare API Token with Stream permissions | For live video hosting |
| `CLOUDFLARE_STREAM_CUSTOMER_SUBDOMAIN` | Cloudflare Stream customer subdomain | Optional |
| `CLOUDFLARE_STREAM_PEM_KEY_ID` | Cloudflare Stream signing key ID | Optional (for signed URLs) |
| `CLOUDFLARE_STREAM_PEM_JWK` | Cloudflare Stream JWK private key | Optional (for signed URLs) |
| `ADMIN_EMAIL` | Default administrator account seeded on startup | No (default provided) |
| `ADMIN_PASSWORD` | Default administrator password seeded on startup | No (default provided) |

---

## 7. Default Credentials for Testing

The initial seed data creates two demo accounts:

- **Administrator**:
  - Email: `admin@nextgenlearn.com`
  - Password: `AdminSecure2026!`
  - Role: `admin` (Full access to Admin Console, Course Management, Orders, and Users)

- **Student**:
  - Email: `student@example.com`
  - Password: `StudentSecure2026!`
  - Role: `student` (Pre-enrolled in Full-Stack Next.js 15 & Production TypeScript Architecture)
