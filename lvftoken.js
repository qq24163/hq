/*
-------------- Quantumult X 配置 --------------

[MITM]
hostname = lmf.lvmifo.com

[rewrite_local]
^https:\/\/lmf\.lvmifo\.com\/api\/5dca57afa379e.*m=getIntegralLog url script-request-header https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/lvftoken.js
*/
// capture-lmftoken-new-simple.js - 极简版本
const url = $request.url;

if (url.includes('lmf.lvmifo.com/api/5dca57afa379e') && url.includes('m=getIntegralLog')) {
    try {
        const headers = $request.headers;
        const accessToken = headers['access-token'];
        const userToken = headers['user-token'];
        
        if (accessToken || userToken) {
            const tokenCombination = `${accessToken || ''}&${userToken || ''}`;
            
            // 保存当前token组合
            $prefs.setValueForKey(tokenCombination, 'lmftoken_current');
            
            // 多账号管理
            let allTokens = ($prefs.valueForKey('LMFTOKEN') || '').split('#').filter(t => t);
            if (!allTokens.includes(tokenCombination)) {
                if (allTokens.length >= 10) allTokens.shift();
                allTokens.push(tokenCombination);
                $prefs.setValueForKey(allTokens.join('#'), 'LMFTOKEN');
            }
            
            // 单条通知
            $notify(
                '📱 LMFTOKEN',
                `账号${allTokens.length}个`,
                tokenCombination.substring(0, 25) + '...'
            );
            
            $tool.copy(tokenCombination);
        }
    } catch (e) {
        console.log('[LMFTOKEN Error] ' + e);
    }
}

$done({});
