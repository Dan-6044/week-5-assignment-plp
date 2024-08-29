const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mysql = require('mysql');
const bcrypt = require('bcrypt'); // Import bcrypt for password hashing

const app = express();
const port = 3000;

app.use(cors());
app.use(bodyParser.json());

// Define your API routes here
app.get('/hello', (req, res) => {
    res.send('Hello, world!');
});

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: ' ',
    database: 'expense_tracker'
});

connection.connect(function (err) {
    if (err) {
        console.error('Error connecting to MySQL:', err);
        return;
    }
    console.log('Connected to MySQL!');
});

// User registration route with hashing
app.post('/register', (req, res) => {
    const { username, password } = req.body;

    // Validate input (e.g., check for empty fields)
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    // Hash password
    bcrypt.hash(password, 10, (err, hashedPassword) => {
        if (err) {
            console.error('Error hashing password:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }

        // Insert user into database with hashed password
        connection.query(
            'INSERT INTO users (username, password) VALUES (?, ?)',
            [username, hashedPassword],
            (err, result) => {
                if (err) {
                    console.error('Error registering user:', err);
                    return res.status(500).json({ error: 'Internal server error' });
                }

                res.status(201).json({ message: 'User registered successfully' });
            }
        );
    });
});

// User login route with password comparison
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password are required' });
    }

    // Find user by username
    connection.query(
        'SELECT * FROM users WHERE username = ?',
        [username],
        (err, results) => {
            if (err) {
                console.error('Error finding user:', err);
                return res.status(500).json({ error: 'Internal server error' });
            }

            if (results.length === 0) {
                return res.status(401).json({ error: 'Invalid username or password' });
            }

            const user = results[0];

            // Compare hashed passwords
            bcrypt.compare(password, user.password, (err, match) => {
                if (err) {
                    console.error('Error comparing passwords:', err);
                    return res.status(500).json({ error: 'Internal server error' });
                }

                if (!match) {
                    return res.status(401).json({ error: 'Invalid username or password' });
                }

                // Successful login (you can store a session token or JWT here)
                res.status(200).json({ message: 'Login successful' });
            });
        }
    );
});

app.post('/expenses', authMiddleware, (req, res) => {
    const { amount, date, category } = req.body;

    if (!amount || !date || !category) {
        return res.status(400).json({ error: 'Amount, date, and category are required' });
    }

    const userId = req.user.id;

    connection.query(
        'INSERT INTO expenses (user_id, amount, date, category) VALUES (?, ?, ?, ?)',
        [userId, amount, date, category],
        (err, result) => {
            if (err) {
                console.error('Error adding expense:', err);
                return res.status(500).json({ error: 'Internal server error' });
            }

            res.status(201).json({ message: 'Expense added successfully' });
        }
    );
});

app.get('/expenses', authMiddleware, (req, res) => {
    const userId = req.user.id;

    connection.query(
        'SELECT * FROM expenses WHERE user_id = ?',
        [userId],
        (err, results) => {
            if (err) {
                console.error('Error fetching expenses:', err);
                return res.status(500).json({ error: 'Internal server error' });
            }

            res.json(results);
        }
    );
});

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});