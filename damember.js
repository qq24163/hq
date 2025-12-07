/*
-------------- Quantumult X 配置 --------------

[MITM]
hostname = m.aihoge.com

[rewrite_local]
^https:\/\/m\.aihoge\.com\/api\/memberhy\/h5\/js\/signature url script-request-header https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/damember.js
*/

// damember.js - 根据nick_name更新对应的完整member数据
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
        
        console.log(`[damember] 捕获到完整member数据，长度: ${memberData.length}`);
        
        // 解析nick_name
        const nickName = extractNickNameFromMember(memberData);
        if (!nickName) {
            console.log('[damember] 无法解析nick_name');
            $done({});
            return;
        }
        
        console.log(`[damember] 识别到昵称: ${nickName}`);
        
        // 根据nick_name更新对应的完整member
        updateMemberByNickName(nickName, memberData);
        
    } catch (error) {
        console.log(`[damember] 错误: ${error}`);
    }
    
    $done({});
    
    // 从member数据中提取nick_name
    function extractNickNameFromMember(memberData) {
        try {
            // member格式：手机号&密码&JSON数据
            const parts = memberData.split('&');
            if (parts.length < 3) return null;
            
            // 获取JSON部分（从第三个&开始）
            const jsonStr = parts.slice(2).join('&');
            
            // 解析JSON
            const jsonData = JSON.parse(jsonStr);
            
            // 获取nick_name，并解码URL编码
            if (jsonData.nick_name) {
                try {
                    return decodeURIComponent(jsonData.nick_name);
                } catch (e) {
                    return jsonData.nick_name; // 如果没有URL编码，直接返回
                }
            }
            
            return null;
        } catch (e) {
            console.log('[damember] 解析nick_name失败:', e);
            return null;
        }
    }
    
    // 根据nick_name更新对应的完整member
    function updateMemberByNickName(nickName, newMemberData) {
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
        
        // 遍历现有账号，查找相同nick_name的账号
        for (let account of accounts) {
            const accountNickName = extractNickNameFromMember(account);
            
            if (accountNickName && accountNickName === nickName) {
                // 找到匹配的nick_name，替换为新数据
                updatedAccounts.push(newMemberData);
                found = true;
                console.log(`[damember] 更新昵称为 "${nickName}" 的账号`);
            } else {
                // 保留其他账号
                updatedAccounts.push(account);
            }
        }
        
        if (!found) {
            // 没找到匹配的nick_name，不添加
            console.log(`[damember] 未找到昵称为 "${nickName}" 的账号，不添加`);
            $notify("🔄 damember", "无操作", `未找到账号: ${nickName}`);
            return;
        }
        
        // 重新组合为字符串（用空格分隔）
        const newData = updatedAccounts.join(' ');
        
        // 保存到BoxJS
        $prefs.setValueForKey(newData, STORAGE_KEY);
        
        // 发送通知
        const title = "🔄 damember 账号已更新";
        const subtitle = `昵称: ${nickName}`;
        const message = `当前账号数: ${updatedAccounts.length}`;
        
        $notify(title, subtitle, message);
        console.log(`[damember] 更新完成，当前共 ${updatedAccounts.length} 个账号`);
        
        // 自动复制当前账号数据
        if (typeof $tool !== 'undefined' && $tool.copy) {
            $tool.copy(newMemberData);
            console.log(`[damember] "${nickName}"的数据已复制到剪贴板`);
        }
    }
})();
