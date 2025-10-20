/*
-------------- Quantumult X 配置 --------------

[MITM]
hostname = st06.sentezhenxuan.com

[rewrite_local]
^https:\/\/st06\.sentezhenxuan\.com\/api\/user url script-request-header https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/sxsgtoken.js
*/
// capture-sxsgtoken-simple.js - 极简版本
const url = $request.url;

if (url.includes('st06.sentezhenxuan.com/api/user')) {
    try {
        const headers = $request.headers;
        let auth = headers['Authori-zation'] || headers['Authorization'];
        
        if (auth) {
            // 去掉Bearer前缀
            if (auth.startsWith('Bearer ')) {
                auth = auth.substring(7);
            } else if (auth.startsWith('bearer ')) {
                auth = auth.substring(7);
            }
            
            // 保存当前token
            $prefs.setValueForKey(auth, 'sxsgtoken_current');
            
            // 多账号管理
            let allTokens = ($prefs.valueForKey('SXSGTOKEN') || '').split('#').filter(t => t);
            if (!allTokens.includes(auth)) {
                if (allTokens.length >= 10) allTokens.shift();
                allTokens.push(auth);
                $prefs.setValueForKey(allTokens.join('#'), 'SXSGTOKEN');
            }
            
            // 单条通知
            $notify(
                '📱 SXSGTOKEN',
                `账号${allTokens.length}个`,
                auth.substring(0, 20) + '...'
            );
            
            $tool.copy(auth);
        }
    } catch (e) {
        console.log('[SXSGTOKEN Error] ' + e);
    }
}

$done({});
