/*
-------------- Quantumult X 配置 --------------

[MITM]
hostname = www.52bjy.com

[rewrite_local]
^https:\/\/www\.52bjy\.com\/api\/app\/internalmessage\.php.*username= url script-request-header https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/capture-hsytoken-simple.js
*/
// capture-hsytoken-new-simple.js - 极简版本
const url = $request.url;

if (url.includes('www.52bjy.com/api/app/internalmessage.php') && url.includes('username=')) {
    try {
        const username = new URL(url).searchParams.get('username');
        
        if (username) {
            // 保存当前username
            $prefs.setValueForKey(username, 'hsytoken_current');
            
            // 多账号管理
            let allUsernames = ($prefs.valueForKey('HSYTOKEN') || '').split('#').filter(u => u);
            if (!allUsernames.includes(username)) {
                if (allUsernames.length >= 10) allUsernames.shift();
                allUsernames.push(username);
                $prefs.setValueForKey(allUsernames.join('#'), 'HSYTOKEN');
            }
            
            // 单条通知
            $notify(
                '📱 HSYTOKEN',
                `账号${allUsernames.length}个`,
                `Username: ${username}`
            );
            
            $tool.copy(username);
        }
    } catch (e) {
        console.log('[HSYTOKEN Error] ' + e);
    }
}

$done({});
