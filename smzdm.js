/*
-------------- Quantumult X 配置 --------------

[MITM]
hostname = user-api.smzdm.com

[rewrite_local]
# 什么值得买 Cookie 捕获
^https:\/\/user-api\.smzdm\.com\/info\/core url script-request-header https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/smzdm.js
*/
// smzdm.js - 捕获什么值得买 Cookie 并管理多账号（&分隔格式）
(function() {
    'use strict';
    
    const TARGET_URL = 'https://user-api.smzdm.com/info/core';
    
    // 检查是否是目标URL
    if (!$request || $request.url.indexOf(TARGET_URL) === -1) {
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
        
        // 提取 smzdm_id 用于去重判断（更精确）
        const smzdmIdMatch = newCookie.match(/smzdm_id=(\d+)/);
        const newSmzdmId = smzdmIdMatch ? smzdmIdMatch[1] : null;
        
        let isNewCookie = true;
        let accountNumber = cookiesArray.length + 1;
        
        if (newSmzdmId) {
            // 通过 smzdm_id 去重
            for (let i = 0; i < cookiesArray.length; i++) {
                const existingIdMatch = cookiesArray[i].match(/smzdm_id=(\d+)/);
                const existingId = existingIdMatch ? existingIdMatch[1] : null;
                if (existingId === newSmzdmId) {
                    isNewCookie = false;
                    accountNumber = i + 1;
                    // 更新为最新的Cookie（替换旧的）
                    cookiesArray[i] = newCookie;
                    break;
                }
            }
        } else {
            // 如果没有smzdm_id，则用完整字符串去重
            for (let i = 0; i < cookiesArray.length; i++) {
                if (cookiesArray[i] === newCookie) {
                    isNewCookie = false;
                    accountNumber = i + 1;
                    break;
                }
            }
        }
        
        if (isNewCookie) {
            // 新Cookie，添加到数组
            cookiesArray.push(newCookie);
        }
        
        // 保存到BoxJS，用&分隔（简单字符串格式）
        $prefs.setValueForKey(cookiesArray.join('&'), STORAGE_KEY);
        
        // 发送通知
        const title = isNewCookie ? "✅ 什么值得买 Cookie已添加" : "🔄 什么值得买 Cookie已更新";
        const subtitle = `账号${accountNumber} (smzdm_id: ${newSmzdmId || '未知'})`;
        const message = `Cookie长度: ${newCookie.length} 字符`;
        
        $notify(title, subtitle, message);
        
        // 自动复制当前Cookie
        if (typeof $tool !== 'undefined' && $tool.copy) {
            $tool.copy(newCookie);
            console.log('[SMZDM] Cookie已复制到剪贴板');
        }
        
        console.log(`[SMZDM] 当前共存储 ${cookiesArray.length} 个账号的Cookie`);
    }
})();