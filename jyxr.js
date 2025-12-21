/*
-------------- Quantumult X 配置 --------------

[MITM]
hostname = jiuyixiaoer.fzjingzhou.com

[rewrite_local]
# JYXR scoreList接口Token捕获
^https:\/\/jiuyixiaoer\.fzjingzhou\.com\/api\/Cash\/scoreList url script-response-body https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/jyxr.js
*/
// jyxr_score.js - 捕获JYXR scoreList接口token并管理多账号
(function() {
    'use strict';
    
    const TARGET_URL = 'https://jiuyixiaoer.fzjingzhou.com/api/Cash/scoreList';
    
    // 检查是否是目标URL
    if (!$request || !$request.url.includes(TARGET_URL)) {
        $done({});
        return;
    }
    
    try {
        // 获取响应体
        const body = $response.body;
        if (!body) {
            console.log('[JYXR_SCORE] 响应体为空');
            $done({});
            return;
        }
        
        let token;
        try {
            const data = JSON.parse(body);
            // 尝试从不同字段获取token
            token = data.token || data.data?.token || data.access_token || data.Token;
        } catch (e) {
            console.log('[JYXR_SCORE] 解析响应体失败');
            $done({});
            return;
        }
        
        if (!token) {
            console.log('[JYXR_SCORE] 未找到token字段');
            $done({});
            return;
        }
        
        console.log(`[JYXR_SCORE] 捕获到Token: ${token.substring(0, 20)}...`);
        
        // 管理多账号
        manageJyxrTokens(token);
        
    } catch (error) {
        console.log(`[JYXR_SCORE] 错误: ${error}`);
    }
    
    $done({});
    
    function manageJyxrTokens(newToken) {
        const STORAGE_KEY = 'JYXR';
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
        const title = isNewToken ? "✅ JYXR Token已添加" : "🔄 JYXR Token已存在";
        const subtitle = `账号${accountNumber}`;
        const message = `Token: ${newToken.substring(0, 15)}...`;
        
        $notify(title, subtitle, message);
        
        // 自动复制当前token
        if (typeof $tool !== 'undefined' && $tool.copy) {
            $tool.copy(newToken);
            console.log('[JYXR_SCORE] Token已复制到剪贴板');
        }
    }
})();