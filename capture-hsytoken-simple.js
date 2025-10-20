/*
-------------- Quantumult X 配置 --------------

[MITM]
hostname = www.52bjy.com

[rewrite_local]
^https:\/\/www\.52bjy\.com\/api\/avatar\/show\.php.*username= url script-request-header https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/capture-hsytoken-simple.js
*/
// capture-hsytoken-comprehensive.js - 综合标识去重
(function() {
    'use strict';
    
    const url = $request.url;
    
    if (!url.includes('www.52bjy.com/api/avatar/show.php') || !url.includes('username=')) {
        $done({});
        return;
    }
    
    try {
        const username = new URL(url).searchParams.get('username');
        
        if (!username) {
            $done({});
            return;
        }
        
        const now = Date.now();
        const timeWindow = 10000; // 10秒
        
        const headers = $request.headers;
        
        // 构建综合账号标识
        let accountId = '';
        
        // 1. 使用IP地址
        let clientIP = headers['X-Real-IP'] || headers['X-Forwarded-For'] || 'unknown';
        if (clientIP.includes(',')) clientIP = clientIP.split(',')[0].trim();
        accountId += clientIP + '|';
        
        // 2. 使用User-Agent核心部分
        const userAgent = headers['User-Agent'] || 'unknown';
        const uaCore = userAgent.replace(/\/[^\s]+\s/g, '/XXX ').substring(0, 50);
        accountId += uaCore + '|';
        
        // 3. 使用Cookie中的会话ID（如果有）
        if (headers['Cookie']) {
            const cookie = headers['Cookie'];
            const sessionMatch = cookie.match(/(PHPSESSID|session)=([^;]+)/);
            if (sessionMatch) {
                accountId += sessionMatch[2];
            }
        }
        
        // 获取请求记录
        const requestRecentStr = $prefs.valueForKey('hsy_request_tracker') || '{}';
        const requestRecent = JSON.parse(requestRecentStr);
        
        // 检查该账号标识是否在10秒内已有请求
        if (requestRecent[accountId] && (now - requestRecent[accountId] < timeWindow)) {
            console.log(`[HSYTOKEN] 10秒内已有请求，跳过 username: ${username}`);
            $done({});
            return;
        }
        
        // 更新请求时间
        requestRecent[accountId] = now;
        $prefs.setValueForKey(JSON.stringify(requestRecent), 'hsy_request_tracker');
        
        // 保存到BoxJS
        $prefs.setValueForKey(username, 'hsytoken_current');
        
        let allUsernames = ($prefs.valueForKey('HSYTOKEN') || '').split('#').filter(u => u);
        const isNew = !allUsernames.includes(username);
        
        if (isNew) {
            if (allUsernames.length >= 10) allUsernames.shift();
            allUsernames.push(username);
            $prefs.setValueForKey(allUsernames.join('#'), 'HSYTOKEN');
        }
        
        $notify(
            isNew ? "✅ 新HSYTOKEN" : "🔄 HSYTOKEN",
            `账号数: ${allUsernames.length}`,
            `Username: ${username}`
        );
        
        $tool.copy(username);
        
    } catch (e) {
        console.log('[HSYTOKEN Error] ' + e);
    }
    
    $done({});
})();
