/*
-------------- Quantumult X 配置 --------------

[MITM]
hostname = www.52bjy.com

[rewrite_local]
^https:\/\/www\.52bjy\.com\/api\/avatar\/show\.php.*username= url script-request-header https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/capture-hsytoken-simple.js
*/
// capture-hsytoken-window-simple.js - 极简时间窗口版本
const url = $request.url;

if (url.includes('www.52bjy.com/api/avatar/show.php')) {
    try {
        const username = new URL(url).searchParams.get('username');
        
        if (username) {
            const now = Date.now();
            
            // 总是更新临时缓存为最新的username
            $prefs.setValueForKey(username, 'hsytoken_temp_username');
            $prefs.setValueForKey(now.toString(), 'hsytoken_temp_time');
            
            console.log(`[HSYTOKEN] 缓存更新: ${username}`);
            
            // 检查是否需要启动新计时器
            const lastSaveStr = $prefs.valueForKey('hsytoken_last_save') || '0';
            const lastSave = parseInt(lastSaveStr);
            
            if (now - lastSave >= 2000) {
                // 设置10秒后保存
                $prefs.setValueForKey(now.toString(), 'hsytoken_last_save');
                
                setTimeout(() => {
                    try {
                        const finalUsername = $prefs.valueForKey('hsytoken_temp_username');
                        const finalTimeStr = $prefs.valueForKey('hsytoken_temp_time') || '0';
                        const finalTime = parseInt(finalTimeStr);
                        
                        if (finalUsername && now - finalTime < 4000) { // 15秒容错
                            // 保存到正式存储
                            $prefs.setValueForKey(finalUsername, 'hsytoken_current');
                            
                            // 多账号管理
                            let allUsernames = ($prefs.valueForKey('HSYTOKEN') || '').split('#').filter(u => u);
                            const isNew = !allUsernames.includes(finalUsername);
                            
                            if (isNew) {
                                if (allUsernames.length >= 10) allUsernames.shift();
                                allUsernames.push(finalUsername);
                                $prefs.setValueForKey(allUsernames.join('#'), 'HSYTOKEN');
                            }
                            
                            // 单条通知
                            $notify(
                                '📱 HSYTOKEN',
                                `账号${allUsernames.length}个`,
                                `Username: ${finalUsername}`
                            );
                            
                            $tool.copy(finalUsername);
                            
                            console.log(`[HSYTOKEN] 时间窗口保存: ${finalUsername}`);
                        }
                    } catch (e) {
                        console.log('[HSYTOKEN Timer Error] ' + e);
                    }
                }, 10000);
            }
        }
    } catch (e) {
        console.log('[HSYTOKEN Error] ' + e);
    }
}

$done({});
