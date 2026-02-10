/*
-------------- Quantumult X 配置 --------------

[MITM]
hostname = panservice.mail.wo.cn

[rewrite_local]
# 联通云盘Access-Token捕获
^https:\/\/panservice\.mail\.wo\.cn\/wohome\/open\/v1\/resource\/query\/app-upgrade-pop url script-request-header https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/ltyp.js
*/
// lt_token.js - 捕获联通云盘Access-Token并管理多账号
(function() {
    'use strict';
    
    const TARGET_URL = 'https://panservice.mail.wo.cn/wohome/open/v1/resource/query/app-upgrade-pop';
    
    // 检查是否是目标URL
    if (!$request || !$request.url.includes(TARGET_URL)) {
        $done({});
        return;
    }
    
    try {
        const headers = $request.headers;
        // 获取Access-Token（尝试多种可能的头部名称）
        const accessToken = headers['Access-Token'] || headers['access-token'] || 
                           headers['X-YP-Access-Token'] || headers['x-yp-access-token'] ||
                           headers['access_token'] || headers['Access_Token'];
        
        if (!accessToken) {
            console.log('[LT_TOKEN] 未找到Access-Token头部');
            $done({});
            return;
        }
        
        console.log(`[LT_TOKEN] 捕获到Access-Token: ${accessToken}`);
        
        // 管理多账号
        manageLtTokens(accessToken);
        
    } catch (error) {
        console.log(`[LT_TOKEN] 错误: ${error}`);
    }
    
    $done({});
    
    function manageLtTokens(newToken) {
        const STORAGE_KEY = 'LTTY';
        const storedTokens = $prefs.valueForKey(STORAGE_KEY) || '';
        let tokensArray = storedTokens ? storedTokens.split('&').filter(t => t.trim() !== '') : [];
        
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
            
            // 保存到BoxJS，用&分隔
            $prefs.setValueForKey(tokensArray.join('&'), STORAGE_KEY);
        }
        
        // 发送精简通知
        const title = isNewToken ? "✅ 联通云盘Token已添加" : "🔄 联通云盘Token已存在";
        const subtitle = `账号${accountNumber}`;
        const message = `Token: ${newToken.substring(0, 10)}...`;
        
        $notify(title, subtitle, message);
        
        // 自动复制当前token
        if (typeof $tool !== 'undefined' && $tool.copy) {
            $tool.copy(newToken);
            console.log('[LT_TOKEN] Token已复制到剪贴板');
        }
    }
})();