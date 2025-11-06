/*
-------------- Quantumult X 配置 --------------

[MITM]
hostname = lm.api.sujh.net

[rewrite_local]
^https:\/\/lm\.api\.sujh\.net\/app\/msgTemplate\/list url script-request-header https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/xdj.js
*/
// view-xdj.js - 查看XDJTOKEN数据
try {
    const current = $prefs.valueForKey('xdjtoken_current');
    const allTokensStr = $prefs.valueForKey('XDJTOKEN') || '';
    const allTokens = allTokensStr.split('&').filter(t => t);
    
    let message = `总账号数: ${allTokens.length}\n\n`;
    
    allTokens.forEach((token, index) => {
        message += `账号${index + 1}: ${token.substring(0, 25)}...\n\n`;
    });
    
    if (current) {
        message += `当前Token: ${current.substring(0, 30)}...`;
    }
    
    $notify("📦 XDJTOKEN数据", "多账号&分隔", message);
    
    // 复制所有token（&分隔格式）
    $tool.copy(allTokensStr);
    
} catch (e) {
    $notify("❌ 数据读取失败", "", e.toString());
}

$done({});
