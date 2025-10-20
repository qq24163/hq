/*
-------------- Quantumult X 配置 --------------

[MITM]
hostname = cloudprint.chongci.shop

[rewrite_local]
^https:\/\/cloudprint\.chongci\.shop\/app\/index\.php.*openid= url script-request-header https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/ccytoken.js
*/
// capture-ccytoken-simple.js - 极简版本
const url = $request.url;

if (url.includes('cloudprint.chongci.shop/app/index.php') && url.includes('openid=')) {
    try {
        const openid = new URL(url).searchParams.get('openid');
        
        if (openid) {
            // 保存当前openid
            $prefs.setValueForKey(openid, 'ccytoken_current');
            
            // 多账号管理
            let allOpenids = ($prefs.valueForKey('CCYTOKEN') || '').split('&').filter(o => o);
            if (!allOpenids.includes(openid)) {
                if (allOpenids.length >= 10) allOpenids.shift();
                allOpenids.push(openid);
                $prefs.setValueForKey(allOpenids.join('&'), 'CCYTOKEN');
            }
            
            // 单条通知
            $notify(
                '📱 CCYTOKEN',
                `账号${allOpenids.length}个`,
                `OpenID: ${openid.substring(0, 10)}...`
            );
            
            $tool.copy(openid);
        }
    } catch (e) {
        console.log('[CCYTOKEN Error] ' + e);
    }
}

$done({});
