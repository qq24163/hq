/*
-------------- Quantumult X 配置 --------------

[MITM]
hostname = m.aihoge.com

[rewrite_local]
# damember数据捕获
^https:\/\/m\.aihoge\.com\/api\/publichy\/client\/activity\/info url script-request-header https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/damember.js

*/

// damember.js - 从URL参数或请求头部获取member数据
(function() {
    'use strict';
    
    const TARGET_URL = 'https://m.aihoge.com/api/publichy/client/activity/info';
    
    // 检查是否是目标URL
    if (!$request || !$request.url.includes(TARGET_URL)) {
        $done({});
        return;
    }
    
    try {
        console.log('[damember] 开始处理请求');
        
        // 1. 首先检查URL参数
        const url = new URL($request.url);
        const memberFromUrl = url.searchParams.get('member');
        
        if (memberFromUrl) {
            console.log('[damember] 从URL参数获取到member数据');
            processMemberData(memberFromUrl);
            $done({});
            return;
        }
        
        // 2. 检查请求头部
        const headers = $request.headers;
        console.log('[damember] 检查请求头部');
        
        // 查看所有头部，找出可能的member头部
        for (const [key, value] of Object.entries(headers)) {
            if (key.toLowerCase().includes('member')) {
                console.log(`[damember] 发现member相关头部: ${key} = ${value.substring(0, 50)}...`);
            }
        }
        
        // 尝试获取member头部
        let memberHeader = headers['member'] || headers['Member'] || 
                          headers['x-member'] || headers['X-Member'];
        
        if (memberHeader) {
            console.log('[damember] 从请求头部获取到member数据');
            processMemberData(memberHeader);
            $done({});
            return;
        }
        
        // 3. 检查请求主体
        const body = $request.body;
        if (body) {
            console.log(`[damember] 请求主体长度: ${body.length}`);
            
            // 尝试从表单数据中获取member
            if (body.includes('member=')) {
                const match = body.match(/member=([^&]*)/);
                if (match && match[1]) {
                    const memberFromBody = decodeURIComponent(match[1]);
                    console.log('[damember] 从请求主体获取到member数据');
                    processMemberData(memberFromBody);
                    $done({});
                    return;
                }
            }
        } else {
            console.log('[damember] 请求主体确实为空');
        }
        
        console.log('[damember] 未找到member数据');
        
    } catch (error) {
        console.log(`[damember] 错误: ${error}`);
    }
    
    $done({});
    
    function processMemberData(memberData) {
        console.log(`[damember] 原始member数据: ${memberData.substring(0, 100)}...`);
        
        // 清理数据
        let cleanData = memberData.trim();
        
        // 如果数据以 member: 开头，去掉前缀
        if (cleanData.toLowerCase().startsWith('member:')) {
            cleanData = cleanData.substring(7).trim();
        }
        
        // 尝试解析为JSON
        try {
            const jsonData = JSON.parse(cleanData);
            console.log('[damember] 成功解析为JSON');
            
            // 提取nick_name
            if (jsonData.nick_name) {
                let nickName;
                try {
                    nickName = decodeURIComponent(jsonData.nick_name);
                } catch (e) {
                    nickName = jsonData.nick_name;
                }
                
                console.log(`[damember] 昵称: ${nickName}`);
                
                // 更新BoxJS数据
                updateMemberByNickName(nickName, cleanData);
            } else {
                console.log('[damember] JSON中未找到nick_name字段');
            }
        } catch (e) {
            console.log('[damember] 解析JSON失败:', e);
            console.log('[damember] 尝试清理的数据:', cleanData);
        }
    }
    
    // 根据nick_name更新对应的完整member
    function updateMemberByNickName(nickName, newMemberJson) {
        const STORAGE_KEY = 'damember';
        const storedData = $prefs.valueForKey(STORAGE_KEY) || '';
        
        if (!storedData.trim()) {
            console.log('[damember] BoxJS中没有数据，跳过');
            $notify("🔄 damember", "无操作", "BoxJS中无账号数据");
            return;
        }
        
        console.log(`[damember] BoxJS中原有数据长度: ${storedData.length}`);
        
        // 分割现有账号数据
        const accounts = storedData.trim().split(/\s+/);
        console.log(`[damember] BoxJS中原有账号数: ${accounts.length}`);
        
        let found = false;
        let updatedAccounts = [];
        
        // 遍历现有账号
        for (let i = 0; i < accounts.length; i++) {
            const account = accounts[i];
            
            try {
                const parts = account.split('&');
                if (parts.length >= 3) {
                    const jsonStr = parts.slice(2).join('&');
                    const accountData = JSON.parse(jsonStr);
                    const accountNickName = accountData.nick_name ? decodeURIComponent(accountData.nick_name) : null;
                    
                    if (accountNickName && accountNickName === nickName) {
                        console.log(`[damember] 找到匹配的账号 ${i+1}: ${accountNickName}`);
                        updatedAccounts.push(`${parts[0]}&${parts[1]}&${newMemberJson}`);
                        found = true;
                        continue;
                    }
                }
            } catch (e) {
                console.log(`[damember] 解析账号${i+1}失败`);
            }
            
            updatedAccounts.push(account);
        }
        
        if (!found) {
            console.log(`[damember] 未找到昵称为 "${nickName}" 的账号`);
            $notify("🔄 damember", "无操作", `未找到账号: ${nickName}`);
            return;
        }
        
        // 保存更新
        const newData = updatedAccounts.join(' ');
        $prefs.setValueForKey(newData, STORAGE_KEY);
        
        const title = "🔄 damember 账号已更新";
        const subtitle = `昵称: ${nickName}`;
        const message = `账号数: ${updatedAccounts.length}`;
        
        $notify(title, subtitle, message);
        console.log(`[damember] 更新完成，共 ${updatedAccounts.length} 个账号`);
    }
})();
