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

    // 1. Check Session on Load
    checkSession();

    // --- Authentication Logic ---

    async function checkSession() {
        try {
            const res = await fetch('/api/me');
            const data = await res.json();
            if (data.loggedIn) {
                showMainScreen(data.username);
            } else {
                showAuthScreen();
            }
        } catch (e) {
            showAuthScreen();
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
        welcomeUserSpan.textContent = username;
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
                showMainScreen(data.username);
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
            chatMessages.innerHTML = `
                <div class="message system-msg">
                    <div class="avatar">🤖</div>
                    <div class="msg-content">안녕하세요, <strong id="welcome-user"></strong>님! 저는 사내 데이터를 모두 알고 있는 지식 비서입니다. 무엇을 도와드릴까요?</div>
                </div>
            `;
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
                const htmlContent = marked.parse(data.result);
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
