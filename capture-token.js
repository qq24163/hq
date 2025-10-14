/*
-------------- Quantumult X 配置 --------------

[MITM]
hostname = m.client.10010.com

[rewrite_local]
^https:\/\/m\.client\.10010\.com\/mobileService\/onLine\.htm url script-request-body https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/capture-token.js
*/
// capture-token.js
const method = $request.method;
let tokenOnline = null;

if (method === 'POST' && $request.body) {
    try {
        // 尝试解析JSON格式
        const body = JSON.parse($request.body);
        tokenOnline = body.token_online || body.token;
    } catch (e) {
        // 尝试解析表单格式
        try {
            const params = new URLSearchParams($request.body);
            tokenOnline = params.get('token_online') || params.get('token');
        } catch (e2) {
            console.log(`[ERROR] 解析失败: ${e2}`);
        }
    }
}

if (tokenOnline) {
    // 存储token
    $persistentStore.write(tokenOnline, "online_token");
    
    // 发送通知
    $notify(
        "联通在线Token捕获",
        `请求URL: ${$request.url}`,
        `Token: ${tokenOnline}`
    );
    
    // 自动复制到剪贴板
    $tool.copy(tokenOnline);
    
    console.log(`[SUCCESS] Token捕获: ${tokenOnline}`);
} else {
    console.log(`[DEBUG] 未找到token_online\n请求方法: ${method}\n请求体: ${$request.body}`);
}

$done({});
