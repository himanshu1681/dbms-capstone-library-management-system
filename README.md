> **Credit:** This repository is a copy of the original project by **Rajiv (2501010174)**: https://github.com/Rajivjadon85/dbms-capston-rajiv-2501010174

# 📖 Library Management System (DBMS Capstone)

A complete, fully working Library Management System developed for a **2nd-Year B.Tech Computer Science & Engineering (CSE)** Database Management Systems course.

Built strictly using **Node.js, Express.js, MySQL (InnoDB), HTML5, CSS3, and Bootstrap 5**, adhering to standard relational database design, ACID transactional integrity, and comprehensive coverage of the undergraduate DBMS curriculum.

---

## 🛠️ Technology Stack
- **Backend:** Node.js & Express.js
- **Database:** MySQL 8.0+ (InnoDB Storage Engine)
- **Frontend:** HTML5, CSS3, Vanilla JavaScript, Bootstrap 5 (Responsive, clean, no frontend frameworks)
- **Security:** Bcrypt password hashing, session-based RBAC, Parameterized Prepared Statements

---

## 🌟 Key Features

### 🛡️ Admin / Librarian Panel
- **Secure Authentication:** Password-protected staff login with Bcrypt encryption.
- **Book Catalog Management:** Add, edit, browse, search, and delete books with ISBN uniqueness and stock validation.
- **Category Organization:** Create and manage academic disciplines (CSE, AI&DS, Mathematics, etc.) with referential integrity.
- **Student Membership:** View registered students, track active loan counts, and toggle account status (Active / Blocked).
- **Transactional Book Issuing:** Atomic transactions with `SELECT ... FOR UPDATE` row locks to prevent race conditions.
- **Return Processing & Fine Assessment:** Automatically calculates overdue fines (₹5/day) upon check-in and restores book stock.
- **Circulation History:** Filter and view all active, returned, and overdue book loans.

### 🎓 Student Panel
- **Student Registration & Login:** Self-service registration with college Roll Number, department, semester, and credentials.
- **Book Search & Catalog:** Browse full library inventory, search by title/author/ISBN, filter by category, and check live shelf availability.
- **My Borrowed Books:** View active loans with countdown to due date, overdue alerts, and estimated late fees.
- **Borrowing History:** View completed borrowing records with return dates and fines paid.
- **Profile & Security:** View student details and update account password.

---

## 📂 Project Directory Structure

```text
library-management-system/
├── config/
│   └── db.js                        # MySQL connection pool (mysql2/promise)
├── database/
│   ├── library_db.sql               # MySQL database schema, tables, views, procedures, triggers, seed data
│   ├── dbms_syllabus_queries.sql    # Executable SQL queries covering Units 1, 2, 3, and 4
│   └── init_db.js                   # Node.js automated database setup script
├── middleware/
│   └── auth.js                      # Authentication & role guard middleware
├── public/
│   ├── css/
│   │   └── style.css                # Polished, modern Bootstrap customization
│   └── js/
│       └── main.js                  # Vanilla JS for dialogs and quick filters
├── routes/
│   ├── adminRoutes.js               # Admin dashboard, book/category/student CRUD, issues & returns
│   ├── authRoutes.js                # Login, student registration, and logout
│   └── studentRoutes.js             # Student dashboard, book search, borrowing history, profile
├── views/
│   ├── admin/                       # Admin EJS templates (dashboard, books, categories, students, etc.)
│   ├── auth/                        # Login and registration templates
│   ├── layouts/                     # Modular header, navbar, alerts, and footer
│   ├── student/                     # Student EJS templates (dashboard, search, my_issues, profile)
│   └── index.ejs                    # Landing / Home page
├── .env.example                     # Sample environment configuration
├── .gitignore                       # Git ignore rules (node_modules, .env, *.sqlite)
├── ER_DIAGRAM.md                    # Entity-Relationship diagram & normalization proof
├── PROJECT_DOCUMENTATION.md         # Comprehensive viva guide & academic documentation
├── Library_Management_System_Project_Report.pdf # Official PDF Report for Portal
├── Library_Management_System_DBMS_Viva.pptx    # 14-Slide PowerPoint presentation
├── package.json                     # Node.js dependencies and run scripts
└── README.md                        # Setup and operational guide
```

---

## 🚀 Step-by-Step Installation & Running Guide

### Step 1: Prerequisites
Make sure you have installed on your computer:
1. **Node.js** (v18 or newer) — verify with `node -v`
2. **MySQL Server** (via **XAMPP**, **WampServer**, or standalone **MySQL Server**)

---

### Step 2: Start MySQL Server
- If using **XAMPP**: Open XAMPP Control Panel and click **Start** next to **MySQL** (and Apache).
- If using **MySQL Workbench / Windows Service**: Ensure the `MySQL80` or `MySQL` service is running on port `3306`.

---

### Step 3: Install Node.js Dependencies
In your terminal, navigate to the project directory and run:
```bash
npm install
```

---

### Step 4: Configure Database Settings
Inspect or edit the `.env` file in the project root:
```env
PORT=3000
SESSION_SECRET=library_management_secret_key_2026_btech_cse

# MySQL Database Settings
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=library_db
DB_PORT=3306

BORROW_DURATION_DAYS=14
DAILY_FINE_RATE=5.00
```
> *(Default XAMPP installations have `DB_USER=root` and no password `DB_PASSWORD=`).*

---

### Step 5: Initialize the MySQL Database & Seed Data
You can set up the database using either of the following two methods:

#### Option A: Automatic Node Setup (Recommended)
Run the automated initialization command:
```bash
npm run init-db
```
This automatically connects to MySQL, creates the `library_db` database, generates all 5 normalized tables, views, triggers, and populates realistic CSE textbooks, categories, and test accounts.

#### Option B: Manual Import via phpMyAdmin / MySQL CLI
1. Open **phpMyAdmin** (`http://localhost/phpmyadmin`) or MySQL Command Line.
2. Create database: `CREATE DATABASE library_db;`
3. Import the file `database/library_db.sql`.

---

### Step 6: Start the Application Server
Run:
```bash
npm start
```
You will see:
```text
🚀 Library Management System running at: http://localhost:3000
📚 Technology Stack: Node.js, Express.js, MySQL, Bootstrap
✅ Successfully connected to MySQL database: library_db
```

Open your browser and navigate to: **[http://localhost:3000](http://localhost:3000)**

---

## 🔑 Default Login Credentials for Testing & Viva

| Role | Username / Identifier | Password | Access Rights |
|---|---|---|---|
| **Admin (Librarian)** | `admin` | `admin123` | Full control: Books, Categories, Students, Issues & Returns |
| **Assistant Librarian** | `assistant` | `admin123` | Staff administrative access |
| **Student 1 (Active)** | `23CS001` *(or `aarav.patel@college.edu`)* | `student123` | Has 1 active loan + 1 overdue book |
| **Student 2 (Active)** | `23CS015` | `student123` | Has 1 active loan |
| **Student 3 (Active)** | `23CS042` | `student123` | Clean borrowing history |
| **Student 5 (Blocked)** | `23CS105` | `student123` | Demonstrates account block restriction |

*You can also register a brand new student account directly from the **Student Register** button.*

---

## 📚 Complete DBMS Syllabus Coverage Files

This project includes a dedicated SQL script tailored for viva examinations and university lab practicals:
- **`database/dbms_syllabus_queries.sql`**: Executable queries covering:
  - **Unit 1:** Relational Schema, Candidate/Primary/Foreign Keys, Constraints, Functional Dependencies, 1NF to 3NF/BCNF decomposition, Star & Snowflake schemas.
  - **Unit 2:** DDL, DML, DCL, TCL, `INNER`/`LEFT`/`RIGHT`/`SELF` JOINs, Correlated Subqueries, `UNION`, Views, Indexes, CTEs, and Window Functions (`ROW_NUMBER`, `RANK`).
  - **Unit 3:** ACID properties, `SAVEPOINT` & `ROLLBACK`, Stored Procedures (`sp_issue_book`, `sp_return_book`), Functions (`fn_calculate_fine`), Triggers (`trg_after_issue_insert`), Cursors (`sp_process_overdue_fines`), and SQL Injection defense via Prepared Statements.
  - **Unit 4:** Query plans using `EXPLAIN` and `EXPLAIN ANALYZE`, B-Tree vs Hash Indexing, NoSQL schema modeling (MongoDB & Firebase), Cloud DB architecture, and Data Lake vs Data Warehouse comparison.
- **`ER_DIAGRAM.md`**: Mermaid diagram, cardinality ratios, and step-by-step mathematical normalization proofs.
- **`PROJECT_DOCUMENTATION.md`**: Comprehensive 2nd-year academic project report with 10+ common viva voce questions and answers.

---

## 📜 License
Developed for academic learning and coursework submission in Database Management Systems (DBMS).
