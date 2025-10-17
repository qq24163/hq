/*
-------------- Quantumult X 配置 --------------

[MITM]
hostname = jiema.fzjingzhou.com

[rewrite_local]
^https:\/\/jiema\.fzjingzhou\.com\/api\/Person\/sign url script-request-body  https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/capture-jmtoken-simple.js
*/
// capture-jmtoken-simple.js - 极简版本
if ($request.method === 'POST' && $request.body) {
    try {
        const params = new URLSearchParams($request.body);
        const token = params.get('token');
        
        if (token) {
            // 保存当前token
            $prefs.setValueForKey(token, 'jmtoken_current');
            
            // 多账号管理
            let allTokens = ($prefs.valueForKey('JMTOKEN') || '').split('@').filter(t => t);
            if (!allTokens.includes(token)) {
                if (allTokens.length >= 10) allTokens.shift();
                allTokens.push(token);
                $prefs.setValueForKey(allTokens.join('@'), 'JMTOKEN');
            }
            
            // 单条通知
            $notify(
                '📱 JMTOKEN',
                `账号${allTokens.length}个`,
                token.substring(0, 20) + '...'
            );
            
            $tool.copy(token);
        }
    } catch (e) {
        console.log('[JMTOKEN Error] ' + e);
    }
}

$done({});
