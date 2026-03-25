/*
[MITM]
hostname = vues.dd1x.cn

[rewrite_local]
# 点灯游戏登录信息捕获
^https:\/\/vues\.dd1x\.cn\/wechat\/login url script-response-body https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/ddyx.js
*/
// ddyx_cookie.js - 捕获点灯游戏登录信息
(function() {
    'use strict';
    
    const TARGET_URL = 'https://vues.dd1x.cn/wechat/login';
    const STORAGE_KEY = 'ddyx';
    
    // 检查是否是目标URL
    if (!$response || !$response.url || !$response.url.includes(TARGET_URL)) {
        $done({});
        return;
    }
    
    try {
        // 获取响应体
        const body = $response.body;
        if (!body) {
            console.log('[DDYX] 响应体为空');
            $done({});
            return;
        }
        
        // 解析JSON
        let jsonData;
        try {
            jsonData = JSON.parse(body);
        } catch (e) {
            console.log(`[DDYX] JSON解析失败: ${e}`);
            $done({});
            return;
        }
        
        // 检查响应码和数据
        if (jsonData.code !== 0 || !jsonData.data) {
            console.log(`[DDYX] 响应异常: code=${jsonData.code}`);
            $done({});
            return;
        }
        
        const data = jsonData.data;
        const tel = data.tel;
        const token = data.token;
        
        if (!tel || !token) {
            console.log(`[DDYX] 未找到tel或token: tel=${tel}, token=${token}`);
            $done({});
            return;
        }
        
        console.log(`[DDYX] 捕获到数据: tel=${tel}, token=${token.substring(0, 50)}...`);
        
        // 格式化数据
        const newData = `${tel}#${token}`;
        
        // 管理多账号
        manageDdyxData(tel, token, newData);
        
    } catch (error) {
        console.log(`[DDYX] 错误: ${error}`);
    }
    
    $done({});
    
    function manageDdyxData(tel, token, newData) {
        // 获取已存储的数据
        const storedData = $prefs.valueForKey(STORAGE_KEY) || '';
        let dataArray = storedData ? storedData.split('&').filter(item => item.trim() !== '') : [];
        
        // 检查是否已存在相同手机号的数据
        let existingIndex = -1;
        
        for (let i = 0; i < dataArray.length; i++) {
            // 从存储的数据中提取手机号进行比较（格式：tel#token）
            const storedTel = dataArray[i].split('#')[0];
            if (storedTel === tel) {
                existingIndex = i;
                console.log(`[DDYX] 找到相同手机号的旧数据，索引: ${i}`);
                break;
            }
        }
        
        if (existingIndex === -1) {
            // 新手机号，添加到数组末尾
            dataArray.push(newData);
            console.log(`[DDYX] 添加新账号，手机号: ${tel}`);
        } else {
            // 已存在手机号，只更新token
            dataArray[existingIndex] = newData;
            console.log(`[DDYX] 更新已有账号的token，手机号: ${tel}`);
        }
        
        // 保存到BoxJS
        $prefs.setValueForKey(dataArray.join('&'), STORAGE_KEY);
        
        // 发送通知
        const title = existingIndex === -1 ? "✅ DDYX账号已添加" : "🔄 DDYX账号已更新";
        const subtitle = `手机号: ${tel}`;
        const message = `当前账号数: ${dataArray.length}`;
        
        $notify(title, subtitle, message);
        
        // 可选：复制当前token到剪贴板
        if (typeof $tool !== 'undefined' && $tool.copy) {
            $tool.copy(token);
            console.log('[DDYX] Token已复制到剪贴板');
        }
        
        console.log(`[DDYX] 保存成功，当前共 ${dataArray.length} 个账号`);
        console.log(`[DDYX] 存储格式: ${dataArray.join('&')}`);
    }
})();