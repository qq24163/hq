/*
-------------- Quantumult X 配置 --------------

[MITM]
hostname = crm.nestlechinese.com

[rewrite_local]
^https:\/\/crm\.nestlechinese\.com\/openapi\/activityservice\/api\/membermenu\/getlist url script-request-header https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/qctoken.js
*/
// capture-qctoken-simple.js - 极简版本
const url = $request.url;

if (url.includes('crm.nestlechinese.com/openapi/activityservice/api/membermenu/getlist')) {
    try {
        const headers = $request.headers;
        let auth = headers['Authorization'];
        
        if (auth) {
            // 去掉Bearer前缀
            if (auth.startsWith('Bearer ')) {
                auth = auth.substring(7);
            } else if (auth.startsWith('bearer ')) {
                auth = auth.substring(7);
            }
            
            // 保存当前token
            $prefs.setValueForKey(auth, 'qctoken_current');
            
            // 多账号管理
            let allTokens = ($prefs.valueForKey('QCTOKEN') || '').split('&').filter(t => t);
            if (!allTokens.includes(auth)) {
                if (allTokens.length >= 10) allTokens.shift();
                allTokens.push(auth);
                $prefs.setValueForKey(allTokens.join('&'), 'QCTOKEN');
            }
            
            // 单条通知
            $notify(
                '📱 QCTOKEN',
                `账号${allTokens.length}个`,
                auth.substring(0, 20) + '...'
            );
            
            $tool.copy(auth);
        }
    } catch (e) {
        console.log('[QCTOKEN Error] ' + e);
    }
}

$done({});
