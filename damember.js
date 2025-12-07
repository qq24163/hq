/*
-------------- Quantumult X 配置 --------------

[MITM]
hostname = m.aihoge.com

[rewrite_local]
^https:\/\/m\.aihoge\.com\/api\/memberhy\/h5\/js\/signature url script-request-header https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/damember.js
*/

// damember.js - 捕获并更新damember数据（请求头版本）
(function() {
    'use strict';
    
    const TARGET_URL = 'https://m.aihoge.com/api/memberhy/h5/js/signature';
    
    // 检查是否是目标URL
    if (!$request || !$request.url.includes(TARGET_URL)) {
        $done({});
        return;
    }
    
    try {
        const headers = $request.headers;
        // 从请求头部获取member数据
        // 尝试多种可能的头部名称
        const memberData = headers['Member'] || headers['member'] || 
                          headers['X-Member'] || headers['x-member'] ||
                          headers['User-Info'] || headers['user-info'];
        
        if (!memberData) {
            console.log('[damember] 未找到member头部');
            $done({});
            return;
        }
        
        console.log(`[damember] 捕获到member数据: ${memberData.substring(0, 30)}...`);
        
        // 解析member数据，格式：手机号&密码&JSON数据
        const parts = memberData.split('&');
        if (parts.length < 3) {
            console.log('[damember] member数据格式不正确');
            $done({});
            return;
        }
        
        const phoneNumber = parts[0]; // 手机号
        const password = parts[1];    // 密码
        const jsonData = parts.slice(2).join('&'); // JSON数据部分
        
        console.log(`[damember] 手机号: ${phoneNumber}`);
        
        // 管理多账号
        updateDamemberData(phoneNumber, memberData);
        
    } catch (error) {
        console.log(`[damember] 错误: ${error}`);
    }
    
    $done({});
    
    function updateDamemberData(phoneNumber, newMemberData) {
        const STORAGE_KEY = 'damember';
        const storedData = $prefs.valueForKey(STORAGE_KEY) || '';
        let dataArray = storedData ? storedData.split(' ').filter(d => d.trim() !== '') : [];
        
        // 检查是否已存在相同手机号
        let isNewData = true;
        let existingIndex = -1;
        
        // 遍历现有数据检查重复
        for (let i = 0; i < dataArray.length; i++) {
            const existingPhoneNumber = dataArray[i].split('&')[0];
            if (existingPhoneNumber === phoneNumber) {
                isNewData = false;
                existingIndex = i;
                break;
            }
        }
        
        if (isNewData) {
            // 新账号，添加到数组
            dataArray.push(newMemberData);
            
            // 保存到BoxJS
            $prefs.setValueForKey(dataArray.join(' '), STORAGE_KEY);
        } else {
            // 更新已有账号
            dataArray[existingIndex] = newMemberData;
            
            // 保存到BoxJS
            $prefs.setValueForKey(dataArray.join(' '), STORAGE_KEY);
        }
        
        // 发送精简通知
        const title = isNewData ? "✅ damember 数据已添加" : "🔄 damember 数据已更新";
        const subtitle = `手机号: ${phoneNumber}`;
        const message = `账号数: ${dataArray.length}`;
        
        $notify(title, subtitle, message);
        
        // 自动复制当前member数据
        if (typeof $tool !== 'undefined' && $tool.copy) {
            $tool.copy(newMemberData);
            console.log('[damember] member数据已复制到剪贴板');
        }
    }
})();
