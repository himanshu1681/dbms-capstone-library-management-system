/**
 * Database Connection & Adapter Module
 * Primary Engine: MySQL (InnoDB) via mysql2/promise
 * Automatic Fallback Engine: SQLite3 (Zero-setup local persistence)
 * Ensures the project runs seamlessly in university labs AND on student laptops without manual server configuration!
 */

const mysql = require('mysql2/promise');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
require('dotenv').config();

let useSQLite = false;
let mysqlPool = null;
let sqliteDb = null;
let isInitialized = false;

// MySQL configuration from .env
const mysqlConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD !== undefined ? process.env.DB_PASSWORD : '',
    database: process.env.DB_NAME || 'library_db',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    dateStrings: true
};

// SQLite translation helper
function translateSqlForSqlite(sql) {
    if (!sql) return sql;
    let s = sql;
    // Remove FOR UPDATE
    s = s.replace(/\s+FOR\s+UPDATE/gi, '');
    // Replace DATEDIFF(CURRENT_DATE, ...) with julianday calculation
    s = s.replace(/DATEDIFF\s*\(\s*CURRENT_DATE\s*,\s*([^)]+)\s*\)/gi, "CAST((julianday('now', 'localtime') - julianday($1)) AS INTEGER)");
    // Replace CURRENT_DATE with date('now', 'localtime')
    s = s.replace(/\bCURRENT_DATE\b/gi, "date('now', 'localtime')");
    // Replace DATE_SUB(..., INTERVAL X DAY)
    s = s.replace(/DATE_SUB\s*\(\s*date\('now',\s*'localtime'\)\s*,\s*INTERVAL\s+(\d+)\s+DAY\s*\)/gi, "date('now', 'localtime', '-$1 days')");
    // Replace DATE_ADD(..., INTERVAL X DAY)
    s = s.replace(/DATE_ADD\s*\(\s*date\('now',\s*'localtime'\)\s*,\s*INTERVAL\s+(\d+)\s+DAY\s*\)/gi, "date('now', 'localtime', '+$1 days')");
    return s;
}

// Initialize SQLite Schema & Seed Data if MySQL is offline
async function initSqliteSchema() {
    return new Promise((resolve, reject) => {
        const sqliteFile = path.join(__dirname, '..', 'database', 'library_local.sqlite');
        sqliteDb = new sqlite3.Database(sqliteFile, async (err) => {
            if (err) return reject(err);

            sqliteDb.serialize(async () => {
                // Admins
                sqliteDb.run(`CREATE TABLE IF NOT EXISTS admins (
                    admin_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    full_name TEXT NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    role TEXT DEFAULT 'Chief Librarian',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )`);

                // Categories
                sqliteDb.run(`CREATE TABLE IF NOT EXISTS categories (
                    category_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    category_name TEXT UNIQUE NOT NULL,
                    description TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )`);

                // Students
                sqliteDb.run(`CREATE TABLE IF NOT EXISTS students (
                    student_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    roll_number TEXT UNIQUE NOT NULL,
                    full_name TEXT NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    phone TEXT,
                    department TEXT DEFAULT 'CSE',
                    semester INTEGER DEFAULT 4,
                    password_hash TEXT NOT NULL,
                    status TEXT DEFAULT 'Active',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )`);

                // Books
                sqliteDb.run(`CREATE TABLE IF NOT EXISTS books (
                    book_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    isbn TEXT UNIQUE NOT NULL,
                    title TEXT NOT NULL,
                    author TEXT NOT NULL,
                    category_id INTEGER NOT NULL,
                    publisher TEXT,
                    publish_year INTEGER,
                    total_copies INTEGER DEFAULT 1,
                    available_copies INTEGER DEFAULT 1,
                    shelf_location TEXT DEFAULT 'Shelf-A1',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (category_id) REFERENCES categories(category_id)
                )`);

                // Book Issues
                sqliteDb.run(`CREATE TABLE IF NOT EXISTS book_issues (
                    issue_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    book_id INTEGER NOT NULL,
                    student_id INTEGER NOT NULL,
                    admin_id INTEGER NOT NULL,
                    issue_date TEXT NOT NULL,
                    due_date TEXT NOT NULL,
                    return_date TEXT,
                    fine_amount REAL DEFAULT 0.00,
                    status TEXT DEFAULT 'Issued',
                    remarks TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (book_id) REFERENCES books(book_id),
                    FOREIGN KEY (student_id) REFERENCES students(student_id),
                    FOREIGN KEY (admin_id) REFERENCES admins(admin_id)
                )`);

                // Seed default admin if table is empty
                sqliteDb.get("SELECT COUNT(*) AS count FROM admins", async (err, row) => {
                    if (row && row.count === 0) {
                        const adminHash = await bcrypt.hash('admin123', 10);
                        const studentHash = await bcrypt.hash('student123', 10);

                        sqliteDb.run("INSERT INTO admins (username, password_hash, full_name, email, role) VALUES ('admin', ?, 'Dr. Rajesh Sharma', 'admin@library.edu', 'Chief Librarian')", [adminHash]);
                        sqliteDb.run("INSERT INTO admins (username, password_hash, full_name, email, role) VALUES ('assistant', ?, 'Pooja Verma', 'pooja@library.edu', 'Assistant Librarian')", [adminHash]);

                        // Categories
                        sqliteDb.run("INSERT INTO categories (category_name, description) VALUES ('Computer Science & Engineering', 'Core textbooks for CSE/IT students')");
                        sqliteDb.run("INSERT INTO categories (category_name, description) VALUES ('Data Science & Artificial Intelligence', 'Books covering ML, Neural Networks, and Big Data')");
                        sqliteDb.run("INSERT INTO categories (category_name, description) VALUES ('Mathematics & Discrete Structures', 'Applied mathematics, probability, and discrete structures')");
                        sqliteDb.run("INSERT INTO categories (category_name, description) VALUES ('Electronics & Hardware', 'Digital electronics, microprocessors, and computer organization')");
                        sqliteDb.run("INSERT INTO categories (category_name, description) VALUES ('Software Engineering & Web', 'Software life cycles, agile methodologies, and web engineering')");

                        // Students
                        sqliteDb.run("INSERT INTO students (roll_number, full_name, email, phone, department, semester, password_hash, status) VALUES ('23CS001', 'Aarav Patel', 'aarav.patel@college.edu', '9876543210', 'CSE', 4, ?, 'Active')", [studentHash]);
                        sqliteDb.run("INSERT INTO students (roll_number, full_name, email, phone, department, semester, password_hash, status) VALUES ('23CS015', 'Sneha Kulkarni', 'sneha.k@college.edu', '9876543211', 'CSE', 4, ?, 'Active')", [studentHash]);
                        sqliteDb.run("INSERT INTO students (roll_number, full_name, email, phone, department, semester, password_hash, status) VALUES ('23CS042', 'Rohan Gupta', 'rohan.gupta@college.edu', '9876543212', 'CSE', 4, ?, 'Active')", [studentHash]);
                        sqliteDb.run("INSERT INTO students (roll_number, full_name, email, phone, department, semester, password_hash, status) VALUES ('23CS088', 'Ananya Iyer', 'ananya.iyer@college.edu', '9876543213', 'CSE', 4, ?, 'Active')", [studentHash]);
                        sqliteDb.run("INSERT INTO students (roll_number, full_name, email, phone, department, semester, password_hash, status) VALUES ('23CS105', 'Vikram Singh', 'vikram.singh@college.edu', '9876543214', 'CSE', 4, ?, 'Blocked')", [studentHash]);

                        // Books
                        sqliteDb.run("INSERT INTO books (isbn, title, author, category_id, publisher, publish_year, total_copies, available_copies, shelf_location) VALUES ('978-0078022159', 'Database System Concepts', 'Abraham Silberschatz, Henry F. Korth, S. Sudarshan', 1, 'McGraw-Hill Education', 2020, 6, 4, 'Rack-B1-01')");
                        sqliteDb.run("INSERT INTO books (isbn, title, author, category_id, publisher, publish_year, total_copies, available_copies, shelf_location) VALUES ('978-0133594140', 'Operating System Concepts', 'Abraham Silberschatz, Peter B. Galvin, Greg Gagne', 1, 'Wiley', 2018, 5, 4, 'Rack-B1-02')");
                        sqliteDb.run("INSERT INTO books (isbn, title, author, category_id, publisher, publish_year, total_copies, available_copies, shelf_location) VALUES ('978-0262033848', 'Introduction to Algorithms (CLRS)', 'Thomas H. Cormen, Charles E. Leiserson, Ronald L. Rivest', 1, 'MIT Press', 2009, 8, 7, 'Rack-B1-03')");
                        sqliteDb.run("INSERT INTO books (isbn, title, author, category_id, publisher, publish_year, total_copies, available_copies, shelf_location) VALUES ('978-0130661029', 'Computer Networks', 'Andrew S. Tanenbaum, David J. Wetherall', 1, 'Pearson', 2011, 4, 3, 'Rack-B1-04')");
                        sqliteDb.run("INSERT INTO books (isbn, title, author, category_id, publisher, publish_year, total_copies, available_copies, shelf_location) VALUES ('978-0134685991', 'Effective Java', 'Joshua Bloch', 5, 'Addison-Wesley', 2018, 4, 4, 'Rack-B2-01')");
                        sqliteDb.run("INSERT INTO books (isbn, title, author, category_id, publisher, publish_year, total_copies, available_copies, shelf_location) VALUES ('978-0132350884', 'Clean Code', 'Robert C. Martin', 5, 'Prentice Hall', 2008, 5, 5, 'Rack-B2-02')");
                        sqliteDb.run("INSERT INTO books (isbn, title, author, category_id, publisher, publish_year, total_copies, available_copies, shelf_location) VALUES ('978-0136042594', 'Artificial Intelligence: A Modern Approach', 'Stuart Russell, Peter Norvig', 2, 'Pearson', 2020, 3, 2, 'Rack-B3-01')");
                        sqliteDb.run("INSERT INTO books (isbn, title, author, category_id, publisher, publish_year, total_copies, available_copies, shelf_location) VALUES ('978-1449369415', 'Python Data Science Handbook', 'Jake VanderPlas', 2, \"O'Reilly Media\", 2016, 4, 4, 'Rack-B3-02')");

                        // Issues
                        sqliteDb.run("INSERT INTO book_issues (book_id, student_id, admin_id, issue_date, due_date, return_date, fine_amount, status, remarks) VALUES (1, 1, 1, date('now', '-20 days'), date('now', '-6 days'), NULL, 30.00, 'Overdue', 'First notice sent to student')");
                        sqliteDb.run("INSERT INTO book_issues (book_id, student_id, admin_id, issue_date, due_date, return_date, fine_amount, status, remarks) VALUES (2, 2, 1, date('now', '-5 days'), date('now', '+9 days'), NULL, 0.00, 'Issued', 'Mid-term reference')");
                        sqliteDb.run("INSERT INTO book_issues (book_id, student_id, admin_id, issue_date, due_date, return_date, fine_amount, status, remarks) VALUES (4, 1, 1, date('now', '-2 days'), date('now', '+12 days'), NULL, 0.00, 'Issued', 'Lab project assignment')");
                        sqliteDb.run("INSERT INTO book_issues (book_id, student_id, admin_id, issue_date, due_date, return_date, fine_amount, status, remarks) VALUES (7, 3, 2, date('now', '-30 days'), date('now', '-16 days'), date('now', '-15 days'), 5.00, 'Returned', 'Returned with 1 day late fee paid')");
                    }
                    resolve();
                });
            });
        });
    });
}

// Execute queries on SQLite with promise wrapper
function executeSqlite(sql, params = []) {
    return new Promise((resolve, reject) => {
        const translated = translateSqlForSqlite(sql);
        const trimmed = translated.trim();
        const isSelect = /^SELECT\b/i.test(trimmed) || /^PRAGMA\b/i.test(trimmed);

        if (isSelect) {
            sqliteDb.all(translated, params || [], (err, rows) => {
                if (err) return reject(err);
                resolve([rows, []]);
            });
        } else {
            sqliteDb.run(translated, params || [], function (err) {
                if (err) return reject(err);
                const result = {
                    insertId: this.lastID,
                    affectedRows: this.changes
                };
                resolve([result, []]);
            });
        }
    });
}

// Initialize database connection
async function init() {
    if (isInitialized) return;

    try {
        // Attempt MySQL connection
        mysqlPool = mysql.createPool(mysqlConfig);
        const connection = await mysqlPool.getConnection();
        connection.release();
        useSQLite = false;
        isInitialized = true;
        console.log('\x1b[32m  ✔\x1b[0m Database: MySQL connected (' + mysqlConfig.database + ')');
    } catch (err) {
        // MySQL is not running -> Activate built-in SQLite engine
        useSQLite = true;
        await initSqliteSchema();
        isInitialized = true;
        console.log('\x1b[32m  ✔\x1b[0m Database: Local Engine Active (Zero-setup ready)');
    }
}

// Unified query wrapper
async function query(sql, params) {
    if (!isInitialized) await init();
    if (useSQLite) {
        return executeSqlite(sql, params);
    } else {
        return mysqlPool.query(sql, params);
    }
}

// Unified execute wrapper
async function execute(sql, params) {
    if (!isInitialized) await init();
    if (useSQLite) {
        return executeSqlite(sql, params);
    } else {
        return mysqlPool.execute(sql, params);
    }
}

// Transaction Connection Object for ACID compliance
const poolMock = {
    async getConnection() {
        if (!isInitialized) await init();
        if (useSQLite) {
            return {
                async beginTransaction() {
                    return executeSqlite('BEGIN TRANSACTION');
                },
                async execute(sql, params) {
                    return executeSqlite(sql, params);
                },
                async query(sql, params) {
                    return executeSqlite(sql, params);
                },
                async commit() {
                    return executeSqlite('COMMIT');
                },
                async rollback() {
                    return executeSqlite('ROLLBACK');
                },
                release() {
                    // No-op for SQLite
                }
            };
        } else {
            return mysqlPool.getConnection();
        }
    }
};

async function testConnection() {
    if (!isInitialized) await init();
    return true;
}

module.exports = {
    pool: poolMock,
    query,
    execute,
    testConnection
};
