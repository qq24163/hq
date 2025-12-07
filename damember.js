/*
-------------- Quantumult X 配置 --------------

[MITM]
hostname = m.aihoge.com

[rewrite_local]
^https:\/\/m\.aihoge\.com\/api\/memberhy\/h5\/js\/signature url script-request-header https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/damember.js
*/

// damember.js - 只更新已存在的账号，不添加新账号
(function() {
    'use strict';
    
    const TARGET_URL = 'https://m.aihoge.com/api/memberhy/h5/js/signature';
    
    // 检查是否是目标URL
    if (!$request || !$request.url.includes(TARGET_URL)) {
        $done({});
        return;
    }
    
    try {
        // 1. 从URL参数获取member
        const url = new URL($request.url);
        let memberData = url.searchParams.get('member');
        
        // 2. 如果URL中没有，尝试从请求头部获取
        if (!memberData) {
            const headers = $request.headers;
            memberData = headers['Member'] || headers['member'] || 
                        headers['X-Member'] || headers['x-member'] ||
                        headers['User-Info'] || headers['user-info'];
        }
        
        // 3. 如果头部没有，尝试从请求主体获取
        if (!memberData && $request.body) {
            const bodyStr = $request.body;
            if (bodyStr.includes('member=')) {
                const match = bodyStr.match(/member=([^&]*)/);
                if (match && match[1]) {
                    memberData = decodeURIComponent(match[1]);
                }
            }
        }
        
        if (!memberData) {
            console.log('[damember] 未找到member数据');
            $done({});
            return;
        }
        
        console.log(`[damember] 捕获到member数据: ${memberData.substring(0, 50)}...`);
        
        // 解析member数据获取手机号
        const parts = memberData.split('&');
        if (parts.length < 3) {
            console.log('[damember] member数据格式不正确');
            $done({});
            return;
        }
        
        const phoneNumber = parts[0]; // 第一个&前的是手机号
        console.log(`[damember] 识别到手机号: ${phoneNumber}`);
        
        // 更新BoxJS中的特定账号（只更新已存在的）
        updateExistingAccount(phoneNumber, memberData);
        
    } catch (error) {
        console.log(`[damember] 错误: ${error}`);
    }
    
    $done({});
    
    function updateExistingAccount(phoneNumber, newAccountData) {
        const STORAGE_KEY = 'damember';
        const storedData = $prefs.valueForKey(STORAGE_KEY) || '';
        
        if (!storedData.trim()) {
            // BoxJS中没有数据，不添加
            console.log('[damember] BoxJS中没有数据，跳过');
            $notify("🔄 damember", "无操作", "BoxJS中无账号数据");
            return;
        }
        
        // 分割现有账号数据（用空格分隔）
        const accounts = storedData.trim().split(/\s+/);
        let found = false;
        let updatedAccounts = [];
        
        // 遍历现有账号，更新匹配手机号的账号
        for (let account of accounts) {
            const accountPhone = account.split('&')[0];
            
            if (accountPhone === phoneNumber) {
                // 找到匹配的手机号，替换为新数据
                updatedAccounts.push(newAccountData);
                found = true;
                console.log(`[damember] 更新账号: ${phoneNumber}`);
            } else {
                // 保留其他账号
                updatedAccounts.push(account);
            }
        }
        
        if (!found) {
            // 没找到匹配的手机号，不添加，保持原数据
            console.log(`[damember] 未找到账号 ${phoneNumber}，不添加`);
            $notify("🔄 damember", "无操作", `未找到账号: ${phoneNumber}`);
            return;
        }
        
        // 重新组合为字符串（用空格分隔）
        const newData = updatedAccounts.join(' ');
        
        // 保存到BoxJS
        $prefs.setValueForKey(newData, STORAGE_KEY);
        
        // 发送通知
        const title = "🔄 damember 账号已更新";
        const subtitle = `手机号: ${phoneNumber}`;
        const message = `当前账号数: ${updatedAccounts.length}`;
        
        $notify(title, subtitle, message);
        console.log(`[damember] 更新完成，当前共 ${updatedAccounts.length} 个账号`);
        
        // 自动复制当前账号数据
        if (typeof $tool !== 'undefined' && $tool.copy) {
            $tool.copy(newAccountData);
            console.log(`[damember] ${phoneNumber}的数据已复制到剪贴板`);
        }
    }
})();
