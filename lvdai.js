/*
-------------- Quantumult X 配置 --------------

[MITM]
hostname = www.lvdhb.com

[rewrite_local]
# LVDAI Token捕获
^https:\/\/www\.lvdhb\.com\/MiniProgramApiCore\/api\/v3\/My\/GetMyInfo url script-response-header https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/lvdai.js
*/
// lvdai.js - 捕获LVDAI Token并管理多账号
(function() {
    'use strict';
    
    const TARGET_URL = 'https://www.lvdhb.com/MiniProgramApiCore/api/v3/My/GetMyInfo';
    
    // 检查是否是目标URL
    if (!$request || $request.url !== TARGET_URL) {
        $done({});
        return;
    }
    
    try {
        const headers = $request.headers;
        const token = headers['Token'] || headers['token'] || headers['Authorization'] || headers['authorization'];
        
        if (!token) {
            console.log('[LVDAI] 未找到Token头部');
            $done({});
            return;
        }
        
        console.log(`[LVDAI] 捕获到Token: ${token.substring(0, 20)}...`);
        
        // 管理多账号
        manageLvdaiTokens(token);
        
    } catch (error) {
        console.log(`[LVDAI] 错误: ${error}`);
    }
    
    $done({});
    
    function manageLvdaiTokens(newToken) {
        const STORAGE_KEY = 'LVDAI';
        const storedTokens = $prefs.valueForKey(STORAGE_KEY) || '';
        let tokensArray = storedTokens ? storedTokens.split('\n').filter(t => t.trim() !== '') : [];
        
        // 检查是否已存在相同token
        let isNewToken = true;
        let accountNumber = tokensArray.length + 1;
        
        // 遍历现有token检查重复
        for (let i = 0; i < tokensArray.length; i++) {
            const existingToken = tokensArray[i].split('#')[1];
            if (existingToken === newToken) {
                isNewToken = false;
                accountNumber = i + 1;
                break;
            }
        }
        
        if (isNewToken) {
            // 新token，添加到数组
            tokensArray.push(`账号${tokensArray.length + 1}#${newToken}`);
            
            // 保存到BoxJS
            $prefs.setValueForKey(tokensArray.join('\n'), STORAGE_KEY);
        }
        
        // 发送精简通知
        const title = isNewToken ? "✅ LVDAI Token已添加" : "🔄 LVDAI Token已存在";
        const subtitle = `账号${accountNumber}`;
        const message = `Token: ${newToken.substring(0, 15)}...`;
        
        $notify(title, subtitle, message);
        
        // 自动复制当前token
        if (typeof $tool !== 'undefined' && $tool.copy) {
            $tool.copy(newToken);
            console.log('[LVDAI] Token已复制到剪贴板');
        }
    }
})();
