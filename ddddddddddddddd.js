const WebSocket = require('ws');
const express = require('express');
const cors = require('cors');
const os = require('os');
const network = require('network');

const app = express();
app.use(cors());
app.use(express.json()); // BẮT BUỘC ĐỂ NHẬN DATA TỪ PYTHON

const PORT = process.env.PORT || 3001;

let apiResponseData = {
    "Phien": null,
    "Xuc_xac_1": null,
    "Xuc_xac_2": null,
    "Xuc_xac_3": null,
    "Tong": null,
    "Ket_qua": "",
    "id": "dd",
    "server_time": new Date().toISOString()
};

// Dữ liệu lưu trữ tổng hợp cho Dashboard
let dashboardData = {
    Phien: "Đang chờ...",
    Ket_qua: "--",
    Xuc_xac: [0,0,0],
    Tong: 0,
    ai_prediction: {
        result: "WAIT",
        confidence: 0,
        detail: "Đang phân tích...",
        win_rate: 0,
        total_played: 0,
        history: [] // Lưu 20 phiên gần nhất
    }
};

let currentSessionId = null;
const patternHistory = [];

const WEBSOCKET_URL = "wss://websocket.azhkthg1.net/websocket?token=eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJnZW5kZXIiOjAsImNhblZpZXdTdGF0IjpmYWxzZSwiZGlzcGxheU5hbWUiOiJzb25ndmVkZW0yMCIsImJvdCI6MCwiaXNNZXJjaGFudCI6ZmFsc2UsInZlcmlmaWVkQmFua0FjY291bnQiOnRydWUsInBsYXlFdmVudExvYmJ5IjpmYWxzZSwiY3VzdG9tZXJJZCI6MjM5OTUzMjE1LCJhZmZJZCI6ImRlZmF1bHQiLCJiYW5uZWQiOmZhbHNlLCJicmFuZCI6InN1bi53aW4iLCJlbWFpbCI6IiIsInRpbWVzdGFtcCI6MTc3ODA0MzQyMjAxNiwibG9ja0dhbWVzIjpbXSwiYW1vdW50IjowLCJsb2NrQ2hhdCI6ZmFsc2UsInBob25lVmVyaWZpZWQiOnRydWUsImlwQWRkcmVzcyI6IjExMy4xNzUuMTAwLjU3IiwibXV0ZSI6ZmFsc2UsImF2YXRhciI6Imh0dHBzOi8vaW1hZ2VzLnN3aW5zaG9wLm5ldC9pbWFnZXMvYXZhdGFyL2F2YXRhcl8xMC5wbmciLCJwbGF0Zm9ybUlkIjoyLCJ1c2VySWQiOiIwMDM3NDA2OC04YmZiLTQ5NTYtOWIxMi0yODkzYzMxMDcxNjAiLCJlbWFpbFZlcmlmaWVkIjpudWxsLCJyZWdUaW1lIjoxNzQ1NTkyNjU1ODA3LCJwaG9uZSI6Ijg0MzI5Njg5OTcxIiwiZGVwb3NpdCI6dHJ1ZSwidXNlcm5hbWUiOiJTQ19zb25ndmVkZW0xMCJ9.4jl_XtPCRLFuSOrBlfAtaSz3kg27oIqZFqcHwPv34G0";
const WS_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    "Origin": "https://play.sun.win"
};
const RECONNECT_DELAY = 2500;
const PING_INTERVAL = 15000;

const initialMessages = [
    [
        1,
        "MiniGame",
        "SC_songvedem10",
        "Songvedem10",
        {
            "info": "{\"ipAddress\":\"113.175.100.57\",\"wsToken\":\"eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJnZW5kZXIiOjAsImNhblZpZXdTdGF0IjpmYWxzZSwiZGlzcGxheU5hbWUiOiJzb25ndmVkZW0yMCIsImJvdCI6MCwiaXNNZXJjaGFudCI6ZmFsc2UsInZlcmlmaWVkQmFua0FjY291bnQiOnRydWUsInBsYXlFdmVudExvYmJ5IjpmYWxzZSwiY3VzdG9tZXJJZCI6MjM5OTUzMjE1LCJhZmZJZCI6ImRlZmF1bHQiLCJiYW5uZWQiOmZhbHNlLCJicmFuZCI6InN1bi53aW4iLCJlbWFpbCI6IiIsInRpbWVzdGFtcCI6MTc3ODA0MzQyMjAxNiwibG9ja0dhbWVzIjpbXSwiYW1vdW50IjowLCJsb2NrQ2hhdCI6ZmFsc2UsInBob25lVmVyaWZpZWQiOnRydWUsImlwQWRkcmVzcyI6IjExMy4xNzUuMTAwLjU3IiwibXV0ZSI6ZmFsc2UsImF2YXRhciI6Imh0dHBzOi8vaW1hZ2VzLnN3aW5zaG9wLm5ldC9pbWFnZXMvYXZhdGFyL2F2YXRhcl8xMC5wbmciLCJwbGF0Zm9ybUlkIjoyLCJ1c2VySWQiOiIwMDM3NDA2OC04YmZiLTQ5NTYtOWIxMi0yODkzYzMxMDcxNjAiLCJlbWFpbFZlcmlmaWVkIjpudWxsLCJyZWdUaW1lIjoxNzQ1NTkyNjU1ODA3LCJwaG9uZSI6Ijg0MzI5Njg5OTcxIiwiZGVwb3NpdCI6dHJ1ZSwidXNlcm5hbWUiOiJTQ19zb25ndmVkZW0xMCJ9.4jl_XtPCRLFuSOrBlfAtaSz3kg27oIqZFqcHwPv34G0\",\"locale\":\"vi\",\"userId\":\"00374068-8bfb-4956-9b12-2893c3107160\",\"username\":\"SC_songvedem10\",\"timestamp\":1777867255775,\"refreshToken\":\"a48b8445b47545e8bf55b5ebcdd303c5.fd44c0a6c99b455c84c845298d835679\"}",
            "signature": "366DB52754A4C6B5AE4D3169940BE3BB2C046D859898F0B7E6BDFA3F84069E77B309CE8EE69EA0482776D271C521EDC2D223503CA0B182D6F8DB9E4C0E49C9514DF7418F284DF0AD4F603F23018D0914A225350B66C82C2A17FC2297CF27BF13D4DDE48E06427520B0A99BB8EC0EA3A6947FD1D255BE3AB92C66F0DD475EF5F9"
        }
    ],
    [6, "MiniGame", "taixiuPlugin", { cmd: 1005 }],
    [6, "MiniGame", "lobbyPlugin", { cmd: 10001 }]
];

let ws = null;
let pingInterval = null;
let reconnectTimeout = null;

const getNetworkInfo = () => {
    const interfaces = os.networkInterfaces();
    let localIP = '127.0.0.1';
    let publicIP = null;
    for (const ifaceName in interfaces) {
        for (const iface of interfaces[ifaceName]) {
            if (!iface.internal && iface.family === 'IPv4') {
                localIP = iface.address;
                break;
            }
        }
    }
    return { localIP, publicIP };
};

function connectWebSocket() {
    if (ws) {
        ws.removeAllListeners();
        ws.close();
    }
    ws = new WebSocket(WEBSOCKET_URL, { headers: WS_HEADERS });

    ws.on('open', () => {
        console.log('[✅] WebSocket connected to Sun.Win');
        initialMessages.forEach((msg, i) => {
            setTimeout(() => {
                if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
            }, i * 600);
        });
        clearInterval(pingInterval);
        pingInterval = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) ws.ping();
        }, PING_INTERVAL);
    });

    ws.on('pong', () => console.log('[📶] Ping OK - Connection stable'));

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

                apiResponseData = {
                    "Phien": currentSessionId,
                    "Xuc_xac_1": d1,
                    "Xuc_xac_2": d2,
                    "Xuc_xac_3": d3,
                    "Tong": total,
                    "Ket_qua": result,
                    "id": "dark",
                    "server_time": new Date().toISOString(),
                    "update_count": (apiResponseData.update_count || 0) + 1
                };
                
                dashboardData.Phien = currentSessionId;
                dashboardData.Ket_qua = result;
                dashboardData.Tong = total;
                // 👇 DÒNG NÀY ĐÃ ĐƯỢC THÊM ĐỂ HIỂN THỊ ĐÚNG MẢNG XÚC XẮC 👇
                dashboardData.Xuc_xac = [d1, d2, d3];
                
                console.log(`[🎲] Phiên ${apiResponseData.Phien}: ${d1}-${d2}-${d3} = ${total} (${result})`);
                
                patternHistory.push({
                    session: currentSessionId,
                    dice: [d1, d2, d3],
                    total: total,
                    result: result,
                    timestamp: new Date().toISOString()
                });
                
                if (patternHistory.length > 100) patternHistory.shift();
                currentSessionId = null;
            }
        } catch (e) {
            console.error('[❌] Lỗi xử lý message:', e.message);
        }
    });

    ws.on('close', (code, reason) => {
        console.log(`[🔌] WebSocket closed. Code: ${code}, Reason: ${reason.toString()}`);
        clearInterval(pingInterval);
        clearTimeout(reconnectTimeout);
        reconnectTimeout = setTimeout(connectWebSocket, RECONNECT_DELAY);
    });

    ws.on('error', (err) => {
        console.error('[❌] WebSocket error:', err.message);
        ws.close();
    });
}

// ===================================
// CÁC ROUTES API
// ===================================

// Nhận dự đoán từ Python AI
app.post('/api/update-prediction', (req, res) => {
    dashboardData.ai_prediction = {
        ...dashboardData.ai_prediction,
        ...req.body
    };
    res.json({ success: true });
});

// Trả về Data cho file Python cào
app.get('/api/ddvipro', (req, res) => {
    res.json(apiResponseData);
});

// API lấy data cho giao diện Dashboard
app.get('/api/data', (req, res) => {
    res.json(dashboardData);
});

app.get('/api/history', (req, res) => {
    res.json({
        current: apiResponseData,
        history: patternHistory.slice(-20),
        total_requests: apiResponseData.update_count || 0
    });
});

app.get('/api/stats', (req, res) => {
    const taiCount = patternHistory.filter(item => item.result === "Tài").length;
    const xiuCount = patternHistory.filter(item => item.result === "Xỉu").length;
    res.json({
        total_sessions: patternHistory.length,
        tai_count: taiCount,
        xiu_count: xiuCount,
        tai_percentage: patternHistory.length > 0 ? ((taiCount / patternHistory.length) * 100).toFixed(2) : 0,
        xiu_percentage: patternHistory.length > 0 ? ((xiuCount / patternHistory.length) * 100).toFixed(2) : 0,
        last_update: apiResponseData.server_time,
        server_uptime: process.uptime().toFixed(0) + 's'
    });
});

app.get('/api/health', (req, res) => {
    res.json({
        status: 'online',
        websocket: ws ? ws.readyState === WebSocket.OPEN : false,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        connections: ws ? 'connected' : 'disconnected'
    });
});

app.get('/', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="vi">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>SunWin AI Dashboard V17</title>
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
                <div class="status-badge status-online">AI LIVE V17</div>
                <div id="next-session" style="color: #94a3b8; font-size: 16px;">Phiên tiếp theo: --</div>
                <div id="ai-result" class="big-text">ĐANG QUÉT...</div>
                <div id="ai-detail" style="font-size: 14px; color: #94a3b8;">Đang chờ dữ liệu mồi...</div>
            </div>

            <div class="card">
                <h3 style="margin-top: 0;">📊 Thống kê phiên</h3>
                <div class="stats-grid">
                    <div class="stat-box">
                        <div style="font-size: 12px; color: #94a3b8;">Win Rate</div>
                        <div id="wr-val" style="font-size: 24px; font-weight: bold; color: #fbbf24;">0%</div>
                    </div>
                    <div class="stat-box">
                        <div style="font-size: 12px; color: #94a3b8;">Tổng cược</div>
                        <div id="total-val" style="font-size: 24px; font-weight: bold;">0</div>
                    </div>
                </div>
            </div>

            <div class="card">
                <h3 style="margin-top: 0;">📜 Lịch sử 20 ván gần nhất</h3>
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
                    document.getElementById('total-val').innerText = ai.total_played;

                    // Cập nhật bảng lịch sử
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
    const networkInfo = getNetworkInfo();
    console.log(`\n=========================================`);
    console.log(`🚀 api sunwin dd - Dashboard Ready`);
    console.log(`=========================================`);
    console.log(`   API TRẢ DATA : http://localhost:${PORT}/api/ddvipro`);
    console.log(`   DASHBOARD    : http://localhost:${PORT}/`);
    console.log(`=========================================\n`);
    connectWebSocket();
});
