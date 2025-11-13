/*
-------------- Quantumult X 配置 --------------

[MITM]
hostname = app.duoyukeji.net

[rewrite_local]
# ZZY user-token捕获
^https:\/\/app\.duoyukeji\.net\/api\/open\/popularize\/userMessage url script-response-header https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/zzy.js

*/
// zzy.js - 捕获ZZY user-token并管理多账号
(function() {
    'use strict';
    
    const TARGET_URL = 'https://app.duoyukeji.net/api/open/popularize/userMessage';
    
    // 检查是否是目标URL
    if (!$request || !$request.url.includes(TARGET_URL)) {
        $done({});
        return;
    }
    
    try {
        const headers = $request.headers;
        const userToken = headers['User-Token'] || headers['user-token'] || headers['UserToken'] || headers['usertoken'];
        
        if (!userToken) {
            console.log('[ZZY] 未找到user-token头部');
            $done({});
            return;
        }
        
        console.log(`[ZZY] 捕获到user-token: ${userToken.substring(0, 20)}...`);
        
        // 管理多账号
        manageZzyTokens(userToken);
        
    } catch (error) {
        console.log(`[ZZY] 错误: ${error}`);
    }
    
    $done({});
    
    function manageZzyTokens(newToken) {
        const STORAGE_KEY = 'ZZY';
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
            // 新token，添加到数组，格式：user-token#序号
            tokensArray.push(`${newToken}#${tokensArray.length + 1}`);
            
            // 保存到BoxJS
            $prefs.setValueForKey(tokensArray.join('\n'), STORAGE_KEY);
        }
        
        // 发送精简通知
        const title = isNewToken ? "✅ ZZY user-token已添加" : "🔄 ZZY user-token已存在";
        const subtitle = `账号${accountNumber}`;
        const message = `Token: ${newToken.substring(0, 15)}...`;
        
        $notify(title, subtitle, message);
        
        // 自动复制当前token
        if (typeof $tool !== 'undefined' && $tool.copy) {
            $tool.copy(newToken);
            console.log('[ZZY] user-token已复制到剪贴板');
        }
    }
})();
