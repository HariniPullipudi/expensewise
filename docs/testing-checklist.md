# ExpenseWise - Academic Viva & Quality Assurance Testing Checklist

Use this checklist during project demonstration, software quality assurance, and academic viva evaluation.

---

## 1. Environment & Pre-Flight Checks

| # | Check Item | Test Procedure | Expected Result | Pass/Fail |
| :--- | :--- | :--- | :--- | :--- |
| 1.1 | **Node.js Environment** | Run `node -v` in terminal | Output shows Node v18+ or v20+ LTS | [ ] |
| 1.2 | **Dependencies Installed** | Verify `node_modules` exists | Directory populated, `package.json` intact | [ ] |
| 1.3 | **Environment File** | Verify `.env` file | Defines `PORT`, `MONGODB_URI`, `SESSION_SECRET` | [ ] |
| 1.4 | **Automated Test Suite** | Run `npm test` in terminal | 10/10 test cases pass with 0 failures | [ ] |
| 1.5 | **Server Startup** | Run `npm start` | Express logs show listening on port 3000 | [ ] |
| 1.6 | **Health Check** | Open `http://localhost:3000/api/health` | Returns status `"healthy"`, uptime, and DB state | [ ] |

---

## 2. Authentication & Multi-Tenant Security

| # | Check Item | Test Procedure | Expected Result | Pass/Fail |
| :--- | :--- | :--- | :--- | :--- |
| 2.1 | **Account Registration** | Register with Name, Email, Password, Confirm Password | User created, session initiated, redirected to `/dashboard.html` | [ ] |
| 2.2 | **Password Mismatch** | Enter different passwords in registration | Form rejects submission with warning toast | [ ] |
| 2.3 | **Duplicate Email Check** | Register again with same email address | Server returns HTTP 409 Conflict with clear notice | [ ] |
| 2.4 | **Password Hashing** | Inspect MongoDB `users` collection | Field `passwordHash` contains `$2a$` or `$2b$` bcrypt hash; no plaintext | [ ] |
| 2.5 | **Valid Login** | Log in with correct credentials | Redirects to dashboard; sidebar displays user name | [ ] |
| 2.6 | **Invalid Credentials** | Submit incorrect password | Displays generic error `"Invalid email or password."` | [ ] |
| 2.7 | **Password Toggle** | Click eye icon in password field | Switches between masked text and clear text | [ ] |
| 2.8 | **Protected Route Guard** | Visit `/dashboard.html` in an Incognito window | Automatically redirected to `/login.html` | [ ] |
| 2.9 | **Logout Operation** | Click Logout icon in sidebar | Invalids session, destroys cookie, redirects to login | [ ] |
| 2.10| **User Data Isolation** | Create User A & User B; add transactions in A | User B cannot view or modify User A's records | [ ] |

---

## 3. Transaction Management (CRUD)

| # | Check Item | Test Procedure | Expected Result | Pass/Fail |
| :--- | :--- | :--- | :--- | :--- |
| 3.1 | **Add Income Record** | Add "Stipend", type "Income", amount 50000 | Created; appears with green badge and `+₹50,000.00` | [ ] |
| 3.2 | **Add Expense Record** | Add "Dinner", type "Expense", amount 1500, "Food" | Created; appears with red badge and `-₹1,500.00` | [ ] |
| 3.3 | **Validation: Zero Amount** | Try adding transaction with amount 0 | Form rejects with positive amount warning | [ ] |
| 3.4 | **Validation: Negative Amount** | Try adding transaction with amount -250 | Form rejects with positive amount warning | [ ] |
| 3.5 | **Edit Transaction** | Click Edit icon, change title and amount | Record updates in table and updates dashboard stats | [ ] |
| 3.6 | **Delete Transaction** | Click Delete icon, confirm in modal | Record removed; totals recalculated | [ ] |
| 3.7 | **Search Filter** | Type keyword in search box | Table debounces 300ms and filters matching titles | [ ] |
| 3.8 | **Type Filter** | Select "Income Only" or "Expenses Only" | Table displays only selected category type | [ ] |
| 3.9 | **Pagination Controls** | Add more than 10 records | Prev / Next buttons activate; displays page info | [ ] |

---

## 4. Category Budgets & Alert Thresholds

| # | Check Item | Test Procedure | Expected Result | Pass/Fail |
| :--- | :--- | :--- | :--- | :--- |
| 4.1 | **Set Monthly Budget** | Set "Food" limit to ₹5,000 for current month | Budget card created with 0% or matching spent % | [ ] |
| 4.2 | **Duplicate Budget Prevention** | Try setting "Food" budget again for same month | Server rejects with HTTP 409 duplicate warning | [ ] |
| 4.3 | **Real-Time Spent Calculation**| Add ₹2,000 "Food" expense transaction | Budget card immediately updates spent to ₹2,000 (40%) | [ ] |
| 4.4 | **80% Warning Indicator** | Add another ₹2,200 "Food" expense (Total ₹4,200 = 84%) | Progress bar turns amber; badge displays "Near Limit" | [ ] |
| 4.5 | **Exceeded Limit Alert** | Add another ₹1,500 "Food" expense (Total ₹5,700 = 114%) | Progress bar turns red; badge displays "Exceeded Limit" | [ ] |
| 4.6 | **Edit Budget Limit** | Increase "Food" budget limit to ₹10,000 | Spent percentage recalculates; status returns to "On Track" | [ ] |

---

## 5. Chart.js Data Visualizations

| # | Check Item | Test Procedure | Expected Result | Pass/Fail |
| :--- | :--- | :--- | :--- | :--- |
| 5.1 | **Chart 1: Expense Doughnut** | Verify Category Doughnut Chart | Shows slices by category with percentage tooltips | [ ] |
| 5.2 | **Chart 2: Cashflow Bar** | Verify 6-Month Income vs Expense Bar Chart | Dual bars (green income, red expense) per month | [ ] |
| 5.3 | **Chart 3: Spending Line** | Verify Spending Trend Line Chart | Continuous smooth trajectory curve across dates | [ ] |
| 5.4 | **Chart 4: Ranking Bar** | Verify Category Spending Ranking Chart | Horizontal bar chart ranking categories by amount | [ ] |
| 5.5 | **Empty State Handling** | View dashboard on brand new account | Doughnut chart renders friendly "No Expenses Recorded" | [ ] |
| 5.6 | **Date Range Updating** | Change filter to "Last Month" | All 4 charts re-render cleanly without duplicate ghost canvases | [ ] |

---

## 6. Financial Reports & CSV Export

| # | Check Item | Test Procedure | Expected Result | Pass/Fail |
| :--- | :--- | :--- | :--- | :--- |
| 6.1 | **Report Generator** | Select date range and click "Update Report" | Summary cards, breakdown table, and log reload | [ ] |
| 6.2 | **Print-Friendly Mode** | Click "Print Report" | Browser print dialog opens with clean white layout, hiding sidebars/buttons | [ ] |
| 6.3 | **CSV Download** | Click "Export to CSV" | Downloads `.csv` file named `expensewise-transactions-YYYY-MM-DD.csv` | [ ] |
| 6.4 | **CSV Formula Injection Check**| Add transaction with title `=SUM(A1:A5)` and export | Exported CSV text contains `'=SUM(A1:A5)`, neutralizing spreadsheet execution | [ ] |
| 6.5 | **UTF-8 Excel Compatibility** | Open downloaded CSV in Excel | Rupee symbols (₹) and column headers render without encoding corruption | [ ] |

---

## 7. Responsive Mobile & Tablet Testing

| # | Check Item | Viewport / Device | Expected Result | Pass/Fail |
| :--- | :--- | :--- | :--- | :--- |
| 7.1 | **Desktop View** | 1440 x 900 px | Fixed 260px sidebar, 2-column chart grid, full tables | [ ] |
| 7.2 | **Tablet View** | 768 x 1024 px (iPad) | Single-column chart layout, responsive table scroll | [ ] |
| 7.3 | **Mobile Phone View**| 375 x 812 px (iPhone) | Sidebar hides into hamburger menu drawer, stacked cards | [ ] |
| 7.4 | **Mobile Menu Toggle** | Click hamburger icon on mobile | Sidebar slides in smoothly; clicking link navigates cleanly | [ ] |
