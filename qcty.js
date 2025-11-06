/*
-------------- Quantumult X 配置 --------------

[MITM]
hostname = tvapi.cbct.cn

[rewrite_local]
^https:\/\/tvapi\.cbct\.cn\/goods\/h5userlist url script-request-header https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/qcty.js
*/
(function() {
    'use strict';
    
    const url = $request.url;
    
    // 检查是否是目标URL
    if (!url.includes('tvapi.cbct.cn/goods/h5userlist')) {
        $done({});
        return;
    }
    
    try {
        const headers = $request.headers;
        const uid = headers['Uid'] || headers['uid'] || headers['UID'];
        
        if (!uid) {
            console.log('[QCTYTOKEN] 未找到Uid头部');
            $done({});
            return;
        }
        
        console.log(`[QCTYTOKEN] 捕获到Uid: ${uid}`);
        
        // 保存到BoxJS
        $prefs.setValueForKey(uid, 'qctytoken_current');
        
        // 多账号管理（#分隔）
        const storedUids = $prefs.valueForKey('QCTYTOKEN') || '';
        let uidsArray = storedUids ? storedUids.split('#').filter(u => u.trim() !== '') : [];
        
        const isNewUid = !uidsArray.includes(uid);
        
        if (isNewUid) {
            // 新Uid，添加到数组
            if (uidsArray.length >= 10) {
                uidsArray.shift(); // 移除最早的账号
            }
            uidsArray.push(uid);
            
            // 保存用#分隔的字符串
            const newUidsString = uidsArray.join('#');
            $prefs.setValueForKey(newUidsString, 'QCTYTOKEN');
        }
        
        // 单条精简通知
        $notify(
            isNewUid ? "✅ 新QCTYTOKEN" : "🔄 QCTYTOKEN",
            `账号数: ${uidsArray.length}`,
            `Uid: ${uid}`
        );
        
        // 自动复制当前Uid
        if (typeof $tool !== 'undefined' && $tool.copy) {
            $tool.copy(uid);
        }
        
    } catch (error) {
        console.log(`[QCTYTOKEN] 错误: ${error}`);
    }
    
    $done({});
})();
