/*
-------------- Quantumult X 配置 --------------

[MITM]
hostname = jjw.jingjiu.com

[rewrite_local]
^https:\/\/jjw\.jingjiu\.com\/app-jingyoujia\/app\/jingyoujia\/customer\/queryIntegralLogV2 url script-request-header https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/jjtoken.js
*/
// capture-jjtoken-simple.js - 极简版本
const url = $request.url;

if (url.includes('jjw.jingjiu.com/app-jingyoujia/app/jingyoujia/customer/queryIntegralLogV2')) {
    try {
        const headers = $request.headers;
        let auth = headers['Authorization'];
        
        if (auth) {
            // 去掉JYJwx前缀
            if (auth.startsWith('JYJwx')) {
                auth = auth.substring(5);
            }
            
            // 保存当前token
            $prefs.setValueForKey(auth, 'jjtoken_current');
            
            // 多账号管理
            let allTokens = ($prefs.valueForKey('JJTOKEN') || '').split('#').filter(t => t);
            if (!allTokens.includes(auth)) {
                if (allTokens.length >= 10) allTokens.shift();
                allTokens.push(auth);
                $prefs.setValueForKey(allTokens.join('#'), 'JJTOKEN');
            }
            
            // 单条通知
            $notify(
                '📱 JJTOKEN',
                `账号${allTokens.length}个`,
                auth.substring(0, 20) + '...'
            );
            
            $tool.copy(auth);
        }
    } catch (e) {
        console.log('[JJTOKEN Error] ' + e);
    }
}

$done({});
