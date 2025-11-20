/*
-------------- Quantumult X 配置 --------------

[MITM]
hostname = crm.nestlechinese.com

[rewrite_local]
# QC Authorization捕获
^https:\/\/crm\.nestlechinese\.com\/openapi\/member\/api\/User\/GetUserInfo url script-response-header https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/qc.js
*/
// qc.js - 捕获QC Authorization并管理多账号
(function() {
    'use strict';
    
    const TARGET_URL = 'https://crm.nestlechinese.com/openapi/member/api/User/GetUserInfo';
    
    // 检查是否是目标URL
    if (!$request || !$request.url.includes(TARGET_URL)) {
        $done({});
        return;
    }
    
    try {
        const headers = $request.headers;
        let authorization = headers['Authorization'] || headers['authorization'];
        
        if (!authorization) {
            console.log('[QC] 未找到Authorization头部');
            $done({});
            return;
        }
        
        // 去掉Bearer前缀
        if (authorization.startsWith('Bearer ')) {
            authorization = authorization.substring(7);
        }
        
        console.log(`[QC] 捕获到Authorization: ${authorization.substring(0, 20)}...`);
        
        // 管理多账号
        manageQcTokens(authorization);
        
    } catch (error) {
        console.log(`[QC] 错误: ${error}`);
    }
    
    $done({});
    
    function manageQcTokens(newToken) {
        const STORAGE_KEY = 'QC';
        const storedTokens = $prefs.valueForKey(STORAGE_KEY) || '';
        let tokensArray = storedTokens ? storedTokens.split('#').filter(t => t.trim() !== '') : [];
        
        // 检查是否已存在相同token
        let isNewToken = true;
        let accountNumber = tokensArray.length + 1;
        
        // 遍历现有token检查重复
        for (let i = 0; i < tokensArray.length; i++) {
            if (tokensArray[i] === newToken) {
                isNewToken = false;
                accountNumber = i + 1;
                break;
            }
        }
        
        if (isNewToken) {
            // 新token，添加到数组
            tokensArray.push(newToken);
            
            // 保存到BoxJS，用#分隔
            $prefs.setValueForKey(tokensArray.join('#'), STORAGE_KEY);
        }
        
        // 发送精简通知
        const title = isNewToken ? "✅ QC Authorization已添加" : "🔄 QC Authorization已存在";
        const subtitle = `账号${accountNumber}`;
        const message = `Token: ${newToken.substring(0, 15)}...`;
        
        $notify(title, subtitle, message);
        
        // 自动复制当前token
        if (typeof $tool !== 'undefined' && $tool.copy) {
            $tool.copy(newToken);
            console.log('[QC] Token已复制到剪贴板');
        }
    }
})();
