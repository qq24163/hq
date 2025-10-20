/*
-------------- Quantumult X 配置 --------------

[MITM]
hostname = mmapgwh.map.qq.com

[rewrite_local]
^https:\/\/mmapgwh\.map\.qq\.com\/tp_proxy\/user_management\/order\/list url script-request-header https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/bddttoken.js
*/
// capture-bddttoken-simple.js - 极简版本
const url = $request.url;

if (url.includes('mmapgwh.map.qq.com/tp_proxy/user_management/order/list')) {
    try {
        const headers = $request.headers;
        const tmapOpenid = headers['tmap-openid'];
        
        if (tmapOpenid) {
            // 保存当前openid
            $prefs.setValueForKey(tmapOpenid, 'bddttoken_current');
            
            // 多账号管理
            let allOpenids = ($prefs.valueForKey('BDDTTOKEN') || '').split('#').filter(o => o);
            if (!allOpenids.includes(tmapOpenid)) {
                if (allOpenids.length >= 10) allOpenids.shift();
                allOpenids.push(tmapOpenid);
                $prefs.setValueForKey(allOpenids.join('#'), 'BDDTTOKEN');
            }
            
            // 单条通知
            $notify(
                '📱 BDDTTOKEN',
                `账号${allOpenids.length}个`,
                `OpenID: ${tmapOpenid.substring(0, 10)}...`
            );
            
            $tool.copy(tmapOpenid);
        }
    } catch (e) {
        console.log('[BDDTTOKEN Error] ' + e);
    }
}

$done({});
