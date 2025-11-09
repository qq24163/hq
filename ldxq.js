/*
-------------- Quantumult X 配置 --------------

[MITM]
hostname = lvdong.fzjingzhou.com

[rewrite_local]
^https:\/\/lvdong\.fzjingzhou\.com\/api\/login\/getWxMiniProgramSessionKey url script-request-body https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/ldxq.js
*/
// capture-ldxqtoken-session.js - 捕获getWxMiniProgramSessionKey接口的token
const url = $request.url;

if (url.includes('lvdong.fzjingzhou.com/api/login/getWxMiniProgramSessionKey') && $request.body) {
    try {
        const params = new URLSearchParams($request.body);
        const token = params.get('token');
        
        if (token) {
            // 保存当前token
            $prefs.setValueForKey(token, 'ldxqtoken_current');
            
            // 多账号管理
            let allTokens = ($prefs.valueForKey('LDXQTOKEN') || '').split('&').filter(t => t);
            if (!allTokens.includes(token)) {
                if (allTokens.length >= 10) allTokens.shift();
                allTokens.push(token);
                $prefs.setValueForKey(allTokens.join('&'), 'LDXQTOKEN');
            }
            
            // 单条通知
            $notify(
                '📱 LDXQTOKEN',
                `账号${allTokens.length}个`,
                token.substring(0, 15) + '...'
            );
            
            $tool.copy(token);
        }
    } catch (e) {
        console.log('[LDXQTOKEN Error] ' + e);
    }
}

$done({});
