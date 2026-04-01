document.addEventListener("DOMContentLoaded", () => {
    // Auth Elements
    const authScreen = document.getElementById("auth-screen");
    const mainScreen = document.getElementById("main-screen");
    const authForm = document.getElementById("auth-form");
    const authError = document.getElementById("auth-error");
    const authUsernameInput = document.getElementById("auth-username");
    const authPasswordInput = document.getElementById("auth-password");
    const loginBtn = document.getElementById("login-btn");
    const registerBtn = document.getElementById("register-btn");
    const logoutBtn = document.getElementById("logout-btn");
    const currentUserSpan = document.getElementById("current-user");
    const welcomeUserSpan = document.getElementById("welcome-user");

    // Chat Elements
    const chatForm = document.getElementById("chat-form");
    const userInput = document.getElementById("user-input");
    const chatMessages = document.getElementById("chat-messages");
    const typingIndicator = document.getElementById("typing-indicator");

    // Options for marked.js
    marked.setOptions({ breaks: true, gfm: true, headerIds: false });

    // 1. Fetch Config and Check Session
    initApp();

    async function initApp() {
        try {
            // Fetch service configuration
            const configRes = await fetch('/api/config');
            const config = await configRes.json();
            
            // Update UI with service name
            const name = config.serviceName || "NotebookLM Assistant";
            const subtitle = config.serviceSubtitle || "규정, 가이드, 사내 문서 등 어떤 내용이든 부담 없이 물어보세요";
            document.title = name;
            document.getElementById("auth-service-name").textContent = name;
            document.getElementById("main-service-name").textContent = name;
            document.getElementById("main-subtitle").textContent = subtitle;
            document.getElementById("welcome-message").textContent = `안녕하세요. ${name} 입니다. 무엇이 궁금하세요?`;
            
            if (!config.authRequired) {
                logoutBtn.classList.add("hidden");
                document.getElementById("auth-subtitle").textContent = subtitle;
            }

            // Check if already logged in
            await checkSession(config.authRequired);
        } catch (e) {
            console.error("Config fetch error", e);
            checkSession(true);
        }
    }

    async function checkSession(authRequired) {
        try {
            const res = await fetch('/api/me');
            const data = await res.json();
            if (data.loggedIn) {
                showMainScreen(data.username);
            } else if (authRequired) {
                showAuthScreen();
            } else {
                // If not logged in but auth not required (shouldn't happen with updated /api/me)
                showMainScreen("Guest");
            }
        } catch (e) {
            if (authRequired) showAuthScreen();
            else showMainScreen("Guest");
        }
    }

    function showAuthScreen() {
        mainScreen.classList.add("hidden");
        authScreen.classList.remove("hidden");
        authError.classList.add("hidden");
        authForm.reset();
    }

    function showMainScreen(username) {
        authScreen.classList.add("hidden");
        mainScreen.classList.remove("hidden");
        currentUserSpan.textContent = `(${username})`;
        if (welcomeUserSpan) {
            welcomeUserSpan.textContent = username;
        }
    }

    function displayError(msg) {
        authError.textContent = msg;
        authError.classList.remove("hidden");
    }

    // Login logic
    authForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const username = authUsernameInput.value.trim();
        const password = authPasswordInput.value.trim();
        if (!username || !password) return;

        loginBtn.disabled = true;
        loginBtn.textContent = '로그인 중...';

        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            
            if (res.ok) {
                showMainScreen(data.username);
            } else {
                displayError(data.error || '로그인에 실패했습니다.');
            }
        } catch (e) {
            displayError('네트워크 오류가 발생했습니다.');
        } finally {
            loginBtn.disabled = false;
            loginBtn.textContent = '로그인';
        }
    });

    // Register logic
    registerBtn.addEventListener('click', async () => {
        const username = authUsernameInput.value.trim();
        const password = authPasswordInput.value.trim();
        if (!username || !password) {
            displayError("아이디와 비밀번호를 모두 입력해주세요.");
            return;
        }

        registerBtn.disabled = true;
        registerBtn.textContent = '가입 및 로그인 진행 중...';

        try {
            const res = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            
            if (res.ok) {
                // Show success message and reset form instead of auto-login
                alert(data.message || '가입 신청이 완료되었습니다. 관리자 승인 후 로그인 가능합니다.');
                authForm.reset();
            } else {
                displayError(data.error || '회원가입에 실패했습니다.');
            }
        } catch (e) {
            displayError('네트워크 오류가 발생했습니다.');
        } finally {
            registerBtn.disabled = false;
            registerBtn.textContent = '회원가입 및 시작하기';
        }
    });

    // Logout logic
    logoutBtn.addEventListener("click", async () => {
        try {
            await fetch('/api/logout', { method: 'POST' });
            showAuthScreen();
            location.reload(); // Hard reload to clear everything
        } catch (e) {
            console.error(e);
        }
    });

    // --- Chat Logic ---

    chatForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        
        const text = userInput.value.trim();
        if (!text) return;

        addMessage(text, 'user-msg');
        userInput.value = "";
        showTyping(true);

        try {
            const response = await fetch('/api/query', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: text })
            });

            const data = await response.json();
            showTyping(false);

            if (response.ok && data.result) {
                // Remove ** markers and [1], [2] style citations as requested by user
                const cleanResult = data.result
                    .replace(/\*\*/g, '')
                    .replace(/\s*\[\d+(?:,\s*\d+)*\]/g, '');
                
                const htmlContent = marked.parse(cleanResult);
                addHTMLMessage(htmlContent, 'system-msg');
            } else if (response.status === 401) {
                checkSession(); // Re-auth if session expired
            } else {
                addMessage(`❌ 오류: ${data.error || '답변을 가져오는 데 실패했습니다.'}`, 'system-msg');
            }
            
        } catch (error) {
            showTyping(false);
            console.error("Fetch Error:", error);
            addMessage(`❌ 서버 통신 중 네트워크 오류가 발생했습니다.`, 'system-msg');
        }
    });

    function addMessage(text, type) {
        const msgDiv = document.createElement("div");
        msgDiv.className = `message ${type}`;

        const avatar = document.createElement("div");
        avatar.className = "avatar";
        avatar.textContent = type === 'user-msg' ? "👤" : "🤖";

        const content = document.createElement("div");
        content.className = "msg-content";
        content.textContent = text; 

        msgDiv.appendChild(type === 'user-msg' ? content : avatar);
        msgDiv.appendChild(type === 'user-msg' ? avatar : content);

        chatMessages.appendChild(msgDiv);
        scrollToBottom();
    }

    function addHTMLMessage(html, type) {
        const msgDiv = document.createElement("div");
        msgDiv.className = `message ${type}`;

        const avatar = document.createElement("div");
        avatar.className = "avatar";
        avatar.textContent = type === 'user-msg' ? "👤" : "🤖";

        const content = document.createElement("div");
        content.className = "msg-content";
        content.innerHTML = html; 

        msgDiv.appendChild(type === 'user-msg' ? content : avatar);
        msgDiv.appendChild(type === 'user-msg' ? avatar : content);

        chatMessages.appendChild(msgDiv);
        scrollToBottom();
    }

    function showTyping(show) {
        if (show) {
            typingIndicator.classList.remove('hidden');
            chatMessages.appendChild(typingIndicator); 
        } else {
            typingIndicator.classList.add('hidden');
        }
        scrollToBottom();
    }

    function scrollToBottom() {
        const chatContainer = document.querySelector('.chat-container');
        if (chatContainer) {
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }
    }
});
