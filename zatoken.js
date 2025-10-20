/*
-------------- Quantumult X 配置 --------------

[MITM]
hostname = ihealth.zhongan.com

[rewrite_local]
^https:\/\/ihealth\.zhongan\.com\/api\/lemon\/v1\/common\/activity\/homePage url script-request-header https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/zatoken.js
*/
// capture-zatoken-simple.js - 极简版本
const url = $request.url;

if (url.includes('ihealth.zhongan.com/api/lemon/v1/common/activity/homePage')) {
    try {
        const headers = $request.headers;
        let token = headers['Access-Token'] || headers['access-token'];
        
        if (token) {
            // 清理Token格式
            if (token.startsWith('Bearer ')) {
                token = token.substring(7);
            }
            
            // 保存当前token
            $prefs.setValueForKey(token, 'zatoken_current');
            
            // 多账号管理
            let allTokens = ($prefs.valueForKey('ZATOKEN') || '').split('#').filter(t => t);
            if (!allTokens.includes(token)) {
                if (allTokens.length >= 10) allTokens.shift();
                allTokens.push(token);
                $prefs.setValueForKey(allTokens.join('#'), 'ZATOKEN');
            }
            
            // 单条通知
            $notify(
                '📱 ZATOKEN',
                `账号${allTokens.length}个`,
                token.substring(0, 20) + '...'
            );
            
            $tool.copy(token);
        }
    } catch (e) {
        console.log('[ZATOKEN Error] ' + e);
    }
}

$done({});
