/*
-------------- Quantumult X 配置 --------------

[MITM]
hostname = api.digital4danone.com.cn

[rewrite_local]
^https:\/\/api\.digital4danone\.com\.cn\/healthyaging\/danone\/wx\/config\/eventReport url script-request-body https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/dnys.js
*/
// capture-dnystoken-simple-new.js - 极简新格式版本
const url = $request.url;

if (url.includes('api.digital4danone.com.cn/healthyaging/danone/wx/config/eventReport') && $request.body) {
    try {
        const headers = $request.headers;
        const body = JSON.parse($request.body);
        
        const mobile = body.mobile || '';
        const openId = body.openId || '';
        const unionId = body.unionId || '';
        const token = headers['X-Access-Token'] || headers['x-access-token'] || '';
        
        if (mobile || openId || unionId || token) {
            // 构建新格式组合
            const tokenCombination = `${mobile}#${openId}#${unionId}#${token}`;
            
            // 保存当前组合
            $prefs.setValueForKey(tokenCombination, 'dnystoken_current');
            
            // 多账号管理（换行分隔）
            let allTokens = ($prefs.valueForKey('DNYSTOKEN') || '').split('\n').filter(t => t);
            if (!allTokens.includes(tokenCombination)) {
                if (allTokens.length >= 10) allTokens.shift();
                allTokens.push(tokenCombination);
                $prefs.setValueForKey(allTokens.join('\n'), 'DNYSTOKEN');
            }
            
            // 单条通知
            $notify(
                '📱 DNYSTOKEN',
                `账号${allTokens.length}个`,
                '格式: mobile#openId#unionId#token'
            );
            
            $tool.copy(tokenCombination);
        }
    } catch (e) {
        console.log('[DNYSTOKEN Error] ' + e);
    }
}

$done({});
