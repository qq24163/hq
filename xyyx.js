/*
[MITM]
hostname = gzpengru.weimbo.com

[rewrite_local]
# 心悦优享3rdSession捕获
^https:\/\/gzpengru\.weimbo\.com\/api\/index\.php\?ackey=GZYTAPPLET url script-request-header https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/xyyx.js
*/
// xyyx.js - 捕获心悦优享请求头中的3rdSession
(function() {
    'use strict';
    
    const STORAGE_KEY = 'xyyx';
    const TARGET_URL = 'https://gzpengru.weimbo.com/api/index.php?ackey=GZYTAPPLET';
    
    // 检查是否是目标URL
    if (!$request || !$request.url.indexOf(TARGET_URL) === -1) {
        $done({});
        return;
    }
    
    try {
        // 获取请求头部
        const headers = $request.headers;
        if (!headers) {
            console.log('[XYYX] 请求头部为空');
            $done({});
            return;
        }
        
        // 获取3rdSession（注意大小写）
        let session3rd = headers['3rdSession'] || headers['3rdsession'] || headers['3rd-session'];
        if (!session3rd) {
            console.log('[XYYX] 未找到3rdSession头部');
            $done({});
            return;
        }
        
        console.log(`[XYYX] 捕获到3rdSession: ${session3rd.substring(0, 30)}...`);
        
        // 管理多账号数据
        manageXyyxData(session3rd);
        
    } catch (error) {
        console.log(`[XYYX] 错误: ${error}`);
    }
    
    $done({});
    
    function manageXyyxData(newSession) {
        // 获取已存储的数据
        let storedData = $prefs.valueForKey(STORAGE_KEY) || '';
        let dataArray = storedData ? storedData.split('\n').filter(item => item.trim() !== '') : [];
        
        // 检查是否已存在相同的3rdSession
        let existingIndex = -1;
        
        for (let i = 0; i < dataArray.length; i++) {
            if (dataArray[i] === newSession) {
                existingIndex = i;
                console.log(`[XYYX] 找到相同的3rdSession，索引: ${i}`);
                break;
            }
        }
        
        if (existingIndex === -1) {
            // 新的3rdSession，添加到数组末尾
            dataArray.push(newSession);
            console.log(`[XYYX] 添加新的3rdSession`);
        } else {
            // 已存在，不重复添加
            console.log(`[XYYX] 3rdSession已存在，跳过添加`);
            $notify("ℹ️ 心悦优享", "Session已存在", "该3rdSession已在列表中");
            $done({});
            return;
        }
        
        // 保存到BoxJS，用换行符分隔
        $prefs.setValueForKey(dataArray.join('\n'), STORAGE_KEY);
        
        // 发送通知
        const title = "✅ 心悦优享Session已添加";
        const subtitle = `Session: ${newSession.substring(0, 20)}...`;
        const message = `当前账号数: ${dataArray.length}`;
        
        $notify(title, subtitle, message);
        
        // 自动复制当前3rdSession到剪贴板
        if (typeof $tool !== 'undefined' && $tool.copy) {
            $tool.copy(newSession);
            console.log('[XYYX] 3rdSession已复制到剪贴板');
        }
        
        console.log(`[XYYX] 保存成功，当前共 ${dataArray.length} 个账号`);
        console.log(`[XYYX] 存储格式（换行分隔）:`);
        dataArray.forEach((item, index) => {
            console.log(`  ${index + 1}. ${item}`);
        });
    }
})();