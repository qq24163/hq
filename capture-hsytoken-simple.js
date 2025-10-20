/*
-------------- Quantumult X 配置 --------------

[MITM]
hostname = www.52bjy.com

[rewrite_local]
^https:\/\/www\.52bjy\.com\/api\/avatar\/show\.php.*username= url script-request-header https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/capture-hsytoken-simple.js
*/
// capture-hsytoken-session.js - 基于会话去重（推荐）
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
        
        // 获取当前会话已记录的username
        const sessionKey = 'hsytoken_session_usernames';
        let sessionUsernames = JSON.parse($prefs.valueForKey(sessionKey) || '[]');
        
        const isNewInSession = !sessionUsernames.includes(username);
        
        if (isNewInSession) {
            // 添加到会话记录
            sessionUsernames.push(username);
            $prefs.setValueForKey(JSON.stringify(sessionUsernames), sessionKey);
            
            // 保存到永久存储
            let allUsernames = ($prefs.valueForKey('HSYTOKEN') || '').split('#').filter(u => u);
            if (!allUsernames.includes(username)) {
                if (allUsernames.length >= 10) allUsernames.shift();
                allUsernames.push(username);
                $prefs.setValueForKey(allUsernames.join('#'), 'HSYTOKEN');
            }
            
            $prefs.setValueForKey(username, 'hsytoken_current');
            
            // 单条通知
            $notify(
                "✅ 新HSYTOKEN",
                `账号${allUsernames.length}个`,
                `Username: ${username}`
            );
            
            $tool.copy(username);
            console.log(`[HSYTOKEN] 会话中新username: ${username}`);
        } else {
            console.log(`[HSYTOKEN] 会话中已存在: ${username}`);
        }
        
    } catch (e) {
        console.log('[HSYTOKEN Error] ' + e);
    }
    
    $done({});
})();
