/*
[MITM]
hostname = xzw.api.xingzhits.cn

[rewrite_local]
# 星之网请求头捕获
^https:\/\/xzw\.api\.xingzhits\.cn\/app\/live\/operate\/tencent\/user\/sig url script-request-header https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/xzw.js
*/
// xzw.js - 捕获星之网请求头中的Authorization和deviceId
(function() {
    'use strict';
    
    const STORAGE_KEY = 'xzw';
    const TARGET_URL = 'https://xzw.api.xingzhits.cn/app/live/operate/tencent/user/sig';
    
    // 检查是否是目标URL
    if (!$request || !$request.url.includes(TARGET_URL)) {
        $done({});
        return;
    }
    
    try {
        // 获取请求头部
        const headers = $request.headers;
        if (!headers) {
            console.log('[XZW] 请求头部为空');
            $done({});
            return;
        }
        
        // 获取Authorization
        let authorization = headers['Authorization'] || headers['authorization'];
        if (!authorization) {
            console.log('[XZW] 未找到Authorization头部');
            $done({});
            return;
        }
        
        // 获取deviceId
        let deviceId = headers['Deviceid'] || headers['deviceid'] || headers['DeviceId'] || headers['deviceId'];
        if (!deviceId) {
            console.log('[XZW] 未找到deviceId头部');
            $done({});
            return;
        }
        
        console.log(`[XZW] 捕获到数据 - Authorization: ${authorization.substring(0, 30)}..., deviceId: ${deviceId}`);
        
        // 管理多账号数据
        manageXzwData(authorization, deviceId);
        
    } catch (error) {
        console.log(`[XZW] 错误: ${error}`);
    }
    
    $done({});
    
    function manageXzwData(authorization, deviceId) {
        // 获取已存储的数据
        const storedData = $prefs.valueForKey(STORAGE_KEY) || '';
        let dataArray = storedData ? storedData.split('&').filter(item => item.trim() !== '') : [];
        
        // 检查是否已存在相同的deviceId
        let existingIndex = -1;
        
        for (let i = 0; i < dataArray.length; i++) {
            // 从存储的数据中提取deviceId进行比较
            const parts = dataArray[i].split('#');
            if (parts.length >= 3) {
                const storedDeviceId = parts[2];
                if (storedDeviceId === deviceId) {
                    existingIndex = i;
                    console.log(`[XZW] 找到相同deviceId的旧数据，索引: ${i}`);
                    break;
                }
            }
        }
        
        // 生成昵称（格式：用户1、用户2等）
        let nickname;
        if (existingIndex === -1) {
            // 新设备，根据当前账号数量生成昵称
            const userCount = dataArray.length + 1;
            nickname = `用户${userCount}`;
        } else {
            // 已存在设备，保留原昵称
            const parts = dataArray[existingIndex].split('#');
            nickname = parts[0];
        }
        
        // 格式化数据：昵称#Authorization#deviceId
        const newData = `${nickname}#${authorization}#${deviceId}`;
        
        if (existingIndex === -1) {
            // 新设备，添加到数组末尾
            dataArray.push(newData);
            console.log(`[XZW] 添加新账号，昵称: ${nickname}, deviceId: ${deviceId}`);
        } else {
            // 已存在设备，更新Authorization
            dataArray[existingIndex] = newData;
            console.log(`[XZW] 更新已有账号的Authorization，昵称: ${nickname}, deviceId: ${deviceId}`);
        }
        
        // 保存到BoxJS，用&分隔
        $prefs.setValueForKey(dataArray.join('&'), STORAGE_KEY);
        
        // 发送通知
        const title = existingIndex === -1 ? "✅ 星之网账号已添加" : "🔄 星之网Token已更新";
        const subtitle = `${nickname} | deviceId: ${deviceId.substring(0, 15)}...`;
        const message = `当前账号数: ${dataArray.length}`;
        
        $notify(title, subtitle, message);
        
        // 自动复制当前Authorization到剪贴板
        if (typeof $tool !== 'undefined' && $tool.copy) {
            $tool.copy(authorization);
            console.log('[XZW] Authorization已复制到剪贴板');
        }
        
        console.log(`[XZW] 保存成功，当前共 ${dataArray.length} 个账号`);
        console.log(`[XZW] 存储格式: ${dataArray.join('&')}`);
        
        // 打印所有存储的数据
        console.log('[XZW] 当前所有账号:');
        dataArray.forEach((item, index) => {
            const parts = item.split('#');
            console.log(`  ${index + 1}. ${parts[0]} - deviceId: ${parts[2]}`);
        });
    }
})();