/*
-------------- Quantumult X 配置 --------------

[MITM]
hostname = api.digital4danone.com.cn

[rewrite_local]
^https:\/\/api\.digital4danone\.com\.cn\/healthyaging\/danone\/wx\/config\/eventReport url script-request-body https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/dnystoken.js
*/
// capture-dnystoken-simple.js - 极简版本
const url = $request.url;

if (url.includes('api.digital4danone.com.cn/healthyaging/danone/wx/config/eventReport')) {
    try {
        const headers = $request.headers;
        const body = $request.body;
        
        // 获取头部token
        const xToken = headers['X-Access-Token'] || headers['x-access-token'];
        
        let openId = '';
        let unionId = '';
        
        // 获取请求体参数
        if (body) {
            const params = new URLSearchParams(body);
            openId = params.get('openId') || params.get('openid') || '';
            unionId = params.get('unionId') || params.get('unionid') || '';
        }
        
        // 构建组合
        const tokenCombination = `${xToken || ''}#${openId}#${unionId}`;
        
        // 检查是否有有效数据
        if (xToken || openId || unionId) {
            // 保存当前组合
            $prefs.setValueForKey(tokenCombination, 'dnystoken_current');
            
            // 多账号管理
            let allTokens = ($prefs.valueForKey('DNYSTOKEN') || '').split('&').filter(t => t);
            if (!allTokens.includes(tokenCombination)) {
                if (allTokens.length >= 10) allTokens.shift();
                allTokens.push(tokenCombination);
                $prefs.setValueForKey(allTokens.join('&'), 'DNYSTOKEN');
            }
            
            // 单条通知
            $notify(
                '📱 DNYSTOKEN',
                `账号${allTokens.length}个`,
                tokenCombination.substring(0, 30) + '...'
            );
            
            $tool.copy(tokenCombination);
        }
    } catch (e) {
        console.log('[DNYSTOKEN Error] ' + e);
    }
}

$done({});
