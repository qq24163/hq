/*
[MITM]
hostname = mcs-mimp-web.sf-express.com

[rewrite_local]
# 顺丰Cookie捕获
^https:\/\/mcs-mimp-web\.sf-express\.com\/mcs-mimp\/share\/weChat\/activityRedirect url script-response-header https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/sf.js
*/
// sf_cookie.js - 捕获顺丰响应头部Set-Cookie并管理多账号
(function() {
    'use strict';
    
    const TARGET_URL = 'https://mcs-mimp-web.sf-express.com/mcs-mimp/share/weChat/activityRedirect';
    
    // 检查是否是目标URL
    if (!$request || !$request.url.includes(TARGET_URL)) {
        $done({});
        return;
    }
    
    try {
        // 获取响应头部
        const headers = $response.headers;
        if (!headers) {
            console.log('[SF_COOKIE] 响应头部为空');
            $done({});
            return;
        }
        
        // 获取Set-Cookie头部（可能是字符串或数组）
        let setCookies = headers['Set-Cookie'] || headers['set-cookie'];
        if (!setCookies) {
            console.log('[SF_COOKIE] 未找到Set-Cookie头部');
            $done({});
            return;
        }
        
        // 确保setCookies是数组
        if (!Array.isArray(setCookies)) {
            setCookies = [setCookies];
        }
        
        console.log(`[SF_COOKIE] 捕获到${setCookies.length}个Cookie`);
        
        // 提取需要的cookie值
        let sessionId = '';
        let loginUserId = '';
        let loginMobile = '';
        
        for (const cookie of setCookies) {
            if (cookie.includes('sessionId=')) {
                const match = cookie.match(/sessionId=([^;]+)/);
                if (match) sessionId = match[1];
            } else if (cookie.includes('_login_user_id_=')) {
                const match = cookie.match(/_login_user_id_=([^;]+)/);
                if (match) loginUserId = match[1];
            } else if (cookie.includes('_login_mobile_=')) {
                const match = cookie.match(/_login_mobile_=([^;]+)/);
                if (match) loginMobile = match[1];
            }
        }
        
        if (!sessionId || !loginUserId || !loginMobile) {
            console.log('[SF_COOKIE] 未找到完整的cookie信息');
            console.log(`[SF_COOKIE] sessionId: ${sessionId}, loginUserId: ${loginUserId}, loginMobile: ${loginMobile}`);
            $done({});
            return;
        }
        
        // 格式化为要求的格式
        const cookieData = `sessionId=${sessionId};_login_mobile_=${loginMobile};_login_user_id_=${loginUserId}`;
        console.log(`[SF_COOKIE] 格式化数据: ${cookieData}`);
        
        // 管理多账号
        manageSfCookies(loginMobile, cookieData);
        
    } catch (error) {
        console.log(`[SF_COOKIE] 错误: ${error}`);
    }
    
    $done({});
    
    function manageSfCookies(mobile, newCookieData) {
        const STORAGE_KEY = 'sf';
        const storedCookies = $prefs.valueForKey(STORAGE_KEY) || '';
        let cookiesArray = storedCookies ? storedCookies.split('&').filter(c => c.trim() !== '') : [];
        
        // 检查是否已存在相同手机号的cookie
        let existingIndex = -1;
        
        for (let i = 0; i < cookiesArray.length; i++) {
            // 从存储的cookie中提取手机号进行比较
            const mobileMatch = cookiesArray[i].match(/_login_mobile_=([^;]+)/);
            if (mobileMatch && mobileMatch[1] === mobile) {
                existingIndex = i;
                console.log(`[SF_COOKIE] 找到相同手机号的旧cookie，索引: ${i}`);
                break;
            }
        }
        
        if (existingIndex === -1) {
            // 新手机号，添加到数组末尾
            cookiesArray.push(newCookieData);
            console.log(`[SF_COOKIE] 添加新账号，手机号: ${mobile}`);
        } else {
            // 已存在手机号，替换旧cookie
            cookiesArray[existingIndex] = newCookieData;
            console.log(`[SF_COOKIE] 更新已有账号，手机号: ${mobile}`);
        }
        
        // 保存到BoxJS，用&分隔
        $prefs.setValueForKey(cookiesArray.join('&'), STORAGE_KEY);
        
        // 发送精简通知
        const title = existingIndex === -1 ? "✅ SF Cookie已添加" : "🔄 SF Cookie已更新";
        const subtitle = `手机号: ${mobile}`;
        const message = `当前账号数: ${cookiesArray.length}`;
        
        $notify(title, subtitle, message);
        
        // 自动复制当前cookie数据
        if (typeof $tool !== 'undefined' && $tool.copy) {
            $tool.copy(newCookieData);
            console.log('[SF_COOKIE] Cookie数据已复制到剪贴板');
        }
        
        console.log(`[SF_COOKIE] 当前共 ${cookiesArray.length} 个账号`);
    }
})();