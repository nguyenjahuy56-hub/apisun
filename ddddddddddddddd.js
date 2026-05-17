const WebSocket = require('ws');
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

// ==========================================
// 1. STATE & CẤU HÌNH SUNWIN
// ==========================================
const SUNWIN_TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJnZW5kZXIiOjAsImNhblZpZXdTdGF0IjpmYWxzZSwiZGlzcGxheU5hbWUiOiJzb25ndmVkZW0yMCIsImJvdCI6MCwiaXNNZXJjaGFudCI6ZmFsc2UsInZlcmlmaWVkQmFua0FjY291bnQiOmZhbHNlLCJwbGF5RXZlbnRMb2JieSI6ZmFsc2UsImN1c3RvbWVySWQiOjIzOTk1MzIxNSwiYWZmSWQiOiJkZWZhdWx0IiwiYmFubmVkIjpmYWxzZSwiYnJhbmQiOiJzdW4ud2luIiwiZW1haWwiOiIiLCJ0aW1lc3RhbXAiOjE3Nzg5ODM0MDQyOTgsImxvY2tHYW1lcyI6W10sImFtb3VudCI6MCwibG9ja0NoYXQiOmZhbHNlLCJwaG9uZVZlcmlmaWVkIjp0cnVlLCJpcEFkZHJlc3MiOiIyMDAxOmVlMDo0MzE1OmQxODA6MzQ1ODpkOGU5OmY2MDg6NjUyNyIsIm11dGUiOmZhbHNlLCJhdmF0YXIiOiJodHRwczovL2ltYWdlcy5zd2luc2hvcC5uZXQvaW1hZ2VzL2F2YXRhci9hdmF0YXJfMTAucG5nIiwicGxhdGZvcm1JZCI6MiwidXNlcklkIjoiMDAzNzQwNjgtOGJmYi00OTU2LTliMTItMjg5M2MzMTA3MTYwIiwiZW1haWxWZXJpZmllZCI6bnVsbCwicmVnVGltZSI6MTc0NTU5MjY1NTgwNywicGhvbmUiOiI4NDMyOTY4OTk3MSIsImRlcG9zaXQiOnRydWUsInVzZXJuYW1lIjoiU0Nfc29uZ3ZlZGVtMTAifQ.V1B8ubv88EGKb2nxewF1OonGu80QsaT73aRedTycvwA";
const SUNWIN_WEBSOCKET_URL = `wss://websocket.azhkthg1.net/websocket?token=${SUNWIN_TOKEN}`;
const SUNWIN_INFO = JSON.stringify({
    "ipAddress": "2001:ee0:4315:d180:3458:d8e9:f608:6527",
    "wsToken": SUNWIN_TOKEN,
    "locale": "vi",
    "userId": "00374068-8bfb-4956-9b12-2893c3107160",
    "username": "SC_songvedem10",
    "timestamp": 1778983404307,
    "refreshToken": "5e048d7d51b445f3b49431094e74fdbd.9382a58d21644b41ac6142d5b3d33a00"
});
const SUNWIN_SIGNATURE = "0E123C7B37C94949E1F4B0EC8133734BE60A7FD4C02DBD86480EAAEAAAD784545FF18603F555E3099F46E44BCB388915C0BF6EB8E101EBC8C00EE321387B015852BFBB0AD68CA5588DFDEEF690CDFDF334A932792EB8B00F12D84422184FE97E742A2DCF2E0FA2405363D3253B8D893A0E28027C87FDC723B744E48CD6653860";

const SUNWIN_WS_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Origin": "https://play.sun.win"
};

const sunwinInitialMessages = [
    [1, "MiniGame", "SC_songvedem10", "Songvedem10", { "info": SUNWIN_INFO, "signature": SUNWIN_SIGNATURE }],
    [6, "MiniGame", "taixiuPlugin", { cmd: 1005 }],
    [6, "MiniGame", "lobbyPlugin", { cmd: 10001 }]
];

let sunwinApiData = { "Phien": null, "Xuc_xac_1": null, "Xuc_xac_2": null, "Xuc_xac_3": null, "Tong": null, "Ket_qua": "", "id": "sunwin", "server_time": new Date().toISOString() };
let sunwinDashboard = {
    Phien: "Đang chờ...", Ket_qua: "--", Xuc_xac: [0, 0, 0], Tong: 0,
    ai_prediction: { result: "WAIT", confidence: 0, detail: "Đang phân tích...", win_rate: 0, total_played: 0, history: [] }
};
let sunwinSessionId = null;
let ws = null;

function connectSunWin() {
    if (ws) { ws.removeAllListeners(); ws.close(); }
    ws = new WebSocket(SUNWIN_WEBSOCKET_URL, { headers: SUNWIN_WS_HEADERS });

    ws.on('open', () => {
        console.log('[✅] Đã kết nối WebSocket Sun.Win');
        sunwinInitialMessages.forEach((msg, i) => {
            setTimeout(() => { if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg)); }, i * 600);
        });
        setInterval(() => { if (ws.readyState === WebSocket.OPEN) ws.ping(); }, 15000);
    });

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            if (!Array.isArray(data) || typeof data[1] !== 'object') return;
            const { cmd, sid, d1, d2, d3, gBB } = data[1];

            if (cmd === 1008 && sid) {
                sunwinSessionId = sid;
                console.log(`[🎮 SUNWIN] Phiên mới: ${sid}`);
            }

            if (cmd === 1003 && gBB) {
                if (!d1 || !d2 || !d3) return;
                const total = d1 + d2 + d3;
                const result = (total > 10) ? "Tài" : "Xỉu";

                sunwinApiData = { "Phien": sunwinSessionId, "Xuc_xac_1": d1, "Xuc_xac_2": d2, "Xuc_xac_3": d3, "Tong": total, "Ket_qua": result, "id": "sunwin", "server_time": new Date().toISOString() };
                sunwinDashboard.Phien = sunwinSessionId; sunwinDashboard.Ket_qua = result; sunwinDashboard.Tong = total; sunwinDashboard.Xuc_xac = [d1, d2, d3];

                console.log(`[🎲 SUNWIN] Phiên ${sunwinSessionId}: ${d1}-${d2}-${d3} = ${total} (${result})`);
                sunwinSessionId = null;
            }
        } catch (e) { }
    });
    ws.on('close', () => setTimeout(connectSunWin, 2500));
    ws.on('error', () => ws.close());
}

// ==========================================
// 2. STATE & CẤU HÌNH HITCLUB MD5
// ==========================================
const HITCLUB_API_URL = "https://jakpotgwab.geightdors.net/glms/v1/notify/taixiu?platform_id=g8&gid=vgmn_101";

let hitclubApiData = { "Phien": null, "Xuc_xac_1": null, "Xuc_xac_2": null, "Xuc_xac_3": null, "Tong": null, "Ket_qua": "", "id": "hitclub", "server_time": new Date().toISOString() };
let hitclubDashboard = {
    Phien: "Đang chờ...", Ket_qua: "--", Xuc_xac: [0, 0, 0], Tong: 0,
    ai_prediction: { result: "WAIT", confidence: 0, detail: "Đang phân tích...", win_rate: 0, total_played: 0, history: [] }
};
let hitclubLastPhien = "";

async function fetchHitClubTXMD5() {
    try {
        const response = await fetch(HITCLUB_API_URL, {
            headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)", "Accept": "application/json" }
        });
        if (!response.ok) return;
        const jsonData = await response.json();
        
        if (jsonData.status === 'OK' && Array.isArray(jsonData.data)) {
            let newDataFound = false;
            let currentDices = null;

            jsonData.data.forEach(game => {
                if (game.cmd === 2006 && game.sid !== undefined && game.d1 !== undefined) {
                    if (game.sid.toString() !== hitclubLastPhien) {
                        hitclubLastPhien = game.sid.toString();
                        newDataFound = true;
                        currentDices = [game.d1, game.d2, game.d3];
                    }
                }
            });

            if (newDataFound && currentDices) {
                const total = currentDices.reduce((a, b) => a + b, 0);
                const result = (total >= 11) ? "Tài" : "Xỉu";

                hitclubApiData = { "Phien": hitclubLastPhien, "Xuc_xac_1": currentDices[0], "Xuc_xac_2": currentDices[1], "Xuc_xac_3": currentDices[2], "Tong": total, "Ket_qua": result, "id": "hitclub", "server_time": new Date().toISOString() };
                hitclubDashboard.Phien = hitclubLastPhien; hitclubDashboard.Ket_qua = result; hitclubDashboard.Tong = total; hitclubDashboard.Xuc_xac = currentDices;
                
                console.log(`[🎲 HITCLUB] Phiên ${hitclubLastPhien}: ${currentDices.join('-')} = ${total} (${result})`);
            }
        }
    } catch (e) {}
}
setInterval(fetchHitClubTXMD5, 3000);

// ==========================================
// 3. API ROUTES (CHO PYTHON GỌI)
// ==========================================
// API Lấy dữ liệu Xúc xắc
app.get('/api/sunwin/live', (req, res) => res.json(sunwinApiData));
app.get('/api/hitclub/live', (req, res) => res.json(hitclubApiData));

// API UI Dashboard gọi để render
app.get('/api/sunwin/data', (req, res) => res.json(sunwinDashboard));
app.get('/api/hitclub/data', (req, res) => res.json(hitclubDashboard));

// API Python bắn dự đoán AI lên
app.post('/api/sunwin/update-prediction', (req, res) => {
    sunwinDashboard.ai_prediction = { ...sunwinDashboard.ai_prediction, ...req.body };
    console.log(`[🤖 SUNWIN AI] Đã nhận dự đoán từ Python: ${req.body.result}`);
    res.json({ success: true });
});

app.post('/api/hitclub/update-prediction', (req, res) => {
    hitclubDashboard.ai_prediction = { ...hitclubDashboard.ai_prediction, ...req.body };
    console.log(`[🤖 HITCLUB AI] Đã nhận dự đoán từ Python: ${req.body.result}`);
    res.json({ success: true });
});

// ==========================================
// 4. GIAO DIỆN DASHBOARD HTML V20 (DUAL TABS)
// ==========================================
app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="vi">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>ALL-IN-ONE AI Dashboard - SunWin & HitClub</title>
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #0f172a; color: #f8fafc; margin: 0; padding: 10px; }
            .container { max-width: 500px; margin: 0 auto; }
            
            /* Tabs Styling */
            .tabs-container { display: flex; margin-bottom: 15px; border-radius: 10px; overflow: hidden; background: #1e293b; }
            .tab-btn { flex: 1; padding: 15px; background: transparent; color: #94a3b8; border: none; font-weight: bold; font-size: 16px; cursor: pointer; transition: 0.3s; }
            .tab-btn.active.sunwin { background: #3b82f6; color: white; }
            .tab-btn.active.hitclub { background: #eab308; color: #111827; }
            .tab-content { display: none; }
            .tab-content.active { display: block; }

            .card { background: #1e293b; border-radius: 15px; padding: 20px; margin-bottom: 15px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); border-left: 5px solid; }
            .card.sunwin { border-left-color: #3b82f6; }
            .card.hitclub { border-left-color: #eab308; }
            .prediction-card { text-align: center; border-left-color: #10b981 !important; }
            
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
            <div class="tabs-container">
                <button class="tab-btn active sunwin" onclick="switchTab('sunwin')">♠️ SUNWIN</button>
                <button class="tab-btn" onclick="switchTab('hitclub')">♦️ HITCLUB MD5</button>
            </div>

            <div id="tab-sunwin" class="tab-content active">
                <div class="card prediction-card">
                    <div class="status-badge status-online">AI SUNWIN ĐANG LIVE</div>
                    <div id="sw-next-session" style="color: #94a3b8; font-size: 16px;">Phiên tiếp theo: --</div>
                    <div id="sw-ai-result" class="big-text">ĐANG QUÉT...</div>
                    <div id="sw-ai-detail" style="font-size: 14px; color: #94a3b8;">Đang chờ dữ liệu mồi...</div>
                </div>
                <div class="card sunwin">
                    <h3 style="margin-top: 0;">📊 Thống kê (15 ván gần nhất)</h3>
                    <div class="stats-grid">
                        <div class="stat-box"><div style="font-size: 12px; color: #94a3b8;">Win Rate</div><div id="sw-wr-val" style="font-size: 24px; font-weight: bold; color: #fbbf24;">0%</div></div>
                        <div class="stat-box"><div style="font-size: 12px; color: #94a3b8;">Số ván đã đánh</div><div id="sw-total-val" style="font-size: 24px; font-weight: bold;">0</div></div>
                    </div>
                </div>
                <div class="card sunwin">
                    <h3 style="margin-top: 0;">📜 Lịch sử Bot Chốt</h3>
                    <table id="sw-history-table">
                        <thead><tr><th>Phiên</th><th>AI Chốt</th><th>Kết quả</th><th>Status</th></tr></thead>
                        <tbody></tbody>
                    </table>
                </div>
            </div>

            <div id="tab-hitclub" class="tab-content">
                <div class="card prediction-card">
                    <div class="status-badge status-online">AI HITCLUB ĐANG LIVE</div>
                    <div id="hc-next-session" style="color: #94a3b8; font-size: 16px;">Phiên tiếp theo: --</div>
                    <div id="hc-ai-result" class="big-text">ĐANG QUÉT...</div>
                    <div id="hc-ai-detail" style="font-size: 14px; color: #94a3b8;">Đang chờ dữ liệu mồi...</div>
                </div>
                <div class="card hitclub">
                    <h3 style="margin-top: 0;">📊 Thống kê (15 ván gần nhất)</h3>
                    <div class="stats-grid">
                        <div class="stat-box"><div style="font-size: 12px; color: #94a3b8;">Win Rate</div><div id="hc-wr-val" style="font-size: 24px; font-weight: bold; color: #fbbf24;">0%</div></div>
                        <div class="stat-box"><div style="font-size: 12px; color: #94a3b8;">Số ván đã đánh</div><div id="hc-total-val" style="font-size: 24px; font-weight: bold;">0</div></div>
                    </div>
                </div>
                <div class="card hitclub">
                    <h3 style="margin-top: 0;">📜 Lịch sử Bot Chốt</h3>
                    <table id="hc-history-table">
                        <thead><tr><th>Phiên</th><th>AI Chốt</th><th>Kết quả</th><th>Status</th></tr></thead>
                        <tbody></tbody>
                    </table>
                </div>
            </div>
        </div>

        <script>
            let currentTab = 'sunwin';

            function switchTab(tab) {
                currentTab = tab;
                document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active', 'sunwin', 'hitclub'));
                document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
                
                event.target.classList.add('active', tab);
                document.getElementById('tab-' + tab).classList.add('active');
                
                updateDashboardData();
            }

            function renderData(prefix, data) {
                const ai = data.ai_prediction;
                if(data.Phien !== "Đang chờ..." && data.Phien !== null) {
                    document.getElementById(prefix + '-next-session').innerText = "Phiên tiếp theo: " + (Number(data.Phien) + 1);
                }
                
                const resDiv = document.getElementById(prefix + '-ai-result');
                resDiv.innerText = ai.result;
                resDiv.className = 'big-text ' + (ai.result === 'TÀI' ? 'tai' : (ai.result === 'XỈU' ? 'xiu' : ''));
                document.getElementById(prefix + '-ai-detail').innerText = ai.detail;
                document.getElementById(prefix + '-wr-val').innerText = ai.win_rate + "%";
                document.getElementById(prefix + '-total-val').innerText = ai.total_played + "/15";

                const tbody = document.querySelector('#' + prefix + '-history-table tbody');
                tbody.innerHTML = (ai.history || []).map(h => {
                    let statusBadge = '<span class="badge-wait">⏳ Chờ</span>';
                    if (h.win === true) statusBadge = '<span class="badge-win">✅ Húp</span>';
                    if (h.win === false) statusBadge = '<span class="badge-lose">❌ Gãy</span>';
                    return \`<tr>
                        <td>\${h.phien}</td>
                        <td class="\${h.pred === 'TÀI' ? 'tai' : 'xiu'}">\${h.pred}</td>
                        <td class="\${h.actual === 'TÀI' ? 'tai' : 'xiu'}">\${h.actual || '--'}</td>
                        <td>\${statusBadge}</td>
                    </tr>\`;
                }).join('');
            }

            function updateDashboardData() {
                if (currentTab === 'sunwin') {
                    fetch('/api/sunwin/data').then(res => res.json()).then(data => renderData('sw', data));
                } else {
                    fetch('/api/hitclub/data').then(res => res.json()).then(data => renderData('hc', data));
                }
            }

            setInterval(() => {
                // Auto update background data based on active tab
                updateDashboardData();
            }, 3000);
            updateDashboardData();
        </script>
    </body>
    </html>
    `);
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n${'═'.repeat(50)}`);
    console.log(`🚀 MULTI-AI DASHBOARD (SUNWIN + HITCLUB) CHẠY PORT ${PORT}`);
    console.log(`${'═'.repeat(50)}`);
    connectSunWin();
    fetchHitClubTXMD5();
});
