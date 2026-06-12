/*
-------------- Quantumult X 配置 --------------

[MITM]
hostname = user-api.smzdm.com

[rewrite_local]
# 什么值得买 Cookie 捕获
^https:\/\/user-api\.smzdm\.com\/info\/core url script-request-header https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/smzdm.js
*/
// smzdm.js - 捕获什么值得买 Cookie 并管理多账号
(function() {
    'use strict';
    
    const TARGET_URL = 'https://user-api.smzdm.com/info/core';
    
    // 检查是否是目标URL
    if (!$request || !$request.url.indexOf(TARGET_URL) === -1) {
        $done({});
        return;
    }
    
    try {
        // 获取请求头中的 Cookie
        const cookie = $request.headers['Cookie'] || $request.headers['cookie'];
        
        if (!cookie) {
            console.log('[SMZDM] 未找到Cookie');
            $done({});
            return;
        }
        
        console.log(`[SMZDM] 捕获到Cookie: ${cookie.substring(0, 50)}...`);
        
        // 管理多账号
        manageSmzdmCookies(cookie);
        
    } catch (error) {
        console.log(`[SMZDM] 错误: ${error}`);
    }
    
    $done({});
    
    function manageSmzdmCookies(newCookie) {
        const STORAGE_KEY = 'smzdm';
        const storedCookies = $prefs.valueForKey(STORAGE_KEY) || '';
        let cookiesArray = storedCookies ? storedCookies.split('&').filter(c => c.trim() !== '') : [];
        
        // 标准化Cookie（可选：提取关键部分用于去重判断）
        let isNewCookie = true;
        let accountNumber = cookiesArray.length + 1;
        
        // 遍历现有Cookie检查重复（可以提取sess或userId进行更精确判断）
        for (let i = 0; i < cookiesArray.length; i++) {
            if (cookiesArray[i] === newCookie) {
                isNewCookie = false;
                accountNumber = i + 1;
                break;
            }
        }
        
        if (isNewCookie) {
            // 新Cookie，添加到数组
            cookiesArray.push(newCookie);
            
            // 保存到BoxJS，用&分隔
            $prefs.setValueForKey(cookiesArray.join('&'), STORAGE_KEY);
        }
        
        // 发送精简通知
        const title = isNewCookie ? "✅ 什么值得买 Cookie已添加" : "🔄 什么值得买 Cookie已存在";
        const subtitle = `账号${accountNumber}`;
        const message = `Cookie: ${newCookie.substring(0, 30)}...`;
        
        $notify(title, subtitle, message);
        
        // 自动复制当前Cookie
        if (typeof $tool !== 'undefined' && $tool.copy) {
            $tool.copy(newCookie);
            console.log('[SMZDM] Cookie已复制到剪贴板');
        }
    }
})();