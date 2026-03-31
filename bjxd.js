/*
[MITM]
hostname = bm2-api.bluemembers.com.cn

[rewrite_local]
# 百家信达token捕获
^https:\/\/bm2-api\.bluemembers\.com\.cn\/v1\/app\/account\/users\/info url script-request-header https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/bjxd.js
*/
// bjxd.js - 捕获百家信达请求头中的token（增强版，支持自动更新）
(function() {
    'use strict';
    
    const STORAGE_KEY = 'bjxd';
    const TARGET_URL = 'https://bm2-api.bluemembers.com.cn/v1/app/account/users/info';
    
    // 检查是否是目标URL
    if (!$request || !$request.url.indexOf(TARGET_URL) === -1) {
        $done({});
        return;
    }
    
    try {
        // 获取请求头部
        const headers = $request.headers;
        if (!headers) {
            console.log('[BJXD] 请求头部为空');
            $done({});
            return;
        }
        
        // 获取token（注意大小写）
        let token = headers['token'] || headers['Token'] || headers['TOKEN'];
        if (!token) {
            console.log('[BJXD] 未找到token头部');
            $done({});
            return;
        }
        
        console.log(`[BJXD] 捕获到token: ${token.substring(0, 30)}...`);
        
        // 管理多账号数据
        manageBjxdData(token);
        
    } catch (error) {
        console.log(`[BJXD] 错误: ${error}`);
    }
    
    $done({});
    
    function manageBjxdData(newToken) {
        // 获取已存储的数据
        const storedData = $prefs.valueForKey(STORAGE_KEY) || '';
        let dataArray = storedData ? storedData.split('\n').filter(item => item.trim() !== '') : [];
        
        // 检查是否已存在相同的token
        let existingIndex = -1;
        
        for (let i = 0; i < dataArray.length; i++) {
            if (dataArray[i] === newToken) {
                existingIndex = i;
                console.log(`[BJXD] 找到相同的token，索引: ${i}`);
                break;
            }
        }
        
        let action = '';
        
        if (existingIndex === -1) {
            // 新的token，添加到数组末尾
            dataArray.push(newToken);
            action = '添加';
            console.log(`[BJXD] 添加新的token`);
        } else {
            // 已存在，可以选择更新或跳过
            // 这里选择跳过，避免重复
            action = '跳过';
            console.log(`[BJXD] token已存在，跳过添加`);
            $notify(
                "ℹ️ 百家信达", 
                "Token已存在", 
                `该token已在列表中\n当前账号数: ${dataArray.length}`
            );
            $done({});
            return;
        }
        
        // 保存到BoxJS，用换行符分隔
        $prefs.setValueForKey(dataArray.join('\n'), STORAGE_KEY);
        
        // 发送通知
        const title = action === '添加' ? "✅ 百家信达Token已添加" : "ℹ️ 百家信达Token已存在";
        const subtitle = `Token: ${newToken.substring(0, 20)}...`;
        const message = `当前账号数: ${dataArray.length}\n操作: ${action}`;
        
        $notify(title, subtitle, message);
        
        // 自动复制当前token到剪贴板
        if (typeof $tool !== 'undefined' && $tool.copy) {
            $tool.copy(newToken);
            console.log('[BJXD] token已复制到剪贴板');
        }
        
        console.log(`[BJXD] 保存成功，当前共 ${dataArray.length} 个账号`);
        console.log(`[BJXD] 存储格式（换行分隔）:`);
        dataArray.forEach((item, index) => {
            console.log(`  ${index + 1}. ${item.substring(0, 30)}...`);
        });
    }
})();