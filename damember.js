/*
-------------- Quantumult X 配置 --------------

[MITM]
hostname = m.aihoge.com

[rewrite_local]
# damember数据捕获
^https:\/\/m\.aihoge\.com\/api\/lotteryhy\/api\/client\/cj\/send\/pak url script-request-header https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/damember.js
*/

// damember.js - 从URL参数或请求头部获取member数据
(function() {
    'use strict';
    
    // 修改目标URL为新的抽奖接口
    const TARGET_URL = 'https://m.aihoge.com/api/lotteryhy/api/client/cj/send/pak';
    
    // 检查是否是目标URL
    if (!$request || !$request.url.includes(TARGET_URL)) {
        $done({});
        return;
    }
    
    try {
        console.log('[damember] 开始处理抽奖请求');
        console.log('[damember] 请求URL:', $request.url);
        console.log('[damember] 请求方法:', $request.method);
        
        // 检查请求方法，抽奖接口通常是POST
        if ($request.method !== 'POST') {
            console.log('[damember] 非POST请求，跳过');
            $done({});
            return;
        }
        
        // 1. 首先检查请求主体（抽奖接口的member通常在body中）
        let memberData = null;
        const body = $request.body;
        
        if (body) {
            console.log(`[damember] 请求主体长度: ${body.length}`);
            console.log(`[damember] 请求主体预览: ${body.substring(0, 200)}`);
            
            // 尝试解析为JSON
            try {
                const jsonBody = JSON.parse(body);
                console.log('[damember] JSON主体字段:', Object.keys(jsonBody).join(', '));
                
                // 查找member字段
                if (jsonBody.member) {
                    memberData = jsonBody.member;
                    console.log('[damember] 从JSON主体member字段获取到数据');
                } 
                // 有时member可能在其他字段中
                else if (jsonBody.data && jsonBody.data.member) {
                    memberData = jsonBody.data.member;
                    console.log('[damember] 从JSON主体data.member字段获取到数据');
                }
                // 或者可能是参数形式
                else {
                    // 检查其他可能的字段名
                    const possibleMemberFields = ['user', 'userInfo', 'userinfo', 'user_data', 'userData'];
                    for (const field of possibleMemberFields) {
                        if (jsonBody[field]) {
                            // 如果这个字段是字符串，可能是member数据
                            if (typeof jsonBody[field] === 'string' && jsonBody[field].includes('nick_name')) {
                                memberData = jsonBody[field];
                                console.log(`[damember] 从JSON主体${field}字段获取到数据`);
                                break;
                            }
                        }
                    }
                }
                
                // 如果没有找到member字段，但整个body看起来像member数据
                if (!memberData && body.includes('nick_name') && body.includes('{')) {
                    memberData = body;
                    console.log('[damember] 整个请求主体看起来像member数据');
                }
                
            } catch (e) {
                console.log('[damember] JSON解析失败:', e.message);
                
                // 如果不是JSON，可能是表单数据
                if (body.includes('member=')) {
                    const match = body.match(/member=([^&]*)/);
                    if (match && match[1]) {
                        memberData = decodeURIComponent(match[1]);
                        console.log('[damember] 从表单数据获取到member数据');
                    }
                }
            }
        }
        
        // 2. 检查URL参数
        if (!memberData) {
            const url = new URL($request.url);
            const memberFromUrl = url.searchParams.get('member');
            
            if (memberFromUrl) {
                memberData = memberFromUrl;
                console.log('[damember] 从URL参数获取到member数据');
            }
        }
        
        // 3. 检查请求头部
        if (!memberData) {
            const headers = $request.headers;
            console.log('[damember] 检查请求头部');
            
            // 尝试获取member头部
            let memberHeader = headers['member'] || headers['Member'] || 
                              headers['x-member'] || headers['X-Member'] ||
                              headers['user-info'] || headers['User-Info'] ||
                              headers['authorization'] || headers['Authorization'];
            
            if (memberHeader) {
                memberData = memberHeader;
                console.log('[damember] 从请求头部获取到member数据');
            }
        }
        
        // 4. 检查referer头部
        if (!memberData) {
            const referer = $request.headers['Referer'] || $request.headers['referer'];
            if (referer && referer.includes('member=')) {
                const refererUrl = new URL(referer);
                const memberFromReferer = refererUrl.searchParams.get('member');
                if (memberFromReferer) {
                    memberData = memberFromReferer;
                    console.log('[damember] 从Referer头部获取到member数据');
                }
            }
        }
        
        if (memberData) {
            console.log('[damember] 成功获取到member数据');
            processMemberData(memberData);
        } else {
            console.log('[damember] 未找到member数据，请检查请求结构');
            console.log('[damember] 完整请求头:', JSON.stringify($request.headers, null, 2));
        }
        
    } catch (error) {
        console.log(`[damember] 错误: ${error.message}`);
        console.log(`[damember] 错误堆栈: ${error.stack}`);
    }
    
    $done({});
    
    function processMemberData(memberData) {
        console.log(`[damember] 原始member数据: ${typeof memberData === 'string' ? memberData.substring(0, 100) + '...' : '非字符串类型'}`);
        
        // 确保是字符串
        let cleanData = String(memberData).trim();
        
        // 如果数据以 member: 开头，去掉前缀
        if (cleanData.toLowerCase().startsWith('member:')) {
            cleanData = cleanData.substring(7).trim();
        }
        
        // 如果是Base64编码，尝试解码
        if (cleanData.includes('=') && cleanData.length % 4 === 0 && /^[A-Za-z0-9+/=]+$/.test(cleanData)) {
            try {
                const decoded = decodeBase64(cleanData);
                console.log('[damember] 检测到Base64编码，解码后:', decoded.substring(0, 50));
                cleanData = decoded;
            } catch (e) {
                // 不是有效的Base64，继续处理
            }
        }
        
        // 尝试解析为JSON
        try {
            const jsonData = JSON.parse(cleanData);
            console.log('[damember] 成功解析为JSON');
            
            // 提取nick_name
            let nickName = null;
            if (jsonData.nick_name) {
                try {
                    nickName = decodeURIComponent(jsonData.nick_name);
                } catch (e) {
                    nickName = jsonData.nick_name;
                }
            } 
            // 如果没有nick_name，尝试其他可能的昵称字段
            else {
                const possibleNickNameFields = ['nickname', 'nickName', 'name', 'userName', 'username', 'alias'];
                for (const field of possibleNickNameFields) {
                    if (jsonData[field]) {
                        nickName = jsonData[field];
                        console.log(`[damember] 从字段 ${field} 获取昵称: ${nickName}`);
                        break;
                    }
                }
            }
            
            if (nickName) {
                console.log(`[damember] 昵称: ${nickName}`);
                updateMemberByNickName(nickName, cleanData);
            } else {
                console.log('[damember] 未找到昵称字段');
                console.log('[damember] JSON字段:', Object.keys(jsonData).join(', '));
                
                // 使用用户ID或其他标识作为昵称
                const userId = jsonData.user_id || jsonData.userId || jsonData.uid || jsonData.id;
                if (userId) {
                    nickName = `用户_${userId}`;
                    console.log(`[damember] 使用用户ID作为昵称: ${nickName}`);
                    updateMemberByNickName(nickName, cleanData);
                } else {
                    // 如果都没有，使用数据哈希
                    const dataHash = hashString(cleanData).substring(0, 8);
                    nickName = `抽奖用户_${dataHash}`;
                    console.log(`[damember] 使用数据哈希作为昵称: ${nickName}`);
                    updateMemberByNickName(nickName, cleanData);
                }
            }
        } catch (e) {
            console.log('[damember] 解析JSON失败:', e.message);
            console.log('[damember] 清理后的数据:', cleanData.substring(0, 200));
            
            // 如果不是JSON，尝试提取可能的昵称
            let nickName = null;
            
            // 尝试从字符串中提取昵称
            const nickMatch = cleanData.match(/nick[_-]?name["']?\s*:\s*["']([^"']+)["']/i);
            if (nickMatch && nickMatch[1]) {
                nickName = nickMatch[1];
                console.log(`[damember] 从字符串提取昵称: ${nickName}`);
            } 
            // 尝试提取用户ID
            else {
                const idMatch = cleanData.match(/user[_-]?id["']?\s*:\s*["']?(\d+)["']?/i);
                if (idMatch && idMatch[1]) {
                    nickName = `ID_${idMatch[1]}`;
                    console.log(`[damember] 从字符串提取用户ID: ${nickName}`);
                } else {
                    // 使用数据哈希
                    const dataHash = hashString(cleanData).substring(0, 8);
                    nickName = `抽奖用户_${dataHash}`;
                    console.log(`[damember] 使用数据哈希作为昵称: ${nickName}`);
                }
            }
            
            updateMemberByNickName(nickName, cleanData);
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
                    
                    // 尝试解码nick_name
                    let accountNickName = null;
                    if (accountData.nick_name) {
                        try {
                            accountNickName = decodeURIComponent(accountData.nick_name);
                        } catch (e) {
                            accountNickName = accountData.nick_name;
                        }
                    }
                    
                    // 如果没有nick_name，尝试其他字段
                    if (!accountNickName) {
                        const possibleFields = ['nickname', 'nickName', 'name', 'userName', 'username'];
                        for (const field of possibleFields) {
                            if (accountData[field]) {
                                accountNickName = accountData[field];
                                break;
                            }
                        }
                    }
                    
                    if (accountNickName && accountNickName === nickName) {
                        console.log(`[damember] 找到匹配的账号 ${i+1}: ${accountNickName}`);
                        updatedAccounts.push(`${parts[0]}&${parts[1]}&${newMemberJson}`);
                        found = true;
                        continue;
                    }
                }
            } catch (e) {
                console.log(`[damember] 解析账号${i+1}失败: ${e.message}`);
            }
            
            updatedAccounts.push(account);
        }
        
        if (!found) {
            console.log(`[damember] 未找到昵称为 "${nickName}" 的账号`);
            console.log(`[damember] 将在BoxJS中添加新账号: ${nickName}`);
            
            // 如果没找到，添加新账号
            const timestamp = Math.floor(Date.now() / 1000);
            const newAccount = `${timestamp}&${nickName}&${newMemberJson}`;
            updatedAccounts.push(newAccount);
            
            const title = "🎰 damember 抽奖账号添加";
            const subtitle = `昵称: ${nickName}`;
            const message = `总账号数: ${updatedAccounts.length}`;
            $notify(title, subtitle, message);
        } else {
            const title = "🔄 damember 抽奖账号更新";
            const subtitle = `昵称: ${nickName}`;
            const message = `总账号数: ${updatedAccounts.length}`;
            $notify(title, subtitle, message);
        }
        
        // 保存更新（最多保留100个账号）
        const maxAccounts = 100;
        if (updatedAccounts.length > maxAccounts) {
            console.log(`[damember] 账号数超过 ${maxAccounts}，保留最新的 ${maxAccounts} 个`);
            updatedAccounts = updatedAccounts.slice(-maxAccounts);
        }
        
        const newData = updatedAccounts.join(' ');
        $prefs.setValueForKey(newData, STORAGE_KEY);
        
        console.log(`[damember] 更新完成，共 ${updatedAccounts.length} 个账号`);
    }
    
    // 辅助函数：Base64解码
    function decodeBase64(str) {
        if (typeof atob === 'function') {
            return atob(str);
        } else {
            // Node.js环境下的Base64解码
            return Buffer.from(str, 'base64').toString('utf-8');
        }
    }
    
    // 辅助函数：生成简单哈希
    function hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // 转换为32位整数
        }
        return Math.abs(hash).toString(16).padStart(8, '0');
    }
})();