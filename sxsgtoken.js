/*
-------------- Quantumult X 配置 --------------

[MITM]
hostname = n05.sentezhenxuan.com

[rewrite_local]
^https:\/\/n05\.sentezhenxuan\.com\/api\/user url script-request-header https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/sxsgtoken.js
*/

// capture-sxsgtoken-simple.js - 保留Bearer前缀版本
const url = $request.url;

if (url.includes('n05.sentezhenxuan.com/api/user')) {
    try {
        const headers = $request.headers;
        let auth = headers['Authori-zation'] || headers['Authorization'];
        
        if (auth) {
            // 直接保存完整的Authorization头（包含Bearer前缀）
            $prefs.setValueForKey(auth, 'sxsgtoken_current');
            
            // 多账号管理
            let allTokens = ($prefs.valueForKey('SXSGTOKEN') || '').split('&').filter(t => t);
            if (!allTokens.includes(auth)) {
                if (allTokens.length >= 10) allTokens.shift();
                allTokens.push(auth);
                $prefs.setValueForKey(allTokens.join('&'), 'SXSGTOKEN');
            }
            
            // 单条通知
            $notify(
                '📱 SXSGTOKEN',
                `账号${allTokens.length}个`,
                auth.substring(0, 25) + '...'
            );
            
            $tool.copy(auth);
        }
    } catch (e) {
        console.log('[SXSGTOKEN Error] ' + e);
    }
}

$done({});
