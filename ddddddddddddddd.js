const WebSocket = require('ws');
const express = require('express');
const cors = require('cors');
const TelegramBot = require('node-telegram-bot-api'); // THÊM THƯ VIỆN TELEGRAM

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

// ==========================================
// 1. STATE & CẤU HÌNH SUNWIN (Đã đổi thành biến let & nạp data mới)
// ==========================================
let SUNWIN_TOKEN = "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJnZW5kZXIiOjAsImNhblZpZXdTdGF0IjpmYWxzZSwiZGlzcGxheU5hbWUiOiJzb25ndmVkZW0yMCIsImJvdCI6MCwiaXNNZXJjaGFudCI6ZmFsc2UsInZlcmlmaWVkQmFua0FjY291bnQiOnRydWUsInBsYXlFdmVudExvYmJ5IjpmYWxzZSwiY3VzdG9tZXJJZCI6MjM5OTUzMjE1LCJhZmZJZCI6ImRlZmF1bHQiLCJiYW5uZWQiOmZhbHNlLCJicmFuZCI6InN1bi53aW4iLCJlbWFpbCI6IiIsInRpbWVzdGFtcCI6MTc3OTM3ODcxNTA3MiwibG9ja0dhbWVzIjpbXSwiYW1vdW50IjowLCJsb2NrQ2hhdCI6ZmFsc2UsInBob25lVmVyaWZpZWQiOnRydWUsImlwQWRkcmVzcyI6IjIwMDE6ZWUwOjQzMTU6ZDE4MDo5MDNhOjg5MGE6YzFiZTo3ZmY0IiwibXV0ZSI6ZmFsc2UsImF2YXRhciI6Imh0dHBzOi8vaW1hZ2VzLnN3aW5zaG9wLm5ldC9pbWFnZXMvYXZhdGFyL2F2YXRhcl8xMC5wbmciLCJwbGF0Zm9ybUlkIjoyLCJ1c2VySWQiOiIwMDM3NDA2OC04YmZiLTQ5NTYtOWIxMi0yODkzYzMxMDcxNjAiLCJlbWFpbFZlcmlmaWVkIjpudWxsLCJyZWdUaW1lIjoxNzQ1NTkyNjU1ODA3LCJwaG9uZSI6Ijg0MzI5Njg5OTcxIiwiZGVwb3NpdCI6dHJ1ZSwidXNlcm5hbWUiOiJTQ19zb25ndmVkZW0xMCJ9.RE0kamxDrXy-YiK4xqu2PnQiUeNumn_pWB_M7toG9WQ";

let SUNWIN_SIGNATURE = "3E5628E65E4CFAF18C357B741CF3AD3FD28002B9B897602F7648D3754A3DC0EB3CCAAB5A4BE34D37A5A18BDFD1DCE343CA071A355DB91DA4AE654C53A554D27E5D0A845224E0F03C9466739CE90011F4F5B7C4CD9C362BE6C3904195AB136FE08EF9D3084B73B0B2426D2CE93F9D8862EF54774B3FE828AF7EF44E4D5AE2F3B5";

let SUNWIN_INFO = JSON.stringify({
    "ipAddress": "2001:ee0:4315:d180:903a:890a:c1be:7ff4",
    "wsToken": SUNWIN_TOKEN,
    "locale": "vi",
    "userId": "00374068-8bfb-4956-9b12-2893c3107160",
    "username": "SC_songvedem10",
    "timestamp": 1779378715080,
    "refreshToken": "0b0056ad2ec74484a9562b98116ddde8.31411eb269f741cd9d2fcc3d4978e12a"
});

let SUNWIN_WEBSOCKET_URL = `wss://websocket.azhkthg1.net/websocket?token=${SUNWIN_TOKEN}`;

const SUNWIN_WS_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Origin": "https://play.sun.win"
};

let sunwinInitialMessages = [
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
// THIẾT LẬP BOT TELEGRAM ADMIN TỰ LỌC JSON
// ==========================================
const TELE_BOT_TOKEN = '8568055781:AAFYJhI5vcC2Q4Q8UaVVNlkOaBByEg6MFhw'; 
const MY_CHAT_ID = 8631760602;

const bot = new TelegramBot(TELE_BOT_TOKEN, {polling: true});

bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (chatId !== MY_CHAT_ID) {
        bot.sendMessage(chatId, "⚠️ Bạn không có quyền truy cập hệ thống này!");
        return;
    }

    if (!text) return;

    try {
        const parsedData = JSON.parse(text);

        if (parsedData && parsedData.data && parsedData.data.wsToken && parsedData.data.signature) {
            
            // 1. Lấy dữ liệu
            const newToken = parsedData.data.wsToken;
            const newSignature = parsedData.data.signature;
            const newInfo = parsedData.data.info; 

            // 2. Gán đè vào biến Global
            SUNWIN_TOKEN = newToken;
            SUNWIN_SIGNATURE = newSignature;
            SUNWIN_INFO = JSON.stringify(newInfo); 
            SUNWIN_WEBSOCKET_URL = `wss://websocket.azhkthg1.net/websocket?token=${SUNWIN_TOKEN}`;

            // 3. Cập nhật lại Message mồi
            sunwinInitialMessages[0][4].info = SUNWIN_INFO;
            sunwinInitialMessages[0][4].signature = SUNWIN_SIGNATURE;

            console.log(`[🔄 TELEGRAM] Đã mổ JSON thành công! Đang reconnect Sunwin...`);
            
            // 4. Reset Connection
            connectSunWin();

            bot.sendMessage(chatId, "✅ HÚP! Đã update Token + Info mới, hệ thống đang ngậm data.");
        } else {
            bot.sendMessage(chatId, "⚠️ JSON này không chứa token/signature hợp lệ của Sunwin bro ạ.");
        }
    } catch (error) {
        if (text.includes('{') || text.includes('}')) {
             bot.sendMessage(chatId, "❌ Lỗi: Copy JSON bị thiếu ngoặc, dán lại đi!");
        }
    }
});
console.log("[🤖] Telegram Admin Bot đã khởi động!");

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
app.get('/api/sunwin/live', (req, res) => res.json(sunwinApiData));
app.get('/api/hitclub/live', (req, res) => res.json(hitclubApiData));
app.get('/api/sunwin/data', (req, res) => res.json(sunwinDashboard));
app.get('/api/hitclub/data', (req, res) => res.json(hitclubDashboard));

app.post('/api/sunwin/update-prediction', (req, res) => {
    sunwinDashboard.ai_prediction = { ...sunwinDashboard.ai_prediction, ...req.body };
    res.json({ success: true });
});

app.post('/api/hitclub/update-prediction', (req, res) => {
    hitclubDashboard.ai_prediction = { ...hitclubDashboard.ai_prediction, ...req.body };
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
            setInterval(updateDashboardData, 3000);
            updateDashboardData();
        </script>
    </body>
    </html>
    `);
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n${'═'.repeat(50)}`);
    console.log(`🚀 MULTI-AI DASHBOARD by dark (SUNWIN + HITCLUB) CHẠY PORT ${PORT}`);
    console.log(`${'═'.repeat(50)}`);
    connectSunWin();
    fetchHitClubTXMD5();
});
