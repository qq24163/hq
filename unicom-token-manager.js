/*
-------------- Quantumult X 配置 --------------

[MITM]
hostname = m.client.10010.com

[rewrite_local]
^https:\/\/m\.client\.10010\.com\/mobileService\/onLine\.htm url script-request-body https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/unicom-token-manager.js
*/
// unicom-token-minimal.js - 极简版本
if ($request.method === 'POST' && $request.body) {
    try {
        const params = new URLSearchParams($request.body);
        const tokenOnline = params.get('token_online');
        
        if (tokenOnline) {
            // 保存到BoxJS
            $prefs.setValueForKey(tokenOnline, 'token_online_current');
            
            // 更新数组
            let allTokens = [];
            try {
                const stored = $prefs.valueForKey('token_online_array');
                if (stored) allTokens = JSON.parse(stored);
                if (!Array.isArray(allTokens)) allTokens = [];
            } catch (e) {
                allTokens = [];
            }
            
            // 检查是否新token
            const isNew = !allTokens.includes(tokenOnline);
            if (isNew) {
                if (allTokens.length >= 10) allTokens.shift();
                allTokens.push(tokenOnline);
            }
            
            $prefs.setValueForKey(JSON.stringify(allTokens), 'token_online_array');
            
            // 单条精简通知
            const action = isNew ? "✅ 新增" : "🔄 刷新";
            $notify(
                `${action} 联通Token`,
                `账号${allTokens.length}个`,
                `Token: ${tokenOnline.substring(0, 15)}...`
            );
            
            $tool.copy(tokenOnline);
        }
    } catch (e) {
        console.log(`[ERROR] ${e}`);
    }
}

$done({});
