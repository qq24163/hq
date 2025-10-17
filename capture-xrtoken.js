/*
-------------- Quantumult X 配置 --------------

[MITM]
hostname = jiuyixiaoer.fzjingzhou.com

[rewrite_local]
^https:\/\/jiuyixiaoer\.fzjingzhou\.com\/api\/Person\/sign url script-request-body capture-xrtoken.js
*/
// capture-xrtoken.js - 捕获XRTOKEN，多账号用@分隔
const method = $request.method;
let tokenValue = null;

if (method === 'POST' && $request.body) {
    try {
        // 解析URL编码的表单数据
        const params = new URLSearchParams($request.body);
        tokenValue = params.get('token');
        
        if (!tokenValue) {
            // 尝试其他可能的参数名
            tokenValue = params.get('access_token') || params.get('auth_token');
        }
    } catch (e) {
        console.log(`[ERROR] 解析失败: ${e}`);
    }
}

if (tokenValue) {
    // 存储到BoxJS
    $prefs.setValueForKey(tokenValue, 'xrtoken_current');
    
    // 多账号管理（用@分隔）
    let allTokensStr = $prefs.valueForKey('XRTOKEN') || '';
    let allTokens = allTokensStr ? allTokensStr.split('@') : [];
    
    // 检查是否新token
    const isNewToken = !allTokens.includes(tokenValue);
    
    if (isNewToken) {
        // 新token，添加到数组
        if (allTokens.length >= 10) allTokens.shift(); // 限制10个账号
        allTokens.push(tokenValue);
        
        // 保存用@分隔的字符串
        $prefs.setValueForKey(allTokens.join('@'), 'XRTOKEN');
    }
    
    // 单条精简通知
    $notify(
        isNewToken ? "✅ 新XRTOKEN" : "🔄 XRTOKEN",
        `Token: ${tokenValue.substring(0, 15)}...`,
        `账号数: ${allTokens.length}`
    );
    
    // 自动复制当前token
    $tool.copy(tokenValue);
    
} else {
    console.log(`[DEBUG] 未找到token\n请求体: ${$request.body}`);
}

$done({});
