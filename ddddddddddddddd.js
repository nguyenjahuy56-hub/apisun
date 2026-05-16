const WebSocket = require('ws');
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

// Data cho Python cào
let apiResponseData = {
    "Phien": null, "Xuc_xac_1": null, "Xuc_xac_2": null, "Xuc_xac_3": null,
    "Tong": null, "Ket_qua": "", "id": "dd", "server_time": new Date().toISOString()
};

// Data cho Giao diện Dashboard V17
let dashboardData = {
    Phien: "Đang chờ...", Ket_qua: "--", Xuc_xac: [0,0,0], Tong: 0,
    ai_prediction: {
        result: "WAIT", confidence: 0, detail: "Đang phân tích...",
        win_rate: 0, total_played: 0, history: [] 
    }
};

let currentSessionId = null;

const WEBSOCKET_URL = "wss://websocket.azhkthg1.net/websocket?token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJnZW5kZXIiOjAsImNhblZpZXdTdGF0IjpmYWxzZSwiZGlzcGxheU5hbWUiOiJzb25ndmVkZW0yMCIsImJvdCI6MCwiaXNNZXJjaGFudCI6ZmFsc2UsInZlcmlmaWVkQmFua0FjY291bnQiOmZhbHNlLCJwbGF5RXZlbnRMb2JieSI6ZmFsc2UsImN1c3RvbWVySWQiOjIzOTk1MzIxNSwiYWZmSWQiOiJkZWZhdWx0IiwiYmFubmVkIjpmYWxzZSwiYnJhbmQiOiJzdW4ud2luIiwiZW1haWwiOiIiLCJ0aW1lc3RhbXAiOjE3Nzg5MjM4Mzk2NDQsImxvY2tHYW1lcyI6W10sImFtb3VudCI6MCwibG9ja0NoYXQiOmZhbHNlLCJwaG9uZVZlcmlmaWVkIjp0cnVlLCJpcEFkZHJlc3MiOiIyMDAxOmVlMDo0MzE1OmQxODA6MzQ1ODpkOGU5OmY2MDg6NjUyNyIsIm11dGUiOmZhbHNlLCJhdmF0YXIiOiJodHRwczovL2ltYWdlcy5zd2luc2hvcC5uZXQvaW1hZ2VzL2F2YXRhci9hdmF0YXJfMTAucG5nIiwicGxhdGZvcm1JZCI6MiwidXNlcklkIjoiMDAzNzQwNjgtOGJmYi00OTU2LTliMTItMjg5M2MzMTA3MTYwIiwiZW1haWxWZXJpZmllZCI6bnVsbCwicmVnVGltZSI6MTc0NTU5MjY1NTgwNywicGhvbmUiOiI4NDMyOTY4OTk3MSIsImRlcG9zaXQiOnRydWUsInVzZXJuYW1lIjoiU0Nfc29uZ3ZlZGVtMTAifQ.1F_19PpgqB4-XVh6NwsaTPrP8OAIWkSoBkAbPrAtLxI";
const WS_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Origin": "https://play.sun.win"
};

const initialMessages = [
    [1,"MiniGame","SC_songvedem10","Songvedem10",{"info":"{\"ipAddress\":\"2001:ee0:4315:d180:3458:d8e9:f608:6527\",\"wsToken\":\"eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJnZW5kZXIiOjAsImNhblZpZXdTdGF0IjpmYWxzZSwiZGlzcGxheU5hbWUiOiJzb25ndmVkZW0yMCIsImJvdCI6MCwiaXNNZXJjaGFudCI6ZmFsc2UsInZlcmlmaWVkQmFua0FjY291bnQiOmZhbHNlLCJwbGF5RXZlbnRMb2JieSI6ZmFsc2UsImN1c3RvbWVySWQiOjIzOTk1MzIxNSwiYWZmSWQiOiJkZWZhdWx0IiwiYmFubmVkIjpmYWxzZSwiYnJhbmQiOiJzdW4ud2luIiwiZW1haWwiOiIiLCJ0aW1lc3RhbXAiOjE3Nzg5MjM4Mzk2NDQsImxvY2tHYW1lcyI6W10sImFtb3VudCI6MCwibG9ja0NoYXQiOmZhbHNlLCJwaG9uZVZlcmlmaWVkIjp0cnVlLCJpcEFkZHJlc3MiOiIyMDAxOmVlMDo0MzE1OmQxODA6MzQ1ODpkOGU5OmY2MDg6NjUyNyIsIm11dGUiOmZhbHNlLCJhdmF0YXIiOiJodHRwczovL2ltYWdlcy5zd2luc2hvcC5uZXQvaW1hZ2VzL2F2YXRhci9hdmF0YXJfMTAucG5nIiwicGxhdGZvcm1JZCI6MiwidXNlcklkIjoiMDAzNzQwNjgtOGJmYi00OTU2LTliMTItMjg5M2MzMTA3MTYwIiwiZW1haWxWZXJpZmllZCI6bnVsbCwicmVnVGltZSI6MTc0NTU5MjY1NTgwNywicGhvbmUiOiI4NDMyOTY4OTk3MSIsImRlcG9zaXQiOnRydWUsInVzZXJuYW1lIjoiU0Nfc29uZ3ZlZGVtMTAifQ.1F_19PpgqB4-XVh6NwsaTPrP8OAIWkSoBkAbPrAtLxI\",\"locale\":\"vi\",\"userId\":\"00374068-8bfb-4956-9b12-2893c3107160\",\"username\":\"SC_songvedem10\",\"timestamp\":1778923839653,\"refreshToken\":\"5e048d7d51b445f3b49431094e74fdbd.9382a58d21644b41ac6142d5b3d33a00\"}","signature":"772221EF65224B5C211DDB703B1CA46F34505CF672C66D70AEF0F4D24C162777FE72B568EEDE51A3B465189369C42F5B61313F6C9246DC2B76DD9CFAA3848A344D8B2DF0B3E2CEBB609F7A2D3626445DB9BF77C1570CC6807889356A844A7D0FA294EE6D2DC54AF4769549AA481A6C7F179DF785D56C422C7A93A883C67C3047"}],
    [6,"MiniGame","taixiuPlugin",{cmd:1005}],
    [6,"MiniGame","lobbyPlugin",{cmd:10001}]
];

let ws = null;

function connectWebSocket() {
    if (ws) { ws.removeAllListeners(); ws.close(); }
    ws = new WebSocket(WEBSOCKET_URL, { headers: WS_HEADERS });

    ws.on('open', () => {
        console.log('[✅] WebSocket connected to Sun.Win');
        initialMessages.forEach((msg, i) => {
            setTimeout(() => {
                if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
            }, i * 600);
        });
        setInterval(() => { if (ws.readyState === WebSocket.OPEN) ws.ping(); }, 15000);
    });

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            if (!Array.isArray(data) || typeof data[1] !== 'object') return;
            const { cmd, sid, d1, d2, d3, gBB } = data[1];

            if (cmd === 1008 && sid) {
                currentSessionId = sid;
                console.log(`[🎮] Phiên mới: ${sid}`);
            }

            if (cmd === 1003 && gBB) {
                if (!d1 || !d2 || !d3) return;
                const total = d1 + d2 + d3;
                const result = (total > 10) ? "Tài" : "Xỉu";

                // Cập nhật cho API Python
                apiResponseData = {
                    "Phien": currentSessionId, "Xuc_xac_1": d1, "Xuc_xac_2": d2, "Xuc_xac_3": d3,
                    "Tong": total, "Ket_qua": result, "id": "dark", "server_time": new Date().toISOString()
                };
                
                // Cập nhật cho UI Dashboard
                dashboardData.Phien = currentSessionId;
                dashboardData.Ket_qua = result;
                dashboardData.Tong = total;
                dashboardData.Xuc_xac = [d1, d2, d3];
                
                console.log(`[🎲] Phiên ${apiResponseData.Phien}: ${d1}-${d2}-${d3} = ${total} (${result})`);
                currentSessionId = null;
            }
        } catch (e) {
            console.error('[❌] Lỗi xử lý message:', e.message);
        }
    });

    ws.on('close', () => setTimeout(connectWebSocket, 2500));
    ws.on('error', () => ws.close());
}

// CÁC ROUTES API
app.post('/api/update-prediction', (req, res) => {
    dashboardData.ai_prediction = { ...dashboardData.ai_prediction, ...req.body };
    res.json({ success: true });
});

app.get('/api/ddvipro', (req, res) => res.json(apiResponseData));
app.get('/api/data', (req, res) => res.json(dashboardData));

app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="vi">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>SunWin AI Dashboard V17 - Đọc Vị</title>
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #0f172a; color: #f8fafc; margin: 0; padding: 10px; }
            .container { max-width: 500px; margin: 0 auto; }
            .card { background: #1e293b; border-radius: 15px; padding: 20px; margin-bottom: 15px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); border-left: 5px solid #3b82f6; }
            .prediction-card { border-left-color: #10b981; text-align: center; }
            .status-badge { display: inline-block; padding: 5px 15px; border-radius: 20px; font-weight: bold; font-size: 14px; margin-bottom: 10px; }
            .status-online { background: #064e3b; color: #34d399; }
            .big-text { font-size: 40px; font-weight: 800; margin: 10px 0; }
            .tai { color: #f87171; } .xiu { color: #60a5fa; }
            .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px; }
            .stat-box { background: #334155; padding: 10px; border-radius: 10px; text-align: center; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
            th { text-align: left; color: #94a3b8; padding: 8px; border-bottom: 1px solid #334155; }
            td { padding: 8px; border-bottom: 1px solid #334155; text-align: left; }
            .badge-win { color: #34d399; font-weight: bold; }
            .badge-lose { color: #f87171; font-weight: bold; }
            .badge-wait { color: #fbbf24; font-weight: bold; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="card prediction-card">
                <div class="status-badge status-online">AI ĐỌC VỊ LIVE</div>
                <div id="next-session" style="color: #94a3b8; font-size: 16px;">Phiên tiếp theo: --</div>
                <div id="ai-result" class="big-text">ĐANG QUÉT...</div>
                <div id="ai-detail" style="font-size: 14px; color: #94a3b8;">Đang chờ dữ liệu mồi...</div>
            </div>

            <div class="card">
                <h3 style="margin-top: 0;">📊 Thống kê (15 ván gần nhất)</h3>
                <div class="stats-grid">
                    <div class="stat-box">
                        <div style="font-size: 12px; color: #94a3b8;">Win Rate (Rolling 15)</div>
                        <div id="wr-val" style="font-size: 24px; font-weight: bold; color: #fbbf24;">0%</div>
                    </div>
                    <div class="stat-box">
                        <div style="font-size: 12px; color: #94a3b8;">Số ván đã đánh</div>
                        <div id="total-val" style="font-size: 24px; font-weight: bold;">0</div>
                    </div>
                </div>
            </div>

            <div class="card">
                <h3 style="margin-top: 0;">📜 Lịch sử Bot Chốt</h3>
                <table id="history-table">
                    <thead><tr><th>Phiên</th><th>AI Chốt</th><th>Kết quả</th><th>Status</th></tr></thead>
                    <tbody></tbody>
                </table>
            </div>
        </div>

        <script>
            function updateDashboard() {
                fetch('/api/data').then(res => res.json()).then(data => {
                    const ai = data.ai_prediction;
                    if(data.Phien !== "Đang chờ...") {
                        document.getElementById('next-session').innerText = "Phiên tiếp theo: " + (data.Phien + 1);
                    }
                    
                    const resDiv = document.getElementById('ai-result');
                    resDiv.innerText = ai.result;
                    resDiv.className = 'big-text ' + (ai.result === 'TÀI' ? 'tai' : (ai.result === 'XỈU' ? 'xiu' : ''));
                    document.getElementById('ai-detail').innerText = ai.detail;
                    document.getElementById('wr-val').innerText = ai.win_rate + "%";
                    document.getElementById('total-val').innerText = ai.total_played + "/15";

                    const tbody = document.querySelector('#history-table tbody');
                    tbody.innerHTML = (ai.history || []).map(h => {
                         let statusBadge = '<span class="badge-wait">⏳ Chờ</span>';
                         if (h.win === true) statusBadge = '<span class="badge-win">✅ Húp</span>';
                         if (h.win === false) statusBadge = '<span class="badge-lose">❌ Gãy</span>';
                        return \`
                        <tr>
                            <td>\${h.phien}</td>
                            <td class="\${h.pred === 'TÀI' ? 'tai' : 'xiu'}">\${h.pred}</td>
                            <td class="\${h.actual === 'TÀI' ? 'tai' : 'xiu'}">\${h.actual || '--'}</td>
                            <td>\${statusBadge}</td>
                        </tr>
                    \`}).join('');
                });
            }
            setInterval(updateDashboard, 3000);
            updateDashboard();
        </script>
    </body>
    </html>
    `);
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 API SUNWIN DD + UI DASHBOARD CHẠY TẠI PORT ${PORT}`);
    connectWebSocket();
});
