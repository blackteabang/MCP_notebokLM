document.addEventListener("DOMContentLoaded", () => {
    // Auth Elements (REMOVED)
    const mainScreen = document.getElementById("main-screen");

    // Chat Elements
    const chatForm = document.getElementById("chat-form");
    const userInput = document.getElementById("user-input");
    const chatMessages = document.getElementById("chat-messages");
    const typingIndicator = document.getElementById("typing-indicator");

    // Nickname Elements
    const nicknameOverlay = document.getElementById("nickname-overlay");
    const nicknameForm = document.getElementById("nickname-form");
    const nicknameInput = document.getElementById("nickname-input");

    // Options for marked.js
    marked.setOptions({ breaks: true, gfm: true, headerIds: false });

    // 1. Fetch Config and Initialize
    initApp();

    async function initApp() {
        try {
            // Check session first
            const meRes = await fetch('/api/me');
            const meData = await meRes.json();

            // Fetch service configuration
            const configRes = await fetch('/api/config');
            const config = await configRes.json();
            
            // Update UI with service name
            const name = config.serviceName || "NotebookLM Assistant";
            const subtitle = config.serviceSubtitle || "규정, 가이드, 사내 문서 등 어떤 내용이든 부담 없이 물어보세요";
            document.title = name;
            document.getElementById("main-service-name").textContent = name;
            document.getElementById("main-subtitle").textContent = subtitle;

            if (meData.loggedIn && meData.username) {
                showChat(meData.username, name);
            } else {
                showNicknameModal();
            }
        } catch (e) {
            console.error("Config fetch error", e);
            showNicknameModal();
        }
    }

    function showNicknameModal() {
        nicknameOverlay.classList.remove("hidden");
        mainScreen.classList.add("hidden");
    }

    function showChat(nickname, serviceName) {
        nicknameOverlay.classList.add("hidden");
        mainScreen.classList.remove("hidden");
        document.getElementById("welcome-message").textContent = `안녕하세요, ${nickname}님! ${serviceName} 입니다. 무엇이 궁금하세요?`;
    }

    nicknameForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const nickname = nicknameInput.value.trim();
        if (!nickname) return;

        try {
            const res = await fetch('/api/set-nickname', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nickname })
            });

            if (res.ok) {
                const configRes = await fetch('/api/config');
                const config = await configRes.json();
                showChat(nickname, config.serviceName || "NotebookLM Assistant");
            } else {
                alert("닉네임을 설정하는 데 실패했습니다.");
            }
        } catch (e) {
            console.error("Nickname set error", e);
            alert("서버 통신 중 오류가 발생했습니다.");
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
