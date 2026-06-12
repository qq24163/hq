/*
-------------- Quantumult X 配置 --------------

[MITM]
hostname = user-api.smzdm.com

[rewrite_local]
# SMZDM Cookie捕获
^https:\/\/user-api\.smzdm\.com\/info\/core url script-request-header https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/smzdm.js
*/
// smzdm.js - 捕获SMZDM完整Cookie并管理多账号（JSON格式存储）
(function() {
    'use strict';
    
    const TARGET_URL = 'https://user-api.smzdm.com/info/core';
    const STORAGE_KEY = 'smzdm';
    
    // 检查是否是目标URL
    if (!$request || $request.url !== TARGET_URL) {
        $done({});
        return;
    }
    
    try {
        // 获取请求头中的完整Cookie
        const fullCookie = $request.headers['Cookie'] || $request.headers['cookie'];
        
        if (!fullCookie) {
            console.log('[SMZDM] 请求头中没有Cookie');
            $done({});
            return;
        }
        
        console.log(`[SMZDM] 捕获到完整Cookie: ${fullCookie}`);
        
        // 提取smzdm_id用于判断账号
        const smzdmId = extractSmzdmId(fullCookie);
        
        if (!smzdmId) {
            console.log('[SMZDM] 未能从Cookie中提取smzdm_id');
            $done({});
            return;
        }
        
        console.log(`[SMZDM] 提取到smzdm_id: ${smzdmId}`);
        
        // 管理多账号（JSON格式，只存纯Cookie）
        manageSmzdmCookies(fullCookie, smzdmId);
        
    } catch (error) {
        console.log(`[SMZDM] 错误: ${error}`);
    }
    
    $done({});
    
    // 从Cookie中提取smzdm_id
    function extractSmzdmId(cookie) {
        const match = cookie.match(/smzdm_id=([^;]+)/);
        return match ? match[1] : null;
    }
    
    function manageSmzdmCookies(newCookie, newSmzdmId) {
        // 读取现有数据
        const storedData = $prefs.valueForKey(STORAGE_KEY);
        let accounts = {};
        
        if (storedData) {
            try {
                accounts = JSON.parse(storedData);
            } catch (e) {
                console.log('[SMZDM] 解析存储数据失败，将创建新数据');
                accounts = {};
            }
        }
        
        // 检查是否已存在相同smzdm_id
        const isNewAccount = !accounts[newSmzdmId];
        const accountCount = Object.keys(accounts).length;
        const accountNumber = isNewAccount ? accountCount + 1 : Object.keys(accounts).indexOf(newSmzdmId) + 1;
        
        // 存储纯Cookie（不带smzdm_id前缀）
        accounts[newSmzdmId] = newCookie;
        
        // 保存到BoxJS
        $prefs.setValueForKey(JSON.stringify(accounts), STORAGE_KEY);
        
        console.log(`[SMZDM] 已保存到BoxJS，key: ${STORAGE_KEY}`);
        console.log(`[SMZDM] 当前账号列表: ${JSON.stringify(accounts)}`);
        
        // 发送通知
        if (isNewAccount) {
            const title = "✅ 什么值得买 Cookie已添加";
            const subtitle = `账号${accountNumber}`;
            const message = `smzdm_id: ${newSmzdmId}\nCookie长度: ${newCookie.length}字符`;
            $notify(title, subtitle, message);
        } else {
            const title = "🔄 什么值得买 Cookie已更新";
            const subtitle = `账号${accountNumber}`;
            const message = `smzdm_id: ${newSmzdmId}\nCookie长度: ${newCookie.length}字符`;
            $notify(title, subtitle, message);
        }
        
        // 自动复制完整Cookie
        if (typeof $tool !== 'undefined' && $tool.copy) {
            $tool.copy(newCookie);
            console.log('[SMZDM] 完整Cookie已复制到剪贴板');
        }
        
        // 输出当前管理的账号信息
        const accountIds = Object.keys(accounts);
        console.log(`[SMZDM] 当前共管理 ${accountIds.length} 个账号`);
        for (const id of accountIds) {
            console.log(`[SMZDM] 账号 - smzdm_id: ${id}, Cookie长度: ${accounts[id].length}字符`);
        }
    }
})();