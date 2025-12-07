/*
-------------- Quantumult X 配置 --------------

[MITM]
hostname = m.aihoge.com

[rewrite_local]
# damember数据捕获（请求主体版本）
^https:\/\/m\.aihoge\.com\/api\/memberhy\/h5\/js\/signature url script-request-body https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/damember.js

*/

// damember.js - 根据nick_name更新对应的完整member数据（JSON格式）
(function() {
    'use strict';
    
    const TARGET_URL = 'https://m.aihoge.com/api/memberhy/h5/js/signature';
    
    // 检查是否是目标URL
    if (!$request || !$request.url.includes(TARGET_URL)) {
        $done({});
        return;
    }
    
    try {
        // 获取请求主体
        const body = $request.body;
        if (!body) {
            console.log('[damember] 请求主体为空');
            $done({});
            return;
        }
        
        console.log(`[damember] 请求主体: ${body.substring(0, 100)}...`);
        
        // 解析请求主体
        let memberData = null;
        
        // 方法1：尝试从表单数据中获取member参数
        if (body.includes('member=')) {
            const match = body.match(/member=([^&]*)/);
            if (match && match[1]) {
                memberData = decodeURIComponent(match[1]);
            }
        }
        
        // 方法2：尝试直接解析为JSON（如果是application/json格式）
        if (!memberData) {
            try {
                const jsonData = JSON.parse(body);
                if (jsonData.member) {
                    memberData = typeof jsonData.member === 'string' ? jsonData.member : JSON.stringify(jsonData.member);
                }
            } catch (e) {
                // 不是JSON格式
            }
        }
        
        if (!memberData) {
            console.log('[damember] 无法从请求主体中提取member数据');
            $done({});
            return;
        }
        
        console.log(`[damember] 提取到member数据: ${memberData.substring(0, 100)}...`);
        
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
            let jsonData;
            
            // 尝试直接解析为JSON
            if (typeof memberData === 'string') {
                jsonData = JSON.parse(memberData);
            } else {
                jsonData = memberData;
            }
            
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
        for (let i = 0; i < accounts.length; i++) {
            const account = accounts[i];
            
            // 尝试解析账号数据
            try {
                // 你的示例数据格式是：手机号&密码&JSON
                const parts = account.split('&');
                if (parts.length >= 3) {
                    const jsonStr = parts.slice(2).join('&');
                    const accountData = JSON.parse(jsonStr);
                    const accountNickName = accountData.nick_name ? decodeURIComponent(accountData.nick_name) : null;
                    
                    if (accountNickName && accountNickName === nickName) {
                        // 找到匹配的nick_name，替换为新数据
                        // 需要将新数据转换为相同的格式：手机号&密码&JSON
                        const newJsonData = typeof newMemberData === 'string' ? newMemberData : JSON.stringify(newMemberData);
                        // 保持原来的手机号和密码部分
                        updatedAccounts.push(`${parts[0]}&${parts[1]}&${newJsonData}`);
                        found = true;
                        console.log(`[damember] 更新昵称为 "${nickName}" 的账号`);
                        continue;
                    }
                }
            } catch (e) {
                console.log(`[damember] 解析账号${i+1}失败:`, e);
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
            $tool.copy(newMemberData);
            console.log(`[damember] "${nickName}"的数据已复制到剪贴板`);
        }
    }
})();
