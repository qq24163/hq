/*
-------------- Quantumult X 配置 --------------

[MITM]
hostname = m.aihoge.com

[rewrite_local]
# damember数据捕获（请求头部版本）
^https:\/\/m\.aihoge\.com\/api\/memberhy\/h5\/js\/signature url script-request-header https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/damember.js

*/

// damember.js - 从请求头部获取member JSON数据并更新
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
        let memberHeader = headers['member'] || headers['Member'] || headers['x-member'] || headers['X-Member'];
        
        if (!memberHeader) {
            console.log('[damember] 请求头部中未找到member字段');
            $done({});
            return;
        }
        
        console.log(`[damember] 捕获到member头部数据: ${memberHeader.substring(0, 100)}...`);
        
        // 清理member数据（移除可能的空格和冒号）
        let memberData = memberHeader.trim();
        if (memberData.startsWith('member:')) {
            memberData = memberData.substring(7).trim();
        }
        
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
    
    // 从member JSON中提取nick_name
    function extractNickNameFromMember(memberData) {
        try {
            // 解析JSON
            const jsonData = JSON.parse(memberData);
            
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
            console.log('[damember] 解析JSON失败:', e);
            console.log('[damember] 原始数据:', memberData);
            return null;
        }
    }
    
    // 根据nick_name更新对应的完整member
    function updateMemberByNickName(nickName, newMemberJson) {
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
        for (let i = 0; i < accounts.length; i++) {
            const account = accounts[i];
            
            // 尝试解析账号数据
            try {
                // BoxJS中的数据格式：手机号&密码&JSON
                const parts = account.split('&');
                if (parts.length >= 3) {
                    const jsonStr = parts.slice(2).join('&');
                    const accountData = JSON.parse(jsonStr);
                    const accountNickName = accountData.nick_name ? decodeURIComponent(accountData.nick_name) : null;
                    
                    if (accountNickName && accountNickName === nickName) {
                        // 找到匹配的nick_name，替换为新数据
                        // 保持原来的手机号和密码部分，只更新JSON部分
                        updatedAccounts.push(`${parts[0]}&${parts[1]}&${newMemberJson}`);
                        found = true;
                        console.log(`[damember] 更新昵称为 "${nickName}" 的账号`);
                        console.log(`[damember] 手机号: ${parts[0]}, 密码: ${parts[1]}`);
                        continue;
                    }
                }
            } catch (e) {
                console.log(`[damember] 解析账号${i+1}失败:`, e);
                console.log(`[damember] 账号数据:`, account.substring(0, 100));
            }
            
            // 保留其他账号
            updatedAccounts.push(account);
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
            $tool.copy(newMemberJson);
            console.log(`[damember] "${nickName}"的JSON数据已复制到剪贴板`);
        }
        
        // 打印调试信息
        console.log(`[damember] BoxJS数据更新详情:`);
        console.log(`[damember] 匹配昵称: ${nickName}`);
        console.log(`[damember] 新JSON数据长度: ${newMemberJson.length}`);
        console.log(`[damember] 新数据示例: ${newMemberJson.substring(0, 100)}...`);
    }
})();
