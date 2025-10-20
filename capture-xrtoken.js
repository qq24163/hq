/*
-------------- Quantumult X 配置 --------------

[MITM]
hostname = jiuyixiaoer.fzjingzhou.com

[rewrite_local]
^https:\/\/jiuyixiaoer\.fzjingzhou\.com\/api\/login\/getWxMiniProgramSessionKey url script-response-body https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/capture-xrtoken.js
*/
// capture-xrtoken-response-simple.js - 极简版本
const url = $request.url;

if (url.includes('jiuyixiaoer.fzjingzhou.com/api/login/getWxMiniProgramSessionKey') && $response.body) {
    try {
        const body = JSON.parse($response.body);
        let token = body.token || (body.data && body.data.token) || body.access_token || body.session_key;
        
        if (token) {
            // 保存当前token
            $prefs.setValueForKey(token, 'xrtoken_current');
            
            // 多账号管理
            let allTokens = ($prefs.valueForKey('XRTOKEN') || '').split('@').filter(t => t);
            if (!allTokens.includes(token)) {
                if (allTokens.length >= 10) allTokens.shift();
                allTokens.push(token);
                $prefs.setValueForKey(allTokens.join('@'), 'XRTOKEN');
            }
            
            // 单条通知
            $notify(
                '📱 XRTOKEN',
                `账号${allTokens.length}个`,
                token.substring(0, 20) + '...'
            );
            
            $tool.copy(token);
        }
    } catch (e) {
        console.log('[XRTOKEN Response Error] ' + e);
    }
}

$done({});
