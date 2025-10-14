/*
-------------- Quantumult X 配置 --------------

[MITM]
hostname = m.client.10010.com

[rewrite_local]
^https:\/\/m\.client\.10010\.com\/mobileService\/onLine\.htm url script-request-body https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/capture-token.js
*/
// capture-token.js
// capture-token-enhanced.js
function extractToken(body) {
    let token = null;
    
    // 方法1: JSON格式
    try {
        const jsonData = JSON.parse(body);
        token = jsonData.token_online || jsonData.token || jsonData.data?.token;
    } catch (e) {}
    
    // 方法2: 表单格式
    if (!token) {
        try {
            const params = new URLSearchParams(body);
            token = params.get('token_online') || params.get('token');
        } catch (e) {}
    }
    
    // 方法3: 正则匹配（兜底方案）
    if (!token) {
        const tokenMatch = body.match(/token_online=([^&]*)/) || body.match(/token=([^&]*)/);
        if (tokenMatch) token = decodeURIComponent(tokenMatch[1]);
    }
    
    return token;
}

// 主逻辑
if ($request.method === 'POST' && $request.body) {
    const token = extractToken($request.body);
    
    if (token) {
        $persistentStore.write(token, "china_unicom_token");
        $notify("联通Token", "捕获成功", token);
        $tool.copy(token);
        
        // 记录捕获时间
        const timestamp = new Date().toLocaleString();
        $persistentStore.write(timestamp, "token_capture_time");
    } else {
        console.log(`[DEBUG] 原始请求体:\n${$request.body}`);
    }
}

$done({});
