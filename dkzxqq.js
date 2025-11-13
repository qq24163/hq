/*
-------------- Quantumult X 配置 --------------

[MITM]
hostname = rr.qq66.cn

[rewrite_local]
# DKZXQQ Token捕获
^https:\/\/rr\.qq66\.cn\/app\/index\.php url script-response-header https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/dkzxqq.js

*/
// dkzxqq.js - 捕获DKZXQQ Token并管理多账号
(function() {
    'use strict';
    
    const TARGET_URL = 'https://rr.qq66.cn/app/index.php';
    
    // 检查是否是目标URL
    if (!$request || !$request.url.includes(TARGET_URL)) {
        $done({});
        return;
    }
    
    try {
        const url = new URL($request.url);
        const token = url.searchParams.get('token');
        
        if (!token) {
            console.log('[DKZXQQ] 未找到token参数');
            $done({});
            return;
        }
        
        console.log(`[DKZXQQ] 捕获到Token: ${token}`);
        
        // 管理多账号
        manageDkzxqqTokens(token);
        
    } catch (error) {
        console.log(`[DKZXQQ] 错误: ${error}`);
    }
    
    $done({});
    
    function manageDkzxqqTokens(newToken) {
        const STORAGE_KEY = 'DKZXQQ';
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
            // 新token，添加到数组，格式：token#序号
            tokensArray.push(`${newToken}#${tokensArray.length + 1}`);
            
            // 保存到BoxJS
            $prefs.setValueForKey(tokensArray.join('\n'), STORAGE_KEY);
        }
        
        // 发送精简通知
        const title = isNewToken ? "✅ DKZXQQ Token已添加" : "🔄 DKZXQQ Token已存在";
        const subtitle = `账号${accountNumber}`;
        const message = `Token: ${newToken.substring(0, 10)}...`;
        
        $notify(title, subtitle, message);
        
        // 自动复制当前token
        if (typeof $tool !== 'undefined' && $tool.copy) {
            $tool.copy(newToken);
            console.log('[DKZXQQ] Token已复制到剪贴板');
        }
    }
})();
