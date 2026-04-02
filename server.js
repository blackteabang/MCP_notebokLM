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
const NOTEBOOK_ALIAS = process.env.NOTEBOOK_ALIAS || 'notee';
const SERVICE_NAME = process.env.SERVICE_NAME || 'NotebookLM Web Proxy';
const SERVICE_SUBTITLE = process.env.SERVICE_SUBTITLE || '규정, 가이드, 사내 문서 등 어떤 내용이든 부담 없이 물어보세요';
const AUTH_REQUIRED = process.env.AUTH_REQUIRED !== 'false'; // Default to true
const USERS_FILE = path.join(__dirname, process.env.USERS_FILENAME || 'users.json');
const QUERIES_FILE = path.join(__dirname, 'queries.json');

// Ensure files exist
if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify([]));
}
if (!fs.existsSync(QUERIES_FILE)) {
    fs.writeFileSync(QUERIES_FILE, JSON.stringify([]));
}

app.use(cors());
app.use(express.json());

// Redirect /admin to admin.html for convenience
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

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

// Helper to save query
function saveQuery(username, alias, prompt, result) {
    try {
        const queries = JSON.parse(fs.readFileSync(QUERIES_FILE, 'utf8'));
        queries.push({
            timestamp: new Date().toISOString(),
            username,
            alias,
            prompt,
            resultPrefix: result ? result.substring(0, 100) + '...' : ''
        });
        fs.writeFileSync(QUERIES_FILE, JSON.stringify(queries, null, 2));
    } catch (e) {
        console.error("Error saving query log:", e);
    }
}

// --- Config & Auth Routes ---

app.get('/api/config', (req, res) => {
    res.json({
        serviceName: SERVICE_NAME,
        serviceSubtitle: SERVICE_SUBTITLE,
        authRequired: AUTH_REQUIRED
    });
});

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
        passwordHash: hashPassword(password),
        role: 'user',
        approved: false // Requirement: Admin must approve
    };

    users.push(newUser);
    saveUsers(users);

    res.json({ message: '가입 신청이 완료되었습니다. 관리자 승인 후 로그인 가능합니다.', username: newUser.username });
});

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

    const users = getUsers();
    const user = users.find(u => u.username === username);

    if (!user || user.passwordHash !== hashPassword(password)) {
        return res.status(401).json({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' });
    }

    if (!user.approved) {
        return res.status(403).json({ error: '아직 관리자의 승인을 받지 못한 계정입니다. 잠시만 기다려 주세요.' });
    }

    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.role = user.role || 'user';
    res.json({ message: 'Login successful', username: user.username, role: user.role });
});

app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ message: 'Logged out successfully' });
});

app.get('/api/me', (req, res) => {
    if (req.session.userId) {
        return res.json({ 
            loggedIn: true, 
            username: req.session.username,
            role: req.session.role 
        });
    }
    
    // If auth is not required, provide a guest session automatically
    if (!AUTH_REQUIRED) {
        return res.json({ 
            loggedIn: true, 
            username: 'Guest', 
            role: 'user' 
        });
    }
    
    return res.json({ loggedIn: false });
});

// Middleware to protect admin routes
function requireAdmin(req, res, next) {
    if (!req.session.userId || req.session.role !== 'admin') {
        return res.status(403).json({ error: '관리자 권한이 필요합니다.' });
    }
    next();
}

// --- Admin Routes ---

app.get('/api/admin/users', requireAdmin, (req, res) => {
    const users = getUsers();
    // Don't return hashes
    const sanitized = users.map(u => ({ id: u.id, username: u.username, role: u.role, approved: u.approved }));
    res.json(sanitized);
});

app.get('/api/admin/stats', requireAdmin, (req, res) => {
    try {
        const queries = JSON.parse(fs.readFileSync(QUERIES_FILE, 'utf8'));
        // Return last 200 queries
        res.json(queries.slice(-200).reverse());
    } catch (e) {
        res.status(500).json({ error: 'Failed to read stats' });
    }
});

app.post('/api/admin/approve', requireAdmin, (req, res) => {
    const { userId } = req.body;
    console.log(`[ADMIN] Approving user ID: ${userId}`);
    let users = getUsers();
    const user = users.find(u => u.id === userId);
    if (user) {
        user.approved = true;
        saveUsers(users);
        res.json({ message: 'User approved successfully' });
    } else {
        console.error(`[ADMIN] User not found: ${userId}`);
        res.status(404).json({ error: 'User not found' });
    }
});

app.post('/api/admin/reject', requireAdmin, (req, res) => {
    const { userId } = req.body;
    console.log(`[ADMIN] Rejecting/Deleting user ID: ${userId}`);
    let users = getUsers();
    const filtered = users.filter(u => u.id !== userId);
    if (users.length !== filtered.length) {
        saveUsers(filtered);
        res.json({ message: 'User rejected and removed' });
    } else {
        console.error(`[ADMIN] User not found for deletion: ${userId}`);
        res.status(404).json({ error: 'User not found' });
    }
});

// Middleware to protect routes
function requireAuth(req, res, next) {
    if (!AUTH_REQUIRED) return next();
    
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

    console.log(`[QUERY] [Alias: ${NOTEBOOK_ALIAS}] User '${req.session.username}' asked: ${userPrompt}`);

    // Execute the actual NLM CLI command: nlm query notebook <alias> "..."
    const cmd = `"${NLM_PATH}" query notebook ${NOTEBOOK_ALIAS} "${userPrompt.replace(/"/g, '\\"')}"`;
    
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
        
        // Log the query
        saveQuery(req.session.username || 'Guest', NOTEBOOK_ALIAS, userPrompt, finalResult);
        
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
