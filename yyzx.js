/*
-------------- Quantumult X 配置 --------------

[MITM]
hostname = n05.sentezhenxuan.com

[rewrite_local]
^https:\/\/n05\.sentezhenxuan\.com\/api\/user url script-request-header https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/yyzx.js
*/
// capture-sxsgtoken.js - 捕获Authorization并格式化为序号格式
(function() {
    'use strict';
    
    const url = $request.url;
    
    // 检查是否是目标URL
    if (!url.includes('n05.sentezhenxuan.com/api/user')) {
        $done({});
        return;
    }
    
    try {
        const headers = $request.headers;
        const authorization = headers['Authori-zation'] || headers['Authorization'] || headers['authorization'];
        
        if (!authorization) {
            console.log('[SXSGTOKEN] 未找到Authorization头部');
            $done({});
            return;
        }
        
        console.log(`[SXSGTOKEN] 捕获到Authorization: ${authorization.substring(0, 20)}...`);
        
        // 保存到BoxJS
        $prefs.setValueForKey(authorization, 'sxsgtoken_current');
        
        // 多账号管理（换行分隔）
        const storedTokens = $prefs.valueForKey('SXSGTOKEN') || '';
        let tokensArray = storedTokens ? storedTokens.split('\n').filter(t => t.trim() !== '') : [];
        
        // 移除可能存在的旧序号
        const cleanTokens = tokensArray.map(token => {
            return token.replace(/^\d+#/, '');
        });
        
        const isNewToken = !cleanTokens.includes(authorization);
        
        if (isNewToken) {
            // 新token，添加到数组
            if (cleanTokens.length >= 10) {
                cleanTokens.shift(); // 移除最早的账号
            }
            cleanTokens.push(authorization);
            
            // 添加序号并保存用换行分隔的字符串
            const numberedTokens = cleanTokens.map((token, index) => {
                return `${index + 1}#${token}`;
            });
            
            const newTokensString = numberedTokens.join('\n');
            $prefs.setValueForKey(newTokensString, 'SXSGTOKEN');
        }
        
        // 单条精简通知
        $notify(
            isNewToken ? "✅ 新SXSGTOKEN" : "🔄 SXSGTOKEN",
            `账号数: ${cleanTokens.length}`,
            `Token: ${authorization.substring(0, 15)}...`
        );
        
        // 自动复制当前token
        if (typeof $tool !== 'undefined' && $tool.copy) {
            $tool.copy(authorization);
        }
        
    } catch (error) {
        console.log(`[SXSGTOKEN] 错误: ${error}`);
    }
    
    $done({});
})();
