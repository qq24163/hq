/*
-------------- Quantumult X 配置 --------------

[MITM]
hostname = yb.yuanhukj.com

[rewrite_local]
# 银鱼 万能匹配
^https:\/\/yb\.yuanhukj\.com\/api\/mobile\/.* url script-request-header https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/yinyu.js
*/
// yxyg_overview.js - 捕获银鱼接口Authorization
(function() {
    'use strict';
    
    // 更新为新域名
    const TARGET_URL = 'https://yb.yuanhukj.com/api/mobile/account/user/overview_my';
    
    // 检查是否是目标URL
    if (!$request || !$request.url.includes(TARGET_URL)) {
        console.log('[银鱼] 不是目标URL，跳过');
        $done({});
        return;
    }
    
    console.log('[银鱼] 匹配到overview_my接口');
    
    try {
        const headers = $request.headers;
        
        // 打印所有头部用于调试
        console.log('[银鱼] 请求头部:');
        for (const key in headers) {
            if (key.toLowerCase().includes('auth')) {
                console.log(`[银鱼] ${key}: ${headers[key].substring(0, 30)}...`);
            }
        }
        
        let authorization = headers['Authorization'] || headers['authorization'];
        
        if (!authorization) {
            console.log('[银鱼] 未找到Authorization头部');
            $done({});
            return;
        }
        
        console.log(`[银鱼] 原始Authorization: ${authorization}`);
        
        // 去掉Bearer前缀
        if (authorization.startsWith('Bearer ')) {
            authorization = authorization.substring(7);
        }
        
        console.log(`[银鱼] 清理后Authorization: ${authorization.substring(0, 20)}...`);
        
        // 管理多账号
        manageYinyuTokens(authorization);
        
    } catch (error) {
        console.log(`[银鱼] 错误: ${error}`);
    }
    
    $done({});
    
    function manageYinyuTokens(newToken) {
        const STORAGE_KEY = 'YINYU';  // 改名避免混淆
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
        const title = isNewToken ? "✅ 银鱼 Token已添加" : "🔄 银鱼 Token已存在";
        const subtitle = `账号${accountNumber}`;
        const message = `Token: ${newToken.substring(0, 15)}...`;
        
        $notify(title, subtitle, message);
        
        // 自动复制当前token
        if (typeof $tool !== 'undefined' && $tool.copy) {
            $tool.copy(newToken);
            console.log('[银鱼] Token已复制到剪贴板');
        }
    }
})();