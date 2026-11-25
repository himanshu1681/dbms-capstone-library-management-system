/**
 * Library Management System (DBMS Capstone)
 * Server Entry Point - Node.js + Express.js + MySQL
 * Built for 2nd-Year B.Tech CSE Database Management Systems Lab
 */

const express = require('express');
const session = require('express-session');
const path = require('path');
require('dotenv').config();

const db = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const studentRoutes = require('./routes/studentRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Set up View Engine (EJS)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware for parsing request bodies and serving static files
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Session Configuration
app.use(session({
    secret: process.env.SESSION_SECRET || 'library_secret_key_2026',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 60 * 4, // 4 hours session
        httpOnly: true,
        sameSite: 'lax'
    }
}));

// Flash Message & Current User Global Middleware for all EJS templates
app.use((req, res, next) => {
    res.locals.currentUser = req.session.user || null;
    res.locals.successMessage = req.session.successMessage || null;
    res.locals.errorMessage = req.session.errorMessage || null;
    res.locals.currentPath = req.path;
    
    // Clear flash messages once passed to views
    delete req.session.successMessage;
    delete req.session.errorMessage;
    next();
});

// Home / Landing Page
app.get('/', async (req, res) => {
    try {
        // Quick public stats and book search preview
        let stats = { total_books: 0, available_copies: 0, categories: 0, students: 0 };
        let featuredBooks = [];
        let categories = [];

        try {
            const [[st]] = await db.query(`
                SELECT 
                    (SELECT COUNT(*) FROM books) AS total_books,
                    (SELECT COALESCE(SUM(available_copies), 0) FROM books) AS available_copies,
                    (SELECT COUNT(*) FROM categories) AS categories,
                    (SELECT COUNT(*) FROM students) AS students
            `);
            if (st) stats = st;

            const [books] = await db.query(`
                SELECT b.book_id, b.isbn, b.title, b.author, c.category_name, b.available_copies, b.shelf_location
                FROM books b
                JOIN categories c ON b.category_id = c.category_id
                ORDER BY b.book_id ASC
                LIMIT 6
            `);
            featuredBooks = books;

            const [cats] = await db.query('SELECT category_id, category_name FROM categories ORDER BY category_name ASC');
            categories = cats;
        } catch (dbErr) {
            console.warn('Notice: MySQL queries bypassed on landing page until DB is connected:', dbErr.message);
        }

        res.render('index', {
            title: 'Welcome - College Library Management System',
            stats,
            featuredBooks,
            categories
        });
    } catch (err) {
        console.error('Home Page Error:', err);
        res.render('index', {
            title: 'College Library Management System',
            stats: { total_books: 0, available_copies: 0, categories: 0, students: 0 },
            featuredBooks: [],
            categories: []
        });
    }
});

// Mount Routes
app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);
app.use('/student', studentRoutes);

// 404 Handler
app.use((req, res) => {
    res.status(404).render('index', {
        title: '404 - Page Not Found',
        stats: { total_books: 0, available_copies: 0, categories: 0, students: 0 },
        featuredBooks: [],
        categories: []
    });
});

// 500 Error Handler
app.use((err, req, res, next) => {
    console.error('Internal Server Error:', err.stack);
    res.status(500).send(`
        <div style="font-family: Arial, sans-serif; padding: 40px; text-align: center;">
            <h2 style="color: #dc3545;">⚠️ An Internal Error Occurred</h2>
            <p>${err.message}</p>
            <a href="/" style="display: inline-block; margin-top: 15px; padding: 10px 20px; background: #0d6efd; color: white; text-decoration: none; border-radius: 5px;">Back to Home</a>
        </div>
    `);
});

// Start Server
app.listen(PORT, async () => {
    const url = `http://localhost:${PORT}/`;
    
    console.log(`\n\x1b[32m  ➜\x1b[0m  \x1b[1mLocal:\x1b[0m   \x1b[36m\x1b[4m${url}\x1b[0m`);
    console.log(`\x1b[32m  ➜\x1b[0m  \x1b[2mNetwork: http://127.0.0.1:${PORT}/\x1b[0m`);
    console.log(`\x1b[90m  ➜  Press Ctrl+C to stop the server\x1b[0m\n`);
    
    // Auto-open browser on Windows so you don't have to copy-paste
    if (process.platform === 'win32') {
        const { exec } = require('child_process');
        exec(`start ${url}`, () => {});
    }

    // Check database connection
    await db.testConnection();
});
