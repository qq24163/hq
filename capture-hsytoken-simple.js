/*
-------------- Quantumult X 配置 --------------

[MITM]
hostname = www.52bjy.com

[rewrite_local]
^https:\/\/www\.52bjy\.com\/api\/avatar\/show\.php.*username= url script-request-header https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/capture-hsytoken-simple.js
*/
// capture-hsytoken-simplecount.js - 简单计数控制
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
        
        // 简单的计数控制
        const maxUsernames = 1; // 最多记录1个不同的username
        let allUsernames = ($prefs.valueForKey('HSYTOKEN') || '').split('#').filter(u => u);
        
        const isNewUsername = !allUsernames.includes(username);
        
        if (isNewUsername && allUsernames.length < maxUsernames) {
            // 新username且在限额内
            allUsernames.push(username);
            $prefs.setValueForKey(allUsernames.join('#'), 'HSYTOKEN');
            $prefs.setValueForKey(username, 'hsytoken_current');
            
            $notify(
                "✅ HSYTOKEN记录",
                `已记录: ${allUsernames.length}/${maxUsernames}`,
                `Username: ${username}`
            );
            
            $tool.copy(username);
            console.log(`[HSYTOKEN] 新记录: ${username}`);
        } else if (isNewUsername) {
            // 超过限额，提示用户
            $notify(
                "⚠️ HSYTOKEN限额",
                `已达最大记录数: ${maxUsernames}`,
                `当前Username: ${username}`
            );
            console.log(`[HSYTOKEN] 超过限额: ${username}`);
        } else {
            console.log(`[HSYTOKEN] 已存在: ${username}`);
        }
        
    } catch (e) {
        console.log('[HSYTOKEN Error] ' + e);
    }
    
    $done({});
})();
