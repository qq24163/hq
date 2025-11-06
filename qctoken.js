/*
-------------- Quantumult X 配置 --------------

[MITM]
hostname = tvapi.cbct.cn

[rewrite_local]
^https:\/\/tvapi\.cbct\.cn\/goods\/h5userlist url script-request-header https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/qctoken.js
*/
// capture-qctoken-uid-simple.js - 极简版本
const url = $request.url;

if (url.includes('tvapi.cbct.cn/goods/h5userlist')) {
    try {
        const headers = $request.headers;
        const uid = headers['Uid'] || headers['uid'];
        
        if (uid) {
            // 保存当前Uid
            $prefs.setValueForKey(uid, 'qctoken_current');
            
            // 多账号管理
            let allUids = ($prefs.valueForKey('QCTOKEN') || '').split('#').filter(u => u);
            if (!allUids.includes(uid)) {
                if (allUids.length >= 10) allUids.shift();
                allUids.push(uid);
                $prefs.setValueForKey(allUids.join('#'), 'QCTOKEN');
            }
            
            // 单条通知
            $notify(
                '📱 QCTOKEN',
                `账号${allUids.length}个`,
                `Uid: ${uid}`
            );
            
            $tool.copy(uid);
        }
    } catch (e) {
        console.log('[QCTOKEN Error] ' + e);
    }
}

$done({});
