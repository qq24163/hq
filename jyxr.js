/*
-------------- Quantumult X 配置 --------------

[MITM]
hostname = jiuyixiaoer.fzjingzhou.com

[rewrite_local]
# JYXR sign接口Token捕获（请求主体版本）
^https:\/\/jiuyixiaoer\.fzjingzhou\.com\/api\/Person\/sign url script-request-body https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/jyxr.js
*/
// jyxr_sign.js - 捕获JYXR sign接口请求主体中的token
(function() {
    'use strict';
    
    const TARGET_URL = 'https://jiuyixiaoer.fzjingzhou.com/api/Person/sign';
    
    // 检查是否是目标URL
    if (!$request || !$request.url.includes(TARGET_URL)) {
        $done({});
        return;
    }
    
    try {
        // 获取请求主体
        const body = $request.body;
        if (!body) {
            console.log('[JYXR_SIGN] 请求主体为空');
            $done({});
            return;
        }
        
        console.log(`[JYXR_SIGN] 请求主体: ${body.substring(0, 100)}...`);
        
        let token = '';
        
        // 解析表单数据
        if (body.includes('token=')) {
            const match = body.match(/token=([^&]*)/);
            if (match && match[1]) {
                token = match[1];
            }
        }
        
        if (!token) {
            console.log('[JYXR_SIGN] 未找到token参数');
            $done({});
            return;
        }
        
        console.log(`[JYXR_SIGN] 捕获到Token: ${token}`);
        
        // 管理多账号
        manageJyxrTokens(token);
        
    } catch (error) {
        console.log(`[JYXR_SIGN] 错误: ${error}`);
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
            console.log('[JYXR_SIGN] Token已复制到剪贴板');
        }
    }
})();