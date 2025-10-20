/*
-------------- Quantumult X 配置 --------------

[MITM]
hostname = xcx.fenggewenhua.com

[rewrite_local]
^https:\/\/xcx\.fenggewenhua\.com\/xcx\/sczke\.php url script-request-header https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/cxktoken.js
*/
// capture-cxktoken-simple.js - 极简版本
const url = $request.url;

if (url.includes('xcx.fenggewenhua.com/xcx/sczke.php')) {
    try {
        const headers = $request.headers;
        const psession = headers['psession'];
        
        if (psession) {
            // 保存当前session
            $prefs.setValueForKey(psession, 'cxktoken_current');
            
            // 多账号管理
            let allSessions = ($prefs.valueForKey('CXKTOKEN') || '').split('#').filter(p => p);
            if (!allSessions.includes(psession)) {
                if (allSessions.length >= 10) allSessions.shift();
                allSessions.push(psession);
                $prefs.setValueForKey(allSessions.join('#'), 'CXKTOKEN');
            }
            
            // 单条通知
            $notify(
                '📱 CXKTOKEN',
                `账号${allSessions.length}个`,
                psession.substring(0, 20) + '...'
            );
            
            $tool.copy(psession);
        }
    } catch (e) {
        console.log('[CXKTOKEN Error] ' + e);
    }
}

$done({});
