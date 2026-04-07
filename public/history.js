document.addEventListener("DOMContentLoaded", () => {
    const historyList = document.getElementById("history-list");
    const refreshBtn = document.getElementById("refresh-btn");

    async function loadHistory() {
        try {
            historyList.innerHTML = `<tr><td colspan="4" style="text-align:center; padding: 40px; color: var(--text-muted);">질문 내역을 불러오는 중...</td></tr>`;
            const res = await fetch("/api/history");
            if (!res.ok) throw new Error("로드 실패");
            const history = await res.json();
            renderHistory(history);
        } catch (e) {
            console.error(e);
            historyList.innerHTML = `<tr><td colspan="4" style="text-align:center; padding: 40px; color: var(--error-text);">질문 내역을 불러오는 중 오류가 발생했습니다.</td></tr>`;
        }
    }

    function renderHistory(items) {
        historyList.innerHTML = "";
        
        if (items.length === 0) {
            historyList.innerHTML = `<tr><td colspan="4" style="text-align:center; padding: 40px; color: var(--text-muted);">아직 질문 내역이 없습니다. 첫 질문을 남겨보세요!</td></tr>`;
            return;
        }

        items.forEach(q => {
            const tr = document.createElement("tr");
            
            // Format Timestamp
            const date = new Date(q.timestamp).toLocaleString();
            
            // Friendly Alias name if possible (esg -> 리맨, replus -> 리플러스)
            const serviceName = q.alias === 'notee' ? '리맨 지식 AI' : (q.alias === 'replus' ? '리플러스 AI' : q.alias);
            
            tr.innerHTML = `
                <td class="time-col">${date}</td>
                <td class="user-col">${q.username}</td>
                <td><span class="service-badge">${serviceName}</span></td>
                <td class="prompt-col">${q.prompt}</td>
            `;
            historyList.appendChild(tr);
        });
    }

    if (refreshBtn) {
        refreshBtn.addEventListener("click", loadHistory);
    }

    // Initial load
    loadHistory();

    // Auto-refresh every 30 seconds
    setInterval(loadHistory, 30000);
});
