# ExpenseWise REST API Specification

**Base URL:** `http://localhost:3000/api`  
**Data Format:** `application/json` (except CSV export: `text/csv`)  
**Session Header:** `Cookie: expensewise.sid=...`  
**CSRF Header:** `X-CSRF-Token: <token>` (required for mutating methods: POST, PUT, PATCH, DELETE)

---

## 1. Authentication Endpoints

### 1.1 Register User
- **Method:** `POST`
- **Endpoint:** `/auth/register`
- **Rate Limit:** 20 requests per 15 minutes per IP
- **Request Body:**
  ```json
  {
    "name": "Arjun Kumar",
    "email": "arjun@example.com",
    "password": "Password123!",
    "confirmPassword": "Password123!",
    "currency": "INR"
  }
  ```
- **Responses:**
  - `201 Created`:
    ```json
    {
      "success": true,
      "message": "Account registered successfully",
      "data": {
        "user": {
          "_id": "65e01234567890abcdef1234",
          "name": "Arjun Kumar",
          "email": "arjun@example.com",
          "currency": "INR",
          "createdAt": "2026-10-26T12:00:00.000Z"
        }
      }
    }
    ```
  - `400 Bad Request`: Validation failure (short password, invalid email format, mismatched passwords).
  - `409 Conflict`: Email address already registered.

---

### 1.2 User Login
- **Method:** `POST`
- **Endpoint:** `/auth/login`
- **Rate Limit:** 20 requests per 15 minutes per IP
- **Request Body:**
  ```json
  {
    "email": "arjun@example.com",
    "password": "Password123!",
    "rememberMe": true
  }
  ```
- **Responses:**
  - `200 OK`: Sets `expensewise.sid` cookie and returns user object.
  - `401 Unauthorized`: Generic message `"Invalid email or password."`.

---

### 1.3 User Logout
- **Method:** `POST`
- **Endpoint:** `/auth/logout`
- **Authentication:** Required
- **Response:**
  - `200 OK`: Destroys session and clears cookies.

---

### 1.4 Get Authenticated User Profile
- **Method:** `GET`
- **Endpoint:** `/auth/me`
- **Authentication:** Required
- **Response:**
  - `200 OK`: Returns current user details (excluding password hash).
  - `401 Unauthorized`: When not logged in.

---

### 1.5 Update Profile
- **Method:** `PATCH`
- **Endpoint:** `/auth/profile`
- **Authentication:** Required
- **Request Body:**
  ```json
  {
    "name": "Arjun K. Verma",
    "currency": "INR"
  }
  ```

---

### 1.6 Change Password
- **Method:** `PATCH`
- **Endpoint:** `/auth/password`
- **Authentication:** Required
- **Request Body:**
  ```json
  {
    "currentPassword": "Password123!",
    "newPassword": "NewStrongPassword456!",
    "confirmPassword": "NewStrongPassword456!"
  }
  ```

---

## 2. Transactions Endpoints

### 2.1 List / Query Transactions
- **Method:** `GET`
- **Endpoint:** `/transactions`
- **Authentication:** Required
- **Query Parameters:**
  - `search` (string): Search text in title or notes
  - `type` (string): `income` | `expense`
  - `category` (string): Specific category name
  - `startDate` (string): `YYYY-MM-DD`
  - `endDate` (string): `YYYY-MM-DD`
  - `sortBy` (string): `date` | `amount` | `title` (default: `date`)
  - `sortOrder` (string): `desc` | `asc` (default: `desc`)
  - `page` (number): Page number (default: 1)
  - `limit` (number): Items per page (default: 10, max: 100)
- **Response:**
  - `200 OK`:
    ```json
    {
      "success": true,
      "data": {
        "transactions": [ ... ],
        "pagination": {
          "totalCount": 42,
          "totalPages": 5,
          "currentPage": 1,
          "limit": 10,
          "hasNextPage": true,
          "hasPrevPage": false
        }
      }
    }
    ```

---

### 2.2 Create Transaction
- **Method:** `POST`
- **Endpoint:** `/transactions`
- **Authentication:** Required
- **Request Body:**
  ```json
  {
    "title": "Monthly Salary",
    "type": "income",
    "amount": 75000.00,
    "category": "Salary",
    "date": "2026-10-26",
    "paymentMethod": "Net Banking",
    "notes": "Full-time software engineer stipend"
  }
  ```
- **Responses:**
  - `201 Created`: Returns created transaction object.
  - `400 Bad Request`: Missing required fields, negative amount, or invalid type.

---

### 2.3 Update Transaction
- **Method:** `PUT`
- **Endpoint:** `/transactions/:id`
- **Authentication:** Required
- **Request Body:** Permitted fields (`title`, `type`, `amount`, `category`, `date`, `paymentMethod`, `notes`).
- **Response:**
  - `200 OK`: Returns updated transaction object.
  - `404 Not Found`: If transaction does not exist or belongs to another user.

---

### 2.4 Delete Transaction
- **Method:** `DELETE`
- **Endpoint:** `/transactions/:id`
- **Authentication:** Required
- **Response:**
  - `200 OK`: Confirms deletion.

---

## 3. Budgets Endpoints

### 3.1 Get Monthly Category Budgets
- **Method:** `GET`
- **Endpoint:** `/budgets`
- **Authentication:** Required
- **Query Parameters:**
  - `month` (number: 1-12, optional, defaults to current month)
  - `year` (number: e.g. 2026, optional, defaults to current year)
- **Response:**
  - `200 OK`:
    ```json
    {
      "success": true,
      "data": {
        "month": 10,
        "year": 2026,
        "summary": {
          "totalBudgeted": 15000,
          "totalSpent": 11250,
          "remaining": 3750,
          "overallPercentage": 75.0
        },
        "budgets": [
          {
            "_id": "65e01234567890abcdef9999",
            "category": "Food",
            "amount": 8000,
            "month": 10,
            "year": 2026,
            "description": "Groceries and weekend dinner",
            "spent": 6800,
            "remaining": 1200,
            "percentage": 85.0,
            "status": "warning"
          }
        ]
      }
    }
    ```

---

### 3.2 Create Category Budget
- **Method:** `POST`
- **Endpoint:** `/budgets`
- **Authentication:** Required
- **Request Body:**
  ```json
  {
    "category": "Food",
    "amount": 8000,
    "month": 10,
    "year": 2026,
    "description": "Monthly grocery allowance"
  }
  ```
- **Responses:**
  - `201 Created`: Budget created.
  - `409 Conflict`: If budget for this user, category, month, and year already exists.

---

## 4. Dashboard & Reports Endpoints

### 4.1 Dashboard Summary
- **Method:** `GET`
- **Endpoint:** `/dashboard/summary`
- **Authentication:** Required
- **Query Parameters:** `period` (`this-month` | `last-month` | `last-30-days` | `this-year` | `all` | `custom`), `startDate`, `endDate`.
- **Response:**
  - `200 OK`: Returns total income, total expenses, net balance, transaction counts, and recent 5 transactions.

---

### 4.2 Dashboard Chart Datasets
- **Method:** `GET`
- **Endpoint:** `/dashboard/charts`
- **Authentication:** Required
- **Response:**
  - `200 OK`:
    - `expenseDistribution`: Grouped category array for Doughnut Chart.
    - `monthlyComparison`: 6-month array for Bar Chart.
    - `spendingTrend`: Daily expense trajectory array for Line Chart.
    - `categoryRanking`: Top 7 spending categories for Horizontal Bar Chart.

---

### 4.3 Export Transactions to CSV
- **Method:** `GET`
- **Endpoint:** `/reports/export.csv`
- **Authentication:** Required
- **Query Parameters:** `startDate`, `endDate`, `type`, `category`.
- **Response:**
  - `Content-Type: text/csv; charset=utf-8`
  - `Content-Disposition: attachment; filename="expensewise-transactions-YYYY-MM-DD.csv"`
  - Body: RFC-4180 compliant CSV stream with UTF-8 BOM and formula injection protection.
