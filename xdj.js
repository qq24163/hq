/*
-------------- Quantumult X 配置 --------------

[MITM]
hostname = lm.api.sujh.net

[rewrite_local]
^https:\/\/lm\.api\.sujh\.net\/app\/user\/index url script-request-header https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/xdj.js
*/
// xdj.js - 捕获Authorization存储到XDJTOKEN
(function() {
    'use strict';
    
    const url = $request.url;
    
    // 检查是否是目标URL
    if (!url.includes('lm.api.sujh.net/app/user/index')) {
        $done({});
        return;
    }
    
    try {
        const headers = $request.headers;
        const authorization = headers['Authorization'] || headers['authorization'];
        
        if (!authorization) {
            console.log('[XDJTOKEN] 未找到Authorization头部');
            $done({});
            return;
        }
        
        console.log(`[XDJTOKEN] 捕获到Authorization: ${authorization.substring(0, 20)}...`);
        
        // 保存到BoxJS
        $prefs.setValueForKey(authorization, 'xdjtoken_current');
        
        // 多账号管理（&分隔）
        const storedTokens = $prefs.valueForKey('XDJTOKEN') || '';
        let tokensArray = storedTokens ? storedTokens.split('&').filter(t => t.trim() !== '') : [];
        
        const isNewToken = !tokensArray.includes(authorization);
        
        if (isNewToken) {
            // 新token，添加到数组
            if (tokensArray.length >= 10) {
                tokensArray.shift(); // 移除最早的账号
            }
            tokensArray.push(authorization);
            
            // 保存用&分隔的字符串
            const newTokensString = tokensArray.join('&');
            $prefs.setValueForKey(newTokensString, 'XDJTOKEN');
        }
        
        // 单条精简通知
        $notify(
            isNewToken ? "✅ 新XDJTOKEN" : "🔄 XDJTOKEN",
            `账号数: ${tokensArray.length}`,
            `Token: ${authorization.substring(0, 15)}...`
        );
        
        // 自动复制当前token
        if (typeof $tool !== 'undefined' && $tool.copy) {
            $tool.copy(authorization);
        }
        
    } catch (error) {
        console.log(`[XDJTOKEN] 错误: ${error}`);
    }
    
    $done({});
})();
