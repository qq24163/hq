/*
-------------- Quantumult X 配置 --------------

[MITM]
hostname = loginxx.10010.com

[rewrite_local]
# UNICOM token_online捕获
^https:\/\/loginxx\.10010\.com\/mobileService\/onLine\.htm url script-request-body https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/xunicom.js
*/
// unicom.js - 捕获UNICOM token_online并管理多账号
(function() {
    'use strict';
    
    const TARGET_URL = 'https://loginxx.10010.com/mobileService/onLine.htm';
    
    // 检查是否是目标URL
    if (!$request || !$request.url.includes(TARGET_URL)) {
        $done({});
        return;
    }
    
    try {
        // 获取请求主体
        const body = $request.body;
        if (!body) {
            console.log('[UNICOM] 请求主体为空');
            $done({});
            return;
        }
        
        let tokenOnline;
        
        // 解析表单数据
        const params = new URLSearchParams(body);
        
        // 尝试获取token_online
        tokenOnline = params.get('token_online') || params.get('tokenOnline') || params.get('token-online');
        
        if (!tokenOnline) {
            console.log('[UNICOM] 未找到token_online参数');
            $done({});
            return;
        }
        
        console.log(`[UNICOM] 捕获到token_online: ${tokenOnline}`);
        
        // 管理多账号
        manageUnicomTokens(tokenOnline);
        
    } catch (error) {
        console.log(`[UNICOM] 错误: ${error}`);
    }
    
    $done({});
    
    function manageUnicomTokens(newToken) {
        const STORAGE_KEY = 'xunicom';  // 修改为 xunicom
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
        const title = isNewToken ? "✅ xUNICOM token_online已添加" : "🔄 xUNICOM token_online已存在";
        const subtitle = `账号${accountNumber}`;
        const message = `Token: ${newToken.substring(0, 15)}...`;
        
        $notify(title, subtitle, message);
        
        // 自动复制当前token
        if (typeof $tool !== 'undefined' && $tool.copy) {
            $tool.copy(newToken);
            console.log('[UNICOM] token_online已复制到剪贴板');
        }
    }
})();