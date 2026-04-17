/*
[MITM]
hostname = dt.yuanhukj.com

[rewrite_local]
# 林泽园用户信息捕获
^https:\/\/dt\.yuanhukj\.com\/api\/mobile\/account\/user\/overview_my\?.* url script-response-body https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/lzy.js
*/
// lzy.js - 清理重复版（先去重再保存）
(function() {
    'use strict';
    
    const STORAGE_KEY = 'lzy';
    const TARGET_URL = 'https://dt.yuanhukj.com/api/mobile/account/user/overview_my';
    
    if (!$request || !$request.url.indexOf(TARGET_URL) === -1) {
        $done({});
        return;
    }
    
    try {
        const headers = $request.headers;
        if (!headers) {
            $done({});
            return;
        }
        
        let authorization = headers['Authorization'] || headers['authorization'];
        if (!authorization) {
            $done({});
            return;
        }
        
        let cleanAuth = authorization;
        if (authorization.startsWith('Bearer ') || authorization.startsWith('bearer ')) {
            cleanAuth = authorization.substring(7);
        }
        
        let appSign = headers['app-sign'] || headers['App-Sign'] || headers['app_sign'] || headers['App_Sign'] || '';
        
        const responseBody = $response.body;
        if (!responseBody) {
            $done({});
            return;
        }
        
        let jsonData;
        try {
            jsonData = JSON.parse(responseBody);
        } catch (e) {
            $done({});
            return;
        }
        
        if (jsonData.code !== 0) {
            if (jsonData.code === 30) {
                $done({});
                return;
            }
        }
        
        const userId = jsonData.data?.user_id;
        if (!userId) {
            $done({});
            return;
        }
        
        const newData = `${userId}#${cleanAuth}#${appSign}`;
        
        // 获取存储的数据
        const storedData = $prefs.valueForKey(STORAGE_KEY) || '';
        let dataArray = storedData ? storedData.split('\n').filter(item => item.trim() !== '') : [];
        
        // 使用Map来去重，以user_id为key
        const dataMap = new Map();
        
        // 先把现有数据放入Map（以user_id为key，保留最新的）
        for (const item of dataArray) {
            const parts = item.split('#');
            if (parts.length >= 1) {
                const existingUserId = parts[0];
                // 只保留第一个遇到的（后面会用新数据覆盖）
                if (!dataMap.has(existingUserId)) {
                    dataMap.set(existingUserId, item);
                }
            }
        }
        
        // 用新数据覆盖或添加
        dataMap.set(userId, newData);
        
        // 转换回数组
        const newArray = Array.from(dataMap.values());
        
        // 保存
        $prefs.setValueForKey(newArray.join('\n'), STORAGE_KEY);
        
        const isUpdate = dataArray.some(item => item.split('#')[0] === userId);
        const title = isUpdate ? "🔄 林泽园数据已更新" : "✅ 林泽园账号已添加";
        $notify(title, `user_id: ${userId}`, `当前账号数: ${newArray.length}`);
        
        if (typeof $tool !== 'undefined' && $tool.copy) {
            $tool.copy(newData);
        }
        
    } catch (error) {
        console.log(`[LZY] 错误: ${error}`);
    }
    
    $done({})；
})();