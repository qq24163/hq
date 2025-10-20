/*
-------------- Quantumult X 配置 --------------

[MITM]
hostname = www.52bjy.com

[rewrite_local]
^https:\/\/www\.52bjy\.com\/api\/avatar\/show\.php.*username= url script-request-header https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/capture-hsytoken-simple.js
*/
// capture-hsytoken-group-minimal.js - 极简分组5秒限制
const url = $request.url;

if (url.includes('www.52bjy.com/api/avatar/show.php')) {
    try {
        const username = new URL(url).searchParams.get('username');
        
        if (username) {
            const now = Date.now();
            
            // 获取该账号的上次请求时间
            const timersStr = $prefs.valueForKey('hsy_group_timers') || '{}';
            const timers = JSON.parse(timersStr);
            
            // 5秒时间窗口检查
            if (timers[username] && (now - timers[username] < 30000)) {
                console.log(`[HSYTOKEN] ${username} 5秒限制，跳过`);
                $done({});
                return;
            }
            
            // 更新该账号的请求时间
            timers[username] = now;
            $prefs.setValueForKey(JSON.stringify(timers), 'hsy_group_timers');
            
            // 保存数据
            $prefs.setValueForKey(username, 'hsytoken_current');
            
            let allUsernames = ($prefs.valueForKey('HSYTOKEN') || '').split('#').filter(u => u);
            if (!allUsernames.includes(username)) {
                if (allUsernames.length >= 10) allUsernames.shift();
                allUsernames.push(username);
                $prefs.setValueForKey(allUsernames.join('#'), 'HSYTOKEN');
            }
            
            $notify('📱 HSYTOKEN', `账号${allUsernames.length}个`, username);
            $tool.copy(username);
        }
    } catch (e) {
        console.log('[HSYTOKEN Error] ' + e);
    }
}

$done({});
