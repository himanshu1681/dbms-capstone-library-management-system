# 📚 Library Management System (DBMS Capstone)
## Comprehensive Academic Project Documentation & Viva Voce Guide
**Course:** Database Management Systems (CS204 / DBMS Lab)  
**Target Audience:** 2nd-Year B.Tech Computer Science & Engineering (CSE)  
**Technology Stack:** Node.js, Express.js, MySQL (InnoDB), HTML5, CSS3, Bootstrap 5  

---

## 1. Project Overview & Abstract

### 1.1 Abstract
The **Library Management System (LibraryMS)** is an automated, web-based database management software designed to streamline the academic circulation of engineering textbooks, reference materials, and digital library records in an engineering college. Built specifically as a capstone project for the 2nd-year B.Tech CSE Database Management Systems curriculum, the application demonstrates rigorous database engineering principles: **Boyce-Codd Normalization (BCNF)**, **ACID transaction guarantees**, **referential integrity enforcement**, **parameterized prepared queries**, **automated audit triggers**, and **pre-computed relational views**.

### 1.2 Core Objectives
- Automate physical book cataloging, shelf allocation, and stock tracking.
- Provide a dual-role access control model separating **Librarians (Admin)** from **Students**.
- Eliminate concurrency anomalies (race conditions) during simultaneous checkouts using row-level locking (`SELECT ... FOR UPDATE`).
- Automatically track due dates and compute late fee penalties at ₹5/day upon return.
- Prevent SQL injection vulnerabilities using parameterized prepared statements.

---

## 2. System Architecture

```text
+-----------------------------------------------------------------------------------+
|                                 CLIENT TIER                                       |
|  Responsive Web Browser (Bootstrap 5, Semantic HTML5, Vanilla JavaScript)        |
+-----------------------------------------------------------------------------------+
                                       |
                                HTTP / HTTPS (RESTful Requests & Form Posts)
                                       v
+-----------------------------------------------------------------------------------+
|                             APPLICATION / SERVER TIER                             |
|  Node.js Runtime + Express.js Web Framework                                       |
|  - Middleware: Session Management, Role-Based Access Control (isAdmin, isStudent) |
|  - Template Engine: EJS (Embedded JavaScript) Server-Side Rendering               |
|  - Security: Bcrypt Password Hashing, Input Sanitization                          |
+-----------------------------------------------------------------------------------+
                                       |
                           TCP Socket Connection Pool (mysql2/promise)
                                       v
+-----------------------------------------------------------------------------------+
|                                 DATABASE TIER                                     |
|  MySQL Server 8.0+ (InnoDB Storage Engine)                                        |
|  - Tables: Admins, Categories, Students, Books, Book_Issues, Issue_Audit_Log      |
|  - Triggers: trg_after_issue_insert, trg_after_issue_update                       |
|  - Views: v_active_issues, v_book_inventory                                       |
|  - Stored Procedures & Functions: sp_issue_book, sp_return_book, fn_calculate_fine |
+-----------------------------------------------------------------------------------+
```

---

## 3. Comprehensive Data Dictionary

### Table 1: `admins`
Stores credentials and metadata for library staff and administrators.

| Column Name | Data Type | Constraints | Description |
|---|---|---|---|
| `admin_id` | `INT` | `PRIMARY KEY`, `AUTO_INCREMENT` | Unique identifier for the administrator |
| `username` | `VARCHAR(50)` | `NOT NULL`, `UNIQUE` | Login username |
| `password_hash` | `VARCHAR(255)` | `NOT NULL` | One-way bcrypt password hash |
| `full_name` | `VARCHAR(100)` | `NOT NULL` | Full legal name of staff member |
| `email` | `VARCHAR(100)` | `NOT NULL`, `UNIQUE` | Institutional email address |
| `role` | `VARCHAR(50)` | `DEFAULT 'Librarian'` | Administrative designation |
| `created_at` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | Account creation timestamp |

### Table 2: `categories`
Normalizes subject domains to prevent transitive dependencies in the catalog.

| Column Name | Data Type | Constraints | Description |
|---|---|---|---|
| `category_id` | `INT` | `PRIMARY KEY`, `AUTO_INCREMENT` | Unique category code |
| `category_name` | `VARCHAR(100)` | `NOT NULL`, `UNIQUE` | Distinct discipline name (e.g. CSE, AI&DS) |
| `description` | `TEXT` | `NULL` | Scope and curriculum description |
| `created_at` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | Record timestamp |

### Table 3: `students`
Stores registered college students eligible for library memberships.

| Column Name | Data Type | Constraints | Description |
|---|---|---|---|
| `student_id` | `INT` | `PRIMARY KEY`, `AUTO_INCREMENT` | Internal student identifier |
| `roll_number` | `VARCHAR(30)` | `NOT NULL`, `UNIQUE` | University assigned roll number (e.g. 23CS001) |
| `full_name` | `VARCHAR(100)` | `NOT NULL` | Student's full name |
| `email` | `VARCHAR(100)` | `NOT NULL`, `UNIQUE` | Student institutional email |
| `phone` | `VARCHAR(15)` | `NULL` | 10-digit mobile contact |
| `department` | `VARCHAR(50)` | `DEFAULT 'CSE'` | Academic engineering branch |
| `semester` | `INT` | `DEFAULT 4` | Current semester of study (1 to 8) |
| `password_hash` | `VARCHAR(255)` | `NOT NULL` | Bcrypt hashed password |
| `status` | `ENUM('Active','Blocked')` | `DEFAULT 'Active'` | Borrowing privilege status |
| `created_at` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | Registration date and time |

### Table 4: `books`
Master catalog of textbooks and reference volumes.

| Column Name | Data Type | Constraints | Description |
|---|---|---|---|
| `book_id` | `INT` | `PRIMARY KEY`, `AUTO_INCREMENT` | Internal catalog number |
| `isbn` | `VARCHAR(20)` | `NOT NULL`, `UNIQUE` | International Standard Book Number |
| `title` | `VARCHAR(200)` | `NOT NULL` | Full book title |
| `author` | `VARCHAR(150)` | `NOT NULL` | Primary authors/contributors |
| `category_id` | `INT` | `NOT NULL`, `FOREIGN KEY` | References `categories(category_id)` |
| `publisher` | `VARCHAR(100)` | `NULL` | Publishing house |
| `publish_year` | `INT` | `NULL` | Year of publication |
| `total_copies` | `INT` | `NOT NULL`, `DEFAULT 1` | Total inventory owned by library |
| `available_copies` | `INT` | `NOT NULL`, `DEFAULT 1` | Copies currently available on shelf |
| `shelf_location` | `VARCHAR(50)` | `DEFAULT 'Shelf-A1'` | Physical rack location tag |
| `created_at` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | Date cataloged |

**Table Constraints:**  
- `CONSTRAINT fk_books_category FOREIGN KEY (category_id) REFERENCES categories(category_id) ON DELETE RESTRICT ON UPDATE CASCADE`
- `CONSTRAINT chk_book_copies CHECK (available_copies <= total_copies AND available_copies >= 0)`

### Table 5: `book_issues`
Transaction junction table recording checkout and check-in life cycles.

| Column Name | Data Type | Constraints | Description |
|---|---|---|---|
| `issue_id` | `INT` | `PRIMARY KEY`, `AUTO_INCREMENT` | Unique loan transaction receipt |
| `book_id` | `INT` | `NOT NULL`, `FOREIGN KEY` | References `books(book_id)` |
| `student_id` | `INT` | `NOT NULL`, `FOREIGN KEY` | References `students(student_id)` |
| `admin_id` | `INT` | `NOT NULL`, `FOREIGN KEY` | References `admins(admin_id)` |
| `issue_date` | `DATE` | `NOT NULL` | Date when physical book was checked out |
| `due_date` | `DATE` | `NOT NULL` | Due date for return without late fees |
| `return_date` | `DATE` | `NULL` | Actual date when book was returned |
| `fine_amount` | `DECIMAL(6,2)` | `DEFAULT 0.00` | Fine calculated (₹5 per overdue day) |
| `status` | `ENUM('Issued','Returned','Overdue')` | `DEFAULT 'Issued'` | Current status of checkout record |
| `remarks` | `VARCHAR(255)` | `NULL` | Librarian notes or condition logs |
| `created_at` | `TIMESTAMP` | `DEFAULT CURRENT_TIMESTAMP` | Record timestamp |

**Table Constraints:**  
- `CONSTRAINT fk_issues_book FOREIGN KEY (book_id) REFERENCES books(book_id) ON DELETE RESTRICT ON UPDATE CASCADE`
- `CONSTRAINT fk_issues_student FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE RESTRICT ON UPDATE CASCADE`
- `CONSTRAINT fk_issues_admin FOREIGN KEY (admin_id) REFERENCES admins(admin_id) ON DELETE RESTRICT ON UPDATE CASCADE`
- `CONSTRAINT chk_issue_dates CHECK (due_date >= issue_date)`

---

## 4. Academic Syllabus Mapping (DBMS Units 1 to 4)

### Unit 1: Database Design
- **ER Modeling:** Conceptualized entities, relationships, cardinality ratios ($1:N$, $M:N$), and participation constraints.
- **Relational Integrity:**
  - **Entity Integrity:** Primary keys (`book_id`, `student_id`, etc.) enforced strictly non-null and unique.
  - **Referential Integrity:** Foreign keys on `books` and `book_issues` prevent orphan records. Configured with `ON DELETE RESTRICT` to protect active lending histories.
  - **Domain Integrity:** Data types, `ENUM('Active','Blocked')`, and check constraints (`due_date >= issue_date`).
- **Functional Dependencies & BCNF:** Decomposed flat structures to eliminate partial dependencies (2NF) and transitive dependencies (3NF), ensuring every determinant is a Super Key (BCNF).
- **Data Warehousing Concepts:** Designed Star and Snowflake analytical schema models in `database/dbms_syllabus_queries.sql` to demonstrate data mart aggregation for library circulation metrics.

### Unit 2: Advanced SQL
- **DDL, DML, DCL, TCL:** Executed across setup scripts and application queries.
- **Joins:** Multi-table `INNER JOIN` (active issues with student and book titles), `LEFT JOIN` (popular books borrow counts), `RIGHT JOIN` (categories inventory), and `SELF JOIN` (peer textbook comparisons).
- **Subqueries & Set Operations:** Correlated subqueries using `EXISTS`, scalar percentage calculations, and `UNION` operations combining users.
- **Views & Indexes:** Created `v_active_issues` and `v_book_inventory`. Added B-Tree indexes on `category_id`, `title`, and `author` to optimize search performance from $O(N)$ full table scan to $O(\log N)$ index scan.
- **CTEs & Window Functions:** Demonstrates `WITH StudentSummary AS (...)` and ranking functions (`ROW_NUMBER()`, `RANK()`, `DENSE_RANK()`).

### Unit 3: Transactions & Security
- **ACID Implementation:**
  - **Atomicity:** When a book is issued, both the checkout record insertion and the stock decrement must succeed together. If any fails, `connection.rollback()` restores the exact previous state.
  - **Consistency:** Database check constraints (`available_copies >= 0`) prevent negative inventory.
  - **Isolation:** Row-level locks (`SELECT ... FOR UPDATE`) prevent concurrency race conditions.
  - **Durability:** Committed transactions persist through the InnoDB Write-Ahead Log (WAL).
- **Stored Procedures & Functions:**
  - `sp_issue_book()`: Manages transactional issuing.
  - `sp_return_book()`: Manages transactional return and fine calculation.
  - `fn_calculate_fine()`: Calculates late fees deterministically.
- **Triggers:** `trg_after_issue_insert` and `trg_after_issue_update` automatically write to `issue_audit_log`.
- **Prepared Statements:** Prevents SQL injection by ensuring query structure and user inputs are sent separately.

### Unit 4: Query Optimization & NoSQL Concepts
- **EXPLAIN Analysis:** Evaluated query execution plans with `EXPLAIN` and `EXPLAIN ANALYZE`.
- **Indexing Data Structures:** B-Tree (balanced multi-way tree supporting range queries) vs Hash Index (exact equality $O(1)$).
- **NoSQL Comparison:** Designed document-based schemas for MongoDB (BSON) and Firebase Firestore, highlighting differences between relational schema-on-write and NoSQL schema-on-read.
- **Data Lake vs Data Warehouse:** Contrasted structured relational data warehouses (ETL) with unstructured data lakes (ELT).

---

## 5. Viva Voce Questions & Answers (Examiner Reference)

#### Q1: What is normalization and why did you normalize up to 3NF/BCNF?
**Answer:** Normalization is the systematic process of organizing database fields and tables to minimize redundancy and prevent insertion, update, and deletion anomalies. In our project, if categories were stored directly inside the `books` table, renaming a category would require updating hundreds of book records (update anomaly). If we deleted all books in a department, the department itself would be deleted (deletion anomaly). Decomposing into `Categories` and `Books` puts the schema in 3NF and BCNF, ensuring every determinant is a super key.

#### Q2: What is the difference between 3NF and BCNF?
**Answer:** 3NF allows a non-trivial functional dependency $X \rightarrow Y$ if $X$ is a super key OR $Y$ is a prime attribute (part of any candidate key). BCNF removes this second relaxed condition: for EVERY functional dependency $X \rightarrow Y$, $X$ MUST be a super key. BCNF is therefore strictly stronger than 3NF.

#### Q3: How did you implement ACID properties when issuing a book?
**Answer:** In `routes/adminRoutes.js` and in `sp_issue_book`, we invoke `await connection.beginTransaction()`. We lock the book row using `SELECT available_copies FROM books WHERE book_id = ? FOR UPDATE`. We verify that `available_copies > 0` and the student is `Active`. We insert into `book_issues` and execute `UPDATE books SET available_copies = available_copies - 1`. If any error occurs or stock is 0, we execute `connection.rollback()`. Once all operations succeed, we invoke `connection.commit()`.

#### Q4: Why did you use Prepared Statements instead of string concatenation?
**Answer:** String concatenation (`"SELECT * FROM users WHERE name = '" + input + "'"` ) is vulnerable to SQL Injection attacks, where an attacker inputs `' OR '1'='1` to bypass authentication. Prepared statements compile the SQL query template first with placeholders (`?`). When values are passed, the database treats them strictly as literal data rather than executable SQL code.

#### Q5: What is the purpose of the `issue_audit_log` table and how is it populated?
**Answer:** `issue_audit_log` provides an immutable audit trail for security and auditing. It is populated automatically by database **Triggers** (`trg_after_issue_insert` and `trg_after_issue_update`) in MySQL, meaning even if someone modifies records directly from the command line, the audit log records the timestamp and action.

#### Q6: How does a B-Tree index speed up book searches?
**Answer:** Without an index, searching for a book title requires a Full Table Scan ($O(N)$ operations). A B-Tree index maintains a sorted, balanced tree of key values and row pointers. Searching uses binary traversal of internal nodes, reducing search complexity to $O(\log N)$.

#### Q7: When would you choose MongoDB over MySQL for a library system?
**Answer:** MySQL is ideal for library systems because of strict referential integrity, ACID transactional lending, and foreign keys. MongoDB would be preferred if books had highly polymorphic, unstructured schemas (e.g., varying metadata formats, dynamic table-of-contents, multimedia attachments, or petabyte-scale horizontal sharding).

---

## 6. Software Verification & Test Cases

| Test Case ID | Test Scenario | Input Data | Expected Output | Actual Result |
|---|---|---|---|---|
| **TC-01** | Student Registration with valid data | Roll: `23CS099`, Email: `test@college.edu` | Record inserted, password hashed with bcrypt, redirect to login | Pass |
| **TC-02** | Student Registration with duplicate Roll No | Roll: `23CS001` (already exists) | Rejected with error: "A student with this Roll Number is already registered" | Pass |
| **TC-03** | Admin Login with correct credentials | User: `admin`, Pass: `admin123` | Session created with role `admin`, dashboard rendered | Pass |
| **TC-04** | Admin Login with incorrect password | User: `admin`, Pass: `wrongpass` | Access denied with error: "Invalid admin credentials" | Pass |
| **TC-05** | Issue Book when copies available | Book: `Database System Concepts`, Student: `23CS001` | Transaction commits, available copies decrements by 1 | Pass |
| **TC-06** | Issue Book when stock is 0 | Out of stock book | Transaction rolls back, error: "No available copies remaining" | Pass |
| **TC-07** | Issue Book to Blocked Student | Student: `23CS105` (Blocked) | Transaction rolls back, error: "Student account is blocked" | Pass |
| **TC-08** | Return Book after Due Date | Issue ID 1 (6 days overdue) | Returned successfully, fine assessed: 6 days × ₹5 = ₹30.00, stock increments | Pass |
| **TC-09** | Delete Book currently on loan | Book ID 1 (issued to student) | Prevented with constraint error: "Copies are currently issued to students" | Pass |
| **TC-10** | Student Password Change | Correct current pass, new pass: `newpass123` | Password updated in database, old password invalidated | Pass |

---
**Project Prepared for Department of Computer Science & Engineering**
