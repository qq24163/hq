/*
-------------- Quantumult X 配置 --------------

[MITM]
hostname = m.aihoge.com

[rewrite_local]
# damember数据更新 - 抽奖接口
^https:\/\/m\.aihoge\.com\/api\/lotteryhy\/api\/client\/cj\/send\/pak url script-request-header https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/damember.js
*/

// damember.js - 根据昵称更新BoxJS中的member数据
(function() {
    'use strict';
    
    const TARGET_URL = 'https://m.aihoge.com/api/lotteryhy/api/client/cj/send/pak';
    
    // 检查是否是目标URL
    if (!$request || !$request.url.includes(TARGET_URL)) {
        $done({});
        return;
    }
    
    try {
        console.log('[damember] 开始处理抽奖请求');
        
        let memberJson = null;
        
        // 1. 优先检查请求主体（JSON格式）
        const body = $request.body;
        if (body) {
            try {
                const jsonBody = JSON.parse(body);
                console.log('[damember] 请求主体JSON字段:', Object.keys(jsonBody).join(', '));
                
                // 查找member字段（可能是字符串或对象）
                if (jsonBody.member) {
                    if (typeof jsonBody.member === 'string') {
                        memberJson = jsonBody.member;
                        console.log('[damember] 从JSON字符串member字段获取');
                    } else if (typeof jsonBody.member === 'object') {
                        memberJson = JSON.stringify(jsonBody.member);
                        console.log('[damember] 从JSON对象member字段获取并转换为字符串');
                    }
                }
                // 有时member在data字段中
                else if (jsonBody.data && jsonBody.data.member) {
                    if (typeof jsonBody.data.member === 'string') {
                        memberJson = jsonBody.data.member;
                        console.log('[damember] 从data.member字符串字段获取');
                    } else if (typeof jsonBody.data.member === 'object') {
                        memberJson = JSON.stringify(jsonBody.data.member);
                        console.log('[damember] 从data.member对象字段获取并转换为字符串');
                    }
                }
                // 如果整个body就是member数据
                else if (body.includes('nick_name') && body.includes('token')) {
                    memberJson = body;
                    console.log('[damember] 整个请求主体作为member数据');
                }
            } catch (e) {
                console.log('[damember] JSON解析失败，尝试其他方式');
            }
        }
        
        // 2. 检查URL参数
        if (!memberJson) {
            const url = new URL($request.url);
            const memberFromUrl = url.searchParams.get('member');
            if (memberFromUrl) {
                memberJson = memberFromUrl;
                console.log('[damember] 从URL参数获取member数据');
            }
        }
        
        // 3. 检查请求头部
        if (!memberJson) {
            const headers = $request.headers;
            // 检查常见携带member的头部
            const possibleHeaders = ['member', 'Member', 'x-member', 'X-Member', 'user-info', 'User-Info'];
            for (const header of possibleHeaders) {
                if (headers[header]) {
                    memberJson = headers[header];
                    console.log(`[damember] 从${header}头部获取member数据`);
                    break;
                }
            }
        }
        
        if (!memberJson) {
            console.log('[damember] 未找到member数据，跳过处理');
            $done({});
            return;
        }
        
        console.log(`[damember] 获取到的member数据: ${memberJson.substring(0, 100)}...`);
        
        // 处理并更新member数据
        processMemberUpdate(memberJson);
        
    } catch (error) {
        console.log(`[damember] 错误: ${error.message}`);
    }
    
    $done({});
    
    function processMemberUpdate(newMemberJson) {
        try {
            // 解析新的member数据
            const newMemberData = JSON.parse(newMemberJson);
            
            // 提取昵称（URL解码）
            let nickName = newMemberData.nick_name;
            if (nickName) {
                try {
                    nickName = decodeURIComponent(nickName);
                } catch (e) {
                    // 如果解码失败，保持原样
                }
            } else {
                console.log('[damember] 新member数据中没有nick_name字段');
                console.log('[damember] 可用字段:', Object.keys(newMemberData).join(', '));
                $notify("❌ damember 更新失败", "缺少昵称字段", "新数据中没有nick_name");
                return;
            }
            
            console.log(`[damember] 要更新的账号昵称: ${nickName}`);
            
            // 获取BoxJS中的现有数据
            const STORAGE_KEY = 'damember';
            const storedData = $prefs.valueForKey(STORAGE_KEY) || '';
            
            if (!storedData.trim()) {
                console.log('[damember] BoxJS中无数据，无法更新');
                $notify("❌ damember 更新失败", "BoxJS中无数据", "请先添加账号数据");
                return;
            }
            
            console.log(`[damember] BoxJS原始数据长度: ${storedData.length}`);
            
            // 分割账号（按空格分割）
            const accounts = storedData.trim().split(/\s+/);
            console.log(`[damember] 找到 ${accounts.length} 个账号`);
            
            let updatedCount = 0;
            let foundAccount = null;
            const updatedAccounts = [];
            
            // 遍历每个账号进行匹配和更新
            for (let i = 0; i < accounts.length; i++) {
                const account = accounts[i];
                const parts = account.split('&');
                
                if (parts.length >= 3) {
                    try {
                        // 解析member JSON部分
                        const memberJsonStr = parts.slice(2).join('&'); // 合并第3部分及以后（防止member JSON中包含&）
                        const memberData = JSON.parse(memberJsonStr);
                        
                        // 提取当前账号的昵称
                        let currentNickName = memberData.nick_name;
                        if (currentNickName) {
                            try {
                                currentNickName = decodeURIComponent(currentNickName);
                            } catch (e) {
                                // 解码失败，保持原样
                            }
                        }
                        
                        // 检查昵称是否匹配
                        if (currentNickName === nickName) {
                            console.log(`[damember] 找到匹配账号 ${i+1}: ${currentNickName}`);
                            console.log(`[damember] 原手机号: ${parts[0]}, 用户名: ${parts[1]}`);
                            
                            foundAccount = {
                                index: i,
                                phone: parts[0],
                                username: parts[1],
                                oldMember: memberJsonStr,
                                newMember: newMemberJson
                            };
                            
                            // 用新的member数据替换旧的，保持手机号和用户名不变
                            const updatedAccount = `${parts[0]}&${parts[1]}&${newMemberJson}`;
                            updatedAccounts.push(updatedAccount);
                            updatedCount++;
                            
                            console.log(`[damember] 已更新账号 ${i+1}`);
                        } else {
                            // 不匹配的账号保持不变
                            updatedAccounts.push(account);
                        }
                    } catch (e) {
                        console.log(`[damember] 账号 ${i+1} 解析失败: ${e.message}`);
                        // 解析失败的账号也保持原样
                        updatedAccounts.push(account);
                    }
                } else {
                    console.log(`[damember] 账号 ${i+1} 格式错误，跳过`);
                    updatedAccounts.push(account);
                }
            }
            
            if (updatedCount === 0) {
                console.log(`[damember] 未找到昵称为 "${nickName}" 的账号`);
                
                // 显示现有账号的昵称列表
                const existingNicknames = [];
                for (const account of accounts) {
                    try {
                        const parts = account.split('&');
                        if (parts.length >= 3) {
                            const memberJsonStr = parts.slice(2).join('&');
                            const memberData = JSON.parse(memberJsonStr);
                            if (memberData.nick_name) {
                                let decodedName;
                                try {
                                    decodedName = decodeURIComponent(memberData.nick_name);
                                } catch (e) {
                                    decodedName = memberData.nick_name;
                                }
                                existingNicknames.push(decodedName);
                            }
                        }
                    } catch (e) {
                        // 跳过解析失败的账号
                    }
                }
                
                $notify(
                    "❌ damember 更新失败", 
                    `未找到账号: ${nickName}`, 
                    `现有账号: ${existingNicknames.slice(0, 5).join(', ')}${existingNicknames.length > 5 ? '...' : ''}`
                );
                return;
            }
            
            // 保存更新后的数据
            const newData = updatedAccounts.join(' ');
            $prefs.setValueForKey(newData, STORAGE_KEY);
            
            console.log(`[damember] 更新完成，共更新 ${updatedCount} 个账号`);
            console.log(`[damember] 保存后数据长度: ${newData.length}`);
            
            // 发送通知
            const title = "✅ damember 更新成功";
            const subtitle = `昵称: ${nickName}`;
            const message = `手机号: ${foundAccount.phone}\n用户名: ${foundAccount.username}\n总账号数: ${updatedAccounts.length}`;
            
            $notify(title, subtitle, message);
            
            // 输出对比信息
            if (foundAccount) {
                console.log('[damember] 更新对比:');
                console.log('[damember] 原数据:', foundAccount.oldMember.substring(0, 150));
                console.log('[damember] 新数据:', foundAccount.newMember.substring(0, 150));
                
                try {
                    const oldData = JSON.parse(foundAccount.oldMember);
                    const newData = JSON.parse(foundAccount.newMember);
                    
                    // 比较关键字段变化
                    const changedFields = [];
                    const fieldsToCompare = ['token', 'btoken', 'mtoken', 'stoken', 'expire', 'id', 'mark'];
                    
                    for (const field of fieldsToCompare) {
                        if (oldData[field] !== newData[field]) {
                            changedFields.push(field);
                        }
                    }
                    
                    if (changedFields.length > 0) {
                        console.log(`[damember] 变化的字段: ${changedFields.join(', ')}`);
                    } else {
                        console.log('[damember] 关键字段无变化');
                    }
                } catch (e) {
                    console.log('[damember] 对比解析失败:', e.message);
                }
            }
            
        } catch (error) {
            console.log(`[damember] 处理失败: ${error.message}`);
            $notify("❌ damember 更新失败", "数据处理错误", error.message);
        }
    }
    
    // 辅助函数：从member JSON中提取昵称
    function extractNickNameFromMember(memberJson) {
        try {
            const data = typeof memberJson === 'string' ? JSON.parse(memberJson) : memberJson;
            if (data.nick_name) {
                try {
                    return decodeURIComponent(data.nick_name);
                } catch (e) {
                    return data.nick_name;
                }
            }
        } catch (e) {
            // 解析失败
        }
        return null;
    }
})();
