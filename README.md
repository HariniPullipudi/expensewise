# ExpenseWise - Personal Expense Tracker with Charts

> **Full Stack Development (FSD) Academic Project**  
> A complete, responsive, full-stack personal finance web application built with HTML5, CSS3, Vanilla JavaScript, Chart.js, Node.js, Express.js, and MongoDB.

---

## 1. Project Overview & Objectives

**ExpenseWise** is designed to provide individuals with an intuitive, bank-grade personal finance dashboard to track cash flow, establish monthly category budgets, analyze spending trends, and export financial reports.

### Key Objectives:
- **Income & Expense Tracking:** Provide CRUD management for daily cash, card, UPI, and bank transactions.
- **Dynamic Visualizations:** Generate responsive Chart.js visual analytics (category doughnuts, 6-month comparisons, daily trajectories, and category rankings) computed from database records.
- **Budget Discipline:** Enable users to set monthly spending limits per category, complete with automatic spending percentage tracking, 80% threshold warnings, and exceeded-limit alerts.
- **Financial Reporting & CSV Export:** Allow customized date-range and category filters, printable report layouts, and CSV downloads protected against Spreadsheet Formula Injection (CWE-1236).
- **Security & Multi-Tenant Isolation:** Ensure every user's records are completely private through bcrypt password hashing, `express-session` cookies, CSRF protection, and server-side ownership validation.

---

## 2. Technology Stack

| Layer | Technologies Used |
| :--- | :--- |
| **Frontend** | HTML5 Semantic Elements, Modern CSS3 (Grid & Flexbox), Vanilla JavaScript (ES6+), Chart.js (v4.4), Font Awesome 6.5, Google Fonts (*Plus Jakarta Sans*) |
| **Backend** | Node.js (v20+ LTS), Express.js (v4.19), RESTful API Architecture |
| **Database** | MongoDB Community Server / MongoDB Atlas, Mongoose ODM (v8.3) |
| **Authentication & Security** | `bcryptjs` (Salt factor 10), `express-session`, `connect-mongo`, `helmet` (CSP Headers), `express-rate-limit`, Anti-CSRF Token Middleware |
| **Data Export** | Custom RFC-4180 compliant CSV generator with formula injection sanitization |

---

## 3. System Architecture & Folder Structure

```
personal-expense-tracker/
├── package.json                   # Dependencies and npm script runners
├── .env.example                   # Environment configuration template
├── .env                           # Local environment variables (git-ignored)
├── .gitignore                     # Excludes node_modules, .env, and logs
├── README.md                      # Comprehensive developer and viva documentation
├── server.js                      # Express server entry point & security middleware
├── tests/
│   └── verify.js                  # Automated test verification suite
├── docs/
│   ├── project-report.md          # Complete academic project report for submission
│   ├── api-documentation.md       # Comprehensive REST API reference
│   └── testing-checklist.md       # Academic viva test cases and QA checklist
├── src/
│   ├── config/
│   │   └── db.js                  # MongoDB connection and lifecycle event handler
│   ├── models/
│   │   ├── User.js                # User schema, password hashing & verification methods
│   │   ├── Transaction.js         # Income/expense transactions with compound indexes
│   │   └── Budget.js              # Monthly category budgets with uniqueness index
│   ├── routes/
│   │   ├── authRoutes.js          # /api/auth endpoints (register, login, logout, profile)
│   │   ├── transactionRoutes.js   # /api/transactions CRUD endpoints
│   │   ├── budgetRoutes.js        # /api/budgets endpoints with real-time spend calculations
│   │   ├── dashboardRoutes.js     # /api/dashboard summary & Chart.js datasets
│   │   └── reportRoutes.js        # /api/reports summary & CSV export
│   ├── controllers/
│   │   ├── authController.js      # Authentication and password update logic
│   │   ├── transactionController.js # Multi-criteria transaction filtering & pagination
│   │   ├── budgetController.js    # Budget status and percentage calculation
│   │   ├── dashboardController.js # Aggregations for summary cards and chart endpoints
│   │   └── reportController.js    # Report aggregation and streaming CSV download
│   ├── middleware/
│   │   ├── requireAuth.js         # Session-based route guard
│   │   ├── csrf.js                # Double-submit / session CSRF defense
│   │   ├── validateRequest.js     # Input sanitizers and MongoDB ObjectId validators
│   │   └── errorHandler.js        # Centralized HTTP error response handler
│   ├── services/
│   │   ├── dashboardService.js    # MongoDB aggregation pipelines for dashboard
│   │   └── reportService.js       # Period financial aggregation service
│   └── utils/
│       ├── csv.js                 # RFC-4180 CSV serializer & formula injection defense
│       └── currency.js            # Indian Rupee (INR) formatting utility
└── public/
    ├── index.html                 # Landing page with hero, features, and tech showcase
    ├── login.html                 # Sign-in page with password toggle and demo autofill
    ├── register.html              # Account registration with validation
    ├── dashboard.html             # Main fintech dashboard with 4 Chart.js charts
    ├── transactions.html          # Transaction CRUD table, filters, and modals
    ├── budgets.html               # Monthly category budget cards and progress indicators
    ├── reports.html               # Period breakdown table, print layout, and CSV trigger
    ├── settings.html              # Profile updates, password changer, currency setting
    ├── css/
    │   └── styles.css             # Comprehensive design system, themes, and print styles
    └── js/
        ├── api.js                 # Reusable Fetch API client with automatic CSRF
        ├── auth.js                # Form validation and login/registration handlers
        ├── dashboard.js           # Chart.js initialization, live updates, and modals
        ├── transactions.js        # Transaction pagination, search debounce, and CRUD
        ├── budgets.js             # Budget progress bar math and alert calculations
        ├── reports.js             # Filterable reports and window.print() controller
        └── settings.js            # Profile updates and password change handlers
```

---

## 4. Quick Start & Installation

### Prerequisites
- **Node.js**: v18 or higher (v20+ LTS recommended)
- **MongoDB**: Either local MongoDB Community Server (v6.0+) **OR** a free [MongoDB Atlas](https://www.mongodb.com/atlas) cloud cluster.

### Step 1: Navigate to Project Directory
```powershell
# In PowerShell / Command Prompt
cd c:\Users\harin\OneDrive\Desktop\frontend\personal-expense-tracker
```

### Step 2: Install Node.js Dependencies
```bash
npm install
```

### Step 3: Configure Environment Variables
Copy `.env.example` to `.env` if not already present:
```powershell
Copy-Item .env.example .env
```
Inside `.env`, verify your settings:
```env
PORT=3000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/expense_tracker
SESSION_SECRET=dev_secret_expensewise_session_key_academic_project_2026
SESSION_MAX_AGE_MS=86400000
COOKIE_SECURE=false
ALLOWED_ORIGIN=http://localhost:3000
```

---

## 5. Setting Up MongoDB

### Option A: Local MongoDB Community Server
1. Download MongoDB Community Server from [MongoDB Download Center](https://www.mongodb.com/try/download/community).
2. Install as a Windows Service (default settings).
3. Verify MongoDB is running in PowerShell:
   ```powershell
   Get-Service -Name *mongo*
   ```
4. Your `.env` setting:
   ```env
   MONGODB_URI=mongodb://localhost:27017/expense_tracker
   ```

### Option B: Free Cloud Database with MongoDB Atlas (No Installation Required!)
1. Create a free account at [mongodb.com/atlas](https://www.mongodb.com/atlas).
2. Create a free **M0 Sandbox** cluster.
3. Under **Database Access**, create a database user (e.g., `admin`) and set a password.
4. Under **Network Access**, click **Add IP Address** and choose **Allow Access from Anywhere** (`0.0.0.0/0`).
5. Click **Connect** -> **Connect your application** (Drivers: Node.js).
6. Copy the connection string and paste it into `.env`:
   ```env
   MONGODB_URI=mongodb+srv://admin:<password>@cluster0.abcde.mongodb.net/expense_tracker?retryWrites=true&w=majority
   ```

---

## 6. Running the Application

### Development Mode (with Node.js watch):
```bash
npm run dev
```

### Production / Standard Mode:
```bash
npm start
```

### Open in Browser:
Visit **[http://localhost:3000](http://localhost:3000)** in Google Chrome, Microsoft Edge, Brave, or Firefox.

---

## 7. Automated Testing & Verification

Run the built-in automated test suite:
```bash
npm test
```
The test suite validates:
- Password hashing with `bcryptjs` and timing safety.
- Exclusion of password hashes from JSON serialization.
- Formula injection prevention (`=`, `+`, `-`, `@`) in CSV outputs.
- UTF-8 BOM encoding for Excel compatibility.
- Currency formatting under the Indian numbering system.
- Mongoose model validation rules (positive amounts, enum checks, budget month/year).
- Dashboard date filter range calculations.

---

## 8. REST API Documentation

### Authentication (`/api/auth`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Register new user account | No |
| `POST` | `/api/auth/login` | Authenticate user & start session | No |
| `POST` | `/api/auth/logout` | Destroy session & clear cookies | Yes |
| `GET` | `/api/auth/me` | Fetch authenticated user profile | Yes |
| `PATCH` | `/api/auth/profile` | Update display name and currency | Yes |
| `PATCH` | `/api/auth/password` | Change password with verification | Yes |
| `GET` | `/api/auth/csrf` | Get current session CSRF token | No |

### Transactions (`/api/transactions`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/transactions` | Query & paginate transactions | Yes |
| `GET` | `/api/transactions/:id` | Fetch single transaction details | Yes |
| `POST` | `/api/transactions` | Create income or expense record | Yes |
| `PUT` | `/api/transactions/:id` | Update transaction record | Yes |
| `DELETE` | `/api/transactions/:id`| Delete transaction record | Yes |

### Budgets (`/api/budgets`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/budgets` | Get category budgets + live spent % | Yes |
| `GET` | `/api/budgets/:id` | Get specific budget limit details | Yes |
| `POST` | `/api/budgets` | Set new category monthly limit | Yes |
| `PUT` | `/api/budgets/:id` | Update budget limit amount | Yes |
| `DELETE` | `/api/budgets/:id` | Remove category budget | Yes |

### Analytics & Reports (`/api/dashboard` & `/api/reports`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/dashboard/summary` | Summary metrics (income, expenses, net) | Yes |
| `GET` | `/api/dashboard/charts` | 4 Chart.js datasets from MongoDB | Yes |
| `GET` | `/api/reports/summary` | Filtered financial report summary | Yes |
| `GET` | `/api/reports/export.csv` | Export filtered transactions to CSV | Yes |
| `GET` | `/api/health` | Application & MongoDB health check | No |

---

## 9. Security Implementations

1. **Password Encryption:** Passwords are never stored in plaintext. They are salted and hashed using `bcryptjs` (work factor 10).
2. **Session Authentication:** Uses server-side sessions stored in MongoDB via `connect-mongo`, preventing JWT token theft via client-side storage.
3. **HTTP-Only Cookies:** Session cookies use `httpOnly: true` and `sameSite: 'lax'`, preventing Cross-Site Scripting (XSS) cookie theft.
4. **CSRF Protection:** Non-idempotent HTTP methods (`POST`, `PUT`, `PATCH`, `DELETE`) require a cryptographically secure token matching the server-side session.
5. **Rate Limiting:** Protects `/api/auth/login` and `/api/auth/register` against brute-force credential stuffing.
6. **Mass Assignment Prevention:** Explicit field whitelisting in controllers prevents malicious payload modification.
7. **Multi-Tenant Ownership:** Every database read, update, and delete strictly matches `user: req.user._id`.
8. **CSV Formula Injection Neutralization (CWE-1236):** Leading characters (`=`, `+`, `-`, `@`, `\t`, `\r`) are automatically escaped with a leading apostrophe (`'`).
9. **Helmet HTTP Headers:** Configures standard Content Security Policy (CSP), anti-clickjacking (`X-Frame-Options`), and MIME-sniffing protections.

---

## 10. Academic Project Documentation

Detailed academic documentation is provided in the `docs/` folder:
- **`docs/project-report.md`**: Complete, structured academic project report containing Abstract, Problem Statement, Software Engineering Requirements (SRS), System Architecture, Data Flow Diagrams, Schema ER, Implementation Details, and Viva Q&A.
- **`docs/api-documentation.md`**: Detailed API request/response specifications and curl samples.
- **`docs/testing-checklist.md`**: Step-by-step test cases for viva examiners.
