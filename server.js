const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const session = require('express-session');

const app = express();
const PORT = process.env.PORT || 3000;

// Path to the NLM CLI installed via Python
const NLM_PATH = 'C:\\Users\\hyban.DESKTOP-T81OV0G\\AppData\\Roaming\\Python\\Python314\\Scripts\\nlm.exe';
const NOTEBOOK_ALIAS = 'notee';
const USERS_FILE = path.join(__dirname, 'users.json');

// Ensure users.json exists
if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify([]));
}

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Session Setup
app.use(session({
    secret: 'notebooklm-super-secret-key-xyz123',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false, // Set true if using HTTPS
        maxAge: 1000 * 60 * 60 * 24 // 1 day
    }
}));

// Helper to read users
function getUsers() {
    try {
        const data = fs.readFileSync(USERS_FILE, 'utf8');
        return JSON.parse(data);
    } catch(e) {
        return [];
    }
}

// Helper to save users
function saveUsers(users) {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// Helper to hash password
function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

// --- Auth Routes ---

app.post('/api/register', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

    let users = getUsers();
    if (users.find(u => u.username === username)) {
        return res.status(400).json({ error: 'Username already exists' });
    }

    const newUser = {
        id: Date.now().toString(),
        username,
        passwordHash: hashPassword(password)
    };

    users.push(newUser);
    saveUsers(users);

    // Auto login after register
    req.session.userId = newUser.id;
    req.session.username = newUser.username;

    res.json({ message: 'Registration successful', username: newUser.username });
});

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

    const users = getUsers();
    const user = users.find(u => u.username === username);

    if (!user || user.passwordHash !== hashPassword(password)) {
        return res.status(401).json({ error: 'Invalid username or password' });
    }

    req.session.userId = user.id;
    req.session.username = user.username;
    res.json({ message: 'Login successful', username: user.username });
});

app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ message: 'Logged out successfully' });
});

app.get('/api/me', (req, res) => {
    if (req.session.userId) {
        return res.json({ loggedIn: true, username: req.session.username });
    }
    return res.json({ loggedIn: false });
});

// Middleware to protect routes
function requireAuth(req, res, next) {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Unauthorized. Please log in.' });
    }
    next();
}

// --- NotebookLM Route ---

app.post('/api/query', requireAuth, (req, res) => {
    const userPrompt = req.body.prompt;
    
    if (!userPrompt) {
        return res.status(400).json({ error: 'Prompt is required' });
    }

    console.log(`[QUERY] User '${req.session.username}' asked: ${userPrompt}`);

    // Execute the actual NLM CLI command: nlm query notebook notee "..."
    const cmd = `"${NLM_PATH}" query notebook notee "${userPrompt.replace(/"/g, '\\"')}"`;
    
    exec(cmd, { 
        env: { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1' },
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer to prevent overflow
    }, (error, stdout, stderr) => {
        if (error) {
            console.error(`[NLM Process Error]:`, error);
            // It could be a CLI error, but let's still parse stdout just in case
        }
        
        // The NLM CLI might output raw JSON containing the answer.
        let output = stdout || stderr || '';
        let finalResult = output.trim();
        
        try {
            // Try extracting JSON if there is extra CLI logging around it
            const jsonMatch = finalResult.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                if (parsed && parsed.value && parsed.value.answer) {
                    finalResult = parsed.value.answer;
                } else if (parsed && parsed.answer) {
                     finalResult = parsed.answer;
                }
            }
        } catch (e) {
            console.error("[JSON Parse Error]", e);
            // If parsing fails, just return the raw text
        }
        
        res.json({ result: finalResult });
    });
});

app.listen(PORT, () => {
    console.log(`===============================================`);
    console.log(`🚀 NotebookLM Web Proxy is running on port ${PORT}`);
    console.log(`🔒 Authentication enabled.`);
    console.log(`🌐 Application URL: http://localhost:${PORT}`);
    console.log(`===============================================`);
});
