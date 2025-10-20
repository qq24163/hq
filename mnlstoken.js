/*
-------------- Quantumult X 配置 --------------

[MITM]
hostname = mcs.monalisagroup.com.cn

[rewrite_local]
^https:\/\/mcs\.monalisagroup\.com\.cn\/member\/doAction url script-request-body https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/mnlstoken.js
*/
// capture-mnlstoken-simple.js - 极简版本
const url = $request.url;

if (url.includes('mcs.monalisagroup.com.cn/member/doAction') && $request.body) {
    try {
        const params = new URLSearchParams($request.body);
        const customerId = params.get('CustomerID') || params.get('customerId');
        
        if (customerId) {
            // 保存当前CustomerID
            $prefs.setValueForKey(customerId, 'mnlstoken_current');
            
            // 多账号管理
            let allIds = ($prefs.valueForKey('MNLSTOKEN') || '').split('#').filter(id => id);
            if (!allIds.includes(customerId)) {
                if (allIds.length >= 10) allIds.shift();
                allIds.push(customerId);
                $prefs.setValueForKey(allIds.join('#'), 'MNLSTOKEN');
            }
            
            // 单条通知
            $notify(
                '📱 MNLSTOKEN',
                `账号${allIds.length}个`,
                `ID: ${customerId}`
            );
            
            $tool.copy(customerId);
        }
    } catch (e) {
        console.log('[MNLSTOKEN Error] ' + e);
    }
}

$done({});
