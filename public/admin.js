document.addEventListener("DOMContentLoaded", async () => {
    const userList = document.getElementById("user-list");
    const userTable = document.getElementById("user-table");
    const loader = document.getElementById("loader");
    const deniedMsg = document.getElementById("denied-msg");

    // 1. Verify Admin Access
    async function checkAdmin() {
        try {
            const res = await fetch("/api/me");
            const data = await res.json();
            if (data.loggedIn && data.role === "admin") {
                loadUsers();
            } else {
                showDenied();
            }
        } catch (e) {
            showDenied();
        }
    }

    function showDenied() {
        loader.classList.add("hidden");
        deniedMsg.classList.remove("hidden");
    }

    // 2. Load Users
    async function loadUsers() {
        try {
            const res = await fetch("/api/admin/users");
            if (!res.ok) throw new Error("Unauthorized");
            const users = await res.json();
            
            renderUsers(users);
            loader.classList.add("hidden");
            userTable.classList.remove("hidden");
        } catch (e) {
            console.error(e);
            showDenied();
        }
    }

    function renderUsers(users) {
        userList.innerHTML = "";
        users.forEach(user => {
            const tr = document.createElement("tr");
            
            const statusClass = user.approved ? "status-approved" : "status-pending";
            const statusText = user.approved ? "승인됨" : "대기 중";
            
            // Only show action buttons for non-admin users that are NOT approved
            let actionHtml = "";
            if (user.role !== "admin") {
                if (!user.approved) {
                    actionHtml = `
                        <button class="action-btn approve-btn" onclick="approveUser('${user.id}')">승인</button>
                        <button class="action-btn reject-btn" onclick="rejectUser('${user.id}')">거절/삭제</button>
                    `;
                } else {
                    actionHtml = `<button class="action-btn reject-btn" onclick="rejectUser('${user.id}')">삭제</button>`;
                }
            } else {
                actionHtml = `<span style="font-size:12px; opacity:0.5;">관리자 계정</span>`;
            }

            tr.innerHTML = `
                <td>${user.username}</td>
                <td>${user.role}</td>
                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                <td>${actionHtml}</td>
            `;
            userList.appendChild(tr);
        });
    }

    // 3. Action Handlers (Globally accessible)
    window.approveUser = async (userId) => {
        if (!confirm("이 사용자를 승인하시겠습니까?")) return;
        try {
            const res = await fetch("/api/admin/approve", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId })
            });
            const data = await res.json();
            if (res.ok) {
                alert("사용자가 승인되었습니다.");
                loadUsers();
            } else {
                alert("승인 오류: " + (data.error || "알 수 없는 오류"));
            }
        } catch (e) {
            alert("처리 중 오류가 발생했습니다.");
        }
    };

    window.rejectUser = async (userId) => {
        if (!confirm("정말 이 사용자를 삭제하시겠습니까?")) return;
        try {
            const res = await fetch("/api/admin/reject", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId })
            });
            const data = await res.json();
            if (res.ok) {
                alert("사용자가 거절/삭제되었습니다.");
                loadUsers();
            } else {
                alert("삭제 오류: " + (data.error || "알 수 없는 오류"));
            }
        } catch (e) {
            alert("처리 중 오류가 발생했습니다.");
        }
    };

    checkAdmin();
});
