/*
-------------- Quantumult X 配置 --------------

[MITM]
hostname = www.52bjy.com

[rewrite_local]
^https:\/\/www\.52bjy\.com\/api\/avatar\/show\.php.*username= url script-request-header https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/capture-hsytoken-simple.js
*/
// capture-hsytoken-simple-global.js - 极简全局30秒限制
const url = $request.url;

if (url.includes('www.52bjy.com/api/avatar/show.php')) {
    try {
        const username = new URL(url).searchParams.get('username');
        
        if (username) {
            const now = Date.now();
            const lastTime = $prefs.valueForKey('hsy_last_time');
            
            // 30秒时间窗口检查
            if (lastTime && (now - parseInt(lastTime) < 15000)) {
                console.log('[HSYTOKEN] 30秒内跳过');
                $done({});
                return;
            }
            
            // 更新最后请求时间
            $prefs.setValueForKey(now.toString(), 'hsy_last_time');
            
            // 保存数据
            $prefs.setValueForKey(username, 'hsytoken_current');
            
            let allUsernames = ($prefs.valueForKey('HSYTOKEN') || '').split('#').filter(u => u);
            if (!allUsernames.includes(username)) {
                if (allUsernames.length >= 10) allUsernames.shift();
                allUsernames.push(username);
                $prefs.setValueForKey(allUsernames.join('#'), 'HSYTOKEN');
            }
            
            $notify(
                '📱 HSYTOKEN',
                `账号${allUsernames.length}个`,
                username
            );
            
            $tool.copy(username);
        }
    } catch (e) {
        console.log('[HSYTOKEN Error] ' + e);
    }
}

$done({});
