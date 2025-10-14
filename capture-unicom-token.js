/*
-------------- Quantumult X 配置 --------------

[MITM]
hostname = m.client.10010.com, *.10010.com

[rewrite_local]
^https:\/\/m\.client\.10010\.com\/mobileService\/onLine\.htm url script-request-body https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/capture-unicom-token.js
*/
// capture-unicom-token-enhanced.js
function extractTokenOnline(body) {
    let token = null;
    
    // 方法1: URLSearchParams（针对你的表单格式）
    try {
        const params = new URLSearchParams(body);
        token = params.get('token_online');
        if (token) return token;
    } catch (e) {}
    
    // 方法2: 正则匹配（兜底方案）
    const tokenMatch = body.match(/token_online=([^&]*)/);
    if (tokenMatch && tokenMatch[1]) {
        token = decodeURIComponent(tokenMatch[1]);
    }
    
    // 方法3: 分割字符串（最终保障）
    if (!token && body.includes('token_online=')) {
        const parts = body.split('token_online=');
        if (parts[1]) {
            token = parts[1].split('&')[0];
        }
    }
    
    return token;
}

// 主逻辑
if ($request.method === 'POST' && $request.body) {
    const tokenOnline = extractTokenOnline($request.body);
    
    if (tokenOnline) {
        // 存储数据
        $persistentStore.write(tokenOnline, "unicom_token_online");
        
        // 验证token格式（通常是长字符串）
        const isValidToken = tokenOnline.length > 50 && /^[a-fA-F0-9]+$/.test(tokenOnline);
        
        $notify(
            isValidToken ? "✅ 联通Token捕获成功" : "⚠️ Token格式异常",
            `长度: ${tokenOnline.length} 字符`,
            `前20位: ${tokenOnline.substring(0, 20)}...\n已自动复制到剪贴板`
        );
        
        $tool.copy(tokenOnline);
        
        // 调试信息
        console.log(`[TOKEN_DEBUG] 
Token长度: ${tokenOnline.length}
Token前缀: ${tokenOnline.substring(0, 10)}
完整Token: ${tokenOnline}
请求URL: ${$request.url}`);
        
    } else {
        console.log(`[DEBUG] 原始请求体:\n${$request.body}`);
        $notify("❌ Token捕获失败", "未找到token_online参数", "请查看日志");
    }
} else {
    console.log(`[DEBUG] 非POST请求或无请求体\nMethod: ${$request.method}\nURL: ${$request.url}`);
}

$done({});
