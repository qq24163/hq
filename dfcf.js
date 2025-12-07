/*
-------------- Quantumult X 配置 --------------

[MITM]
hostname = empointcpf.eastmoney.com

[rewrite_local]
# 东方财富多token捕获
^https:\/\/empointcpf\.eastmoney\.com:9001\/TaskServiceForApp\/FinishTaskFP url script-request-body https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/dfcf.js

*/
// dfcf.js - 捕获东方财富多token参数并管理多账号
(function() {
    'use strict';
    
    const TARGET_URL = 'https://empointcpf.eastmoney.com:9001/TaskServiceForApp/FinishTaskFP';
    
    // 检查是否是目标URL
    if (!$request || !$request.url.includes(TARGET_URL)) {
        $done({});
        return;
    }
    
    try {
        const headers = $request.headers;
        const body = $request.body;
        
        // 1. 从请求头部获取token
        const cToken = headers['CToken'] || headers['ctoken'] || headers['C-Token'];
        const gToken = headers['GToken'] || headers['gtoken'] || headers['G-Token'];
        const uToken = headers['UToken'] || headers['utoken'] || headers['U-Token'];
        const emMd = headers['EM-MD'] || headers['em-md'] || headers['em_md'];
        
        // 检查必须的头部token
        if (!cToken) {
            console.log('[dfcf] 未找到CToken头部');
            $done({});
            return;
        }
        
        console.log(`[dfcf] 捕获到CToken: ${cToken.substring(0, 15)}...`);
        if (gToken) console.log(`[dfcf] 捕获到GToken: ${gToken.substring(0, 15)}...`);
        if (uToken) console.log(`[dfcf] 捕获到UToken: ${uToken.substring(0, 15)}...`);
        if (emMd) console.log(`[dfcf] 捕获到EM-MD: ${emMd.substring(0, 15)}...`);
        
        // 2. 从请求主体获取参数
        let taskId = '', rnd = '', code = '', sign = '';
        
        if (body) {
            try {
                const bodyData = JSON.parse(body);
                taskId = bodyData.TaskId || bodyData.taskId || bodyData.taskid || '';
                rnd = bodyData.Rnd || bodyData.rnd || '';
                code = bodyData.Code || bodyData.code || '';
                sign = bodyData.Sign || bodyData.sign || '';
                
                if (taskId) console.log(`[dfcf] 捕获到TaskId: ${taskId}`);
                if (rnd) console.log(`[dfcf] 捕获到Rnd: ${rnd}`);
                if (code) console.log(`[dfcf] 捕获到Code: ${code}`);
                if (sign) console.log(`[dfcf] 捕获到Sign: ${sign.substring(0, 15)}...`);
            } catch (e) {
                console.log('[dfcf] 解析请求主体失败:', e);
            }
        }
        
        // 3. 构建数据字符串
        const headerPart = [cToken, gToken || '', uToken || '', emMd || ''].join('#');
        const bodyPart = [taskId, rnd, code, sign].join('#');
        const accountData = `${headerPart}#${bodyPart}`;
        
        console.log(`[dfcf] 构建账号数据: ${accountData.substring(0, 80)}...`);
        
        // 4. 管理多账号（基于CToken去重）
        manageDfcfAccounts(cToken, accountData);
        
    } catch (error) {
        console.log(`[dfcf] 错误: ${error}`);
    }
    
    $done({});
    
    function manageDfcfAccounts(uniqueToken, newAccountData) {
        const STORAGE_KEY = 'dfcf';
        const storedAccounts = $prefs.valueForKey(STORAGE_KEY) || '';
        let accountsArray = storedAccounts ? storedAccounts.split('\n').filter(a => a.trim() !== '') : [];
        
        // 检查是否已存在相同CToken的账号
        let isNewAccount = true;
        let accountIndex = -1;
        
        // 提取每个账号的CToken部分进行比较
        for (let i = 0; i < accountsArray.length; i++) {
            const accountCToken = accountsArray[i].split('#')[0]; // 第一个#前的是CToken
            if (accountCToken === uniqueToken) {
                isNewAccount = false;
                accountIndex = i;
                break;
            }
        }
        
        if (isNewAccount) {
            // 新账号，添加到数组
            accountsArray.push(newAccountData);
            console.log(`[dfcf] 添加新账号，CToken: ${uniqueToken.substring(0, 10)}...`);
        } else {
            // 更新已有账号
            accountsArray[accountIndex] = newAccountData;
            console.log(`[dfcf] 更新已有账号，索引: ${accountIndex}`);
        }
        
        // 保存到BoxJS
        $prefs.setValueForKey(accountsArray.join('\n'), STORAGE_KEY);
        
        // 发送精简通知
        const title = isNewAccount ? "✅ 东方财富账号已添加" : "🔄 东方财富账号已更新";
        const subtitle = `账号${isNewAccount ? accountsArray.length : accountIndex + 1}`;
        const message = `CToken: ${uniqueToken.substring(0, 10)}...`;
        
        $notify(title, subtitle, message);
        
        // 自动复制当前账号数据
        if (typeof $tool !== 'undefined' && $tool.copy) {
            $tool.copy(newAccountData);
            console.log(`[dfcf] 账号数据已复制到剪贴板`);
        }
        
        console.log(`[dfcf] 当前账号数: ${accountsArray.length}`);
    }
})();
