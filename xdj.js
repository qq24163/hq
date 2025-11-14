/*
-------------- Quantumult X 配置 --------------

[MITM][MITM]
hostname = lm.api.sujh.net

[rewrite_local]
# XDJ Authorization和User-Agent捕获
^https:\/\/lm\.api\.sujh\.net\/app\/index\/index url script-response-header https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/xdj.js
*/
// xdj.js - 捕获XDJ Authorization和User-Agent并管理多账号
(function() {
    'use strict';
    
    const TARGET_URL = 'https://lm.api.sujh.net/app/index/index';
    
    // 检查是否是目标URL
    if (!$request || !$request.url.includes(TARGET_URL)) {
        $done({});
        return;
    }
    
    try {
        const headers = $request.headers;
        let authorization = headers['Authorization'] || headers['authorization'];
        const userAgent = headers['User-Agent'] || headers['user-agent'];
        
        if (!authorization) {
            console.log('[XDJ] 未找到Authorization头部');
            $done({});
            return;
        }
        
        if (!userAgent) {
            console.log('[XDJ] 未找到User-Agent头部');
            $done({});
            return;
        }
        
        // 去掉Bearer前缀
        if (authorization.startsWith('Bearer ')) {
            authorization = authorization.substring(7);
        }
        
        console.log(`[XDJ] 捕获到Authorization: ${authorization.substring(0, 20)}...`);
        console.log(`[XDJ] 捕获到User-Agent: ${userAgent.substring(0, 30)}...`);
        
        // 管理多账号
        manageXdjData(authorization, userAgent);
        
    } catch (error) {
        console.log(`[XDJ] 错误: ${error}`);
    }
    
    $done({});
    
    function manageXdjData(newAuthorization, newUserAgent) {
        const STORAGE_KEY = 'XDJ';
        const storedData = $prefs.valueForKey(STORAGE_KEY) || '';
        let dataArray = storedData ? storedData.split('\n').filter(d => d.trim() !== '') : [];
        
        // 检查是否已存在相同Authorization
        let isNewData = true;
        let accountNumber = dataArray.length + 1;
        
        // 遍历现有数据检查重复
        for (let i = 0; i < dataArray.length; i++) {
            const existingAuthorization = dataArray[i].split('#')[0];
            if (existingAuthorization === newAuthorization) {
                isNewData = false;
                accountNumber = i + 1;
                break;
            }
        }
        
        if (isNewData) {
            // 新数据，添加到数组，格式：Authorization#User-Agent
            dataArray.push(`${newAuthorization}#${newUserAgent}`);
            
            // 保存到BoxJS
            $prefs.setValueForKey(dataArray.join('\n'), STORAGE_KEY);
        }
        
        // 发送精简通知
        const title = isNewData ? "✅ XDJ 数据已添加" : "🔄 XDJ 数据已存在";
        const subtitle = `账号${accountNumber}`;
        const message = `Auth: ${newAuthorization.substring(0, 10)}...`;
        
        $notify(title, subtitle, message);
        
        // 自动复制当前Authorization
        if (typeof $tool !== 'undefined' && $tool.copy) {
            $tool.copy(newAuthorization);
            console.log('[XDJ] Authorization已复制到剪贴板');
        }
    }
})();