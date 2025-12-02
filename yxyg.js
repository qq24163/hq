/*
-------------- Quantumult X 配置 --------------

[MITM]
hostname = yh.sentezhenxuan.com

[rewrite_local]
# YXYG Authorization捕获
^https:\/\/yh\.sentezhenxuan\.com\/api\/mobile\/shop\/mobile\/app url script-response-header https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/yxyg.js
*/
// yxyg.js - 捕获YXYG Authorization并管理多账号
(function() {
    'use strict';
    
    const TARGET_URL = 'https://yh.sentezhenxuan.com/api/mobile/shop/mobile/app';
    
    // 检查是否是目标URL
    if (!$request || !$request.url.includes(TARGET_URL)) {
        $done({});
        return;
    }
    
    try {
        const headers = $request.headers;
        let authorization = headers['Authorization'] || headers['authorization'];
        
        if (!authorization) {
            console.log('[YXYG] 未找到Authorization头部');
            $done({});
            return;
        }
        
        // 去掉Bearer前缀
        if (authorization.startsWith('Bearer ')) {
            authorization = authorization.substring(7);
        }
        
        console.log(`[YXYG] 捕获到Authorization: ${authorization.substring(0, 20)}...`);
        
        // 管理多账号
        manageYxygTokens(authorization);
        
    } catch (error) {
        console.log(`[YXYG] 错误: ${error}`);
    }
    
    $done({});
    
    function manageYxygTokens(newToken) {
        const STORAGE_KEY = 'YXYG';
        const storedTokens = $prefs.valueForKey(STORAGE_KEY) || '';
        let tokensArray = storedTokens ? storedTokens.split('\n').filter(t => t.trim() !== '') : [];
        
        // 检查是否已存在相同token
        let isNewToken = true;
        let accountNumber = tokensArray.length + 1;
        
        // 遍历现有token检查重复
        for (let i = 0; i < tokensArray.length; i++) {
            const existingToken = tokensArray[i].split('#')[0];
            if (existingToken === newToken) {
                isNewToken = false;
                accountNumber = i + 1;
                break;
            }
        }
        
        if (isNewToken) {
            // 新token，添加到数组，格式：authorization#序号
            tokensArray.push(`${newToken}#${tokensArray.length + 1}`);
            
            // 保存到BoxJS
            $prefs.setValueForKey(tokensArray.join('\n'), STORAGE_KEY);
        }
        
        // 发送精简通知
        const title = isNewToken ? "✅ YXYG Authorization已添加" : "🔄 YXYG Authorization已存在";
        const subtitle = `账号${accountNumber}`;
        const message = `Token: ${newToken.substring(0, 15)}...`;
        
        $notify(title, subtitle, message);
        
        // 自动复制当前token
        if (typeof $tool !== 'undefined' && $tool.copy) {
            $tool.copy(newToken);
            console.log('[YXYG] Token已复制到剪贴板');
        }
    }
})();
