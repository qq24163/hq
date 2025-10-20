/*
-------------- Quantumult X 配置 --------------

[MITM]
hostname = www.52bjy.com

[rewrite_local]
^https:\/\/www\.52bjy\.com\/api\/avatar\/show\.php.*username= url script-request-header https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/capture-hsytoken-simple.js
*/
// capture-hsytoken-account-simple.js - 极简账号窗口版本
const url = $request.url;

if (url.includes('www.52bjy.com/api/avatar/show.php')) {
    try {
        const username = new URL(url).searchParams.get('username');
        
        if (username) {
            const now = Date.now();
            const windowTime = 10000; // 5秒
            
            // 获取账号最后保存时间
            const lastSavesStr = $prefs.valueForKey('hsytoken_last_saves') || '{}';
            const lastSaves = JSON.parse(lastSavesStr);
            
            // 检查该账号是否在5秒内保存过
            if (!lastSaves[username] || now - lastSaves[username] > windowTime) {
                // 不在5秒内，立即保存
                saveAccount(username);
                
                // 更新该账号的最后保存时间
                lastSaves[username] = now;
                $prefs.setValueForKey(JSON.stringify(lastSaves), 'hsytoken_last_saves');
            } else {
                // 在5秒内，跳过保存
                const remaining = windowTime - (now - lastSaves[username]);
                console.log(`[HSYTOKEN] 账号 ${username} 在5秒窗口内，${Math.ceil(remaining/1000)}秒后可保存`);
            }
        }
    } catch (e) {
        console.log('[HSYTOKEN Error] ' + e);
    }
}

function saveAccount(username) {
    // 保存当前
    $prefs.setValueForKey(username, 'hsytoken_current');
    
    // 多账号管理
    let allUsernames = ($prefs.valueForKey('HSYTOKEN') || '').split('#').filter(u => u);
    const isNew = !allUsernames.includes(username);
    
    if (isNew) {
        if (allUsernames.length >= 20) allUsernames.shift();
        allUsernames.push(username);
        $prefs.setValueForKey(allUsernames.join('#'), 'HSYTOKEN');
    }
    
    $notify(
        '📱 HSYTOKEN',
        `${isNew ? '新增' : '更新'} 账号${allUsernames.length}个`,
        `Username: ${username}`
    );
    
    $tool.copy(username);
}

$done({});
