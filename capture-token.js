/*
-------------- Quantumult X 配置 --------------

[MITM]
hostname = m.client.10010.com

[rewrite_local]
^https:\/\/m\.client\.10010\.com\/mobileService\/onLine\.htm url script-request-body https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/capture-token.js
*/
// capture-unicom-token.js
const method = $request.method;
let tokenOnline = null;

if (method === 'POST' && $request.body) {
    try {
        // 解析URL编码的表单数据
        const params = new URLSearchParams($request.body);
        tokenOnline = params.get('token_online');
        
        if (tokenOnline) {
            console.log(`[SUCCESS] 成功捕获token_online`);
        } else {
            // 调试：输出所有参数名
            const allParams = {};
            for (let [key, value] of params) {
                allParams[key] = key === 'token_online' ? value : '***';
            }
            console.log(`[DEBUG] 所有参数: ${JSON.stringify(allParams)}`);
        }
    } catch (e) {
        console.log(`[ERROR] 解析失败: ${e}\n原始数据: ${$request.body}`);
    }
}

if (tokenOnline) {
    // 存储token
    $persistentStore.write(tokenOnline, "unicom_token_online");
    
    // 发送通知（显示前20位，避免通知过长）
    const shortToken = tokenOnline.substring(0, 20) + '...';
    $notify(
        "联通在线Token捕获",
        `长度: ${tokenOnline.length} 字符`,
        `Token: ${shortToken}\n点击通知复制完整Token`
    );
    
    // 自动复制完整token到剪贴板
    $tool.copy(tokenOnline);
    
    // 记录捕获信息
    const captureInfo = {
        timestamp: new Date().toLocaleString('zh-CN'),
        token_length: tokenOnline.length,
        token_prefix: tokenOnline.substring(0, 10)
    };
    $persistentStore.write(JSON.stringify(captureInfo), "token_capture_info");
    
} else {
    $notify("联通Token捕获失败", "", "请检查请求体格式");
}

$done({});
