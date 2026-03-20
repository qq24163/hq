/*
[MITM]
hostname = mcs-mimp-web.sf-express.com

[rewrite_local]
# 顺丰Cookie捕获（从请求头获取）
^https:\/\/mcs-mimp-web\.sf-express\.com\/mcs-mimp\/commonPost\/~memberGoods~pointMallService~goodsList url script-request-header https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/sf.js
*/
// sf_cookie.js - 从请求头中捕获顺丰Cookie并管理多账号
(function() {
    'use strict';
    
    const TARGET_URL = 'https://mcs-mimp-web.sf-express.com/mcs-mimp/commonPost/~memberGoods~pointMallService~goodsList';
    const STORAGE_KEY = 'sf_cookies';
    
    // 检查是否是目标URL
    if (!$request || !$request.url.includes(TARGET_URL)) {
        $done({});
        return;
    }
    
    try {
        // 获取请求头部的Cookie
        const headers = $request.headers;
        if (!headers) {
            console.log('[SF_COOKIE] 请求头部为空');
            $done({});
            return;
        }
        
        // 获取Cookie
        let cookieStr = headers['Cookie'] || headers['cookie'];
        if (!cookieStr) {
            console.log('[SF_COOKIE] 未找到Cookie头部');
            $done({});
            return;
        }
        
        console.log(`[SF_COOKIE] 捕获到Cookie`);
        
        // 提取需要的cookie值
        let sessionId = '';
        let loginUserId = '';
        let loginMobile = '';
        
        // 解析Cookie字符串
        const cookiePairs = cookieStr.split(';').map(item => item.trim());
        
        for (const pair of cookiePairs) {
            if (pair.startsWith('sessionId=')) {
                sessionId = pair.substring('sessionId='.length);
            } else if (pair.startsWith('_login_user_id_=')) {
                loginUserId = pair.substring('_login_user_id_='.length);
            } else if (pair.startsWith('_login_mobile_=')) {
                loginMobile = pair.substring('_login_mobile_='.length);
            }
        }
        
        // 如果没有sessionId，尝试使用JSESSIONID
        if (!sessionId) {
            for (const pair of cookiePairs) {
                if (pair.startsWith('JSESSIONID=')) {
                    sessionId = pair.substring('JSESSIONID='.length);
                    break;
                }
            }
        }
        
        if (!sessionId || !loginUserId || !loginMobile) {
            console.log('[SF_COOKIE] 未找到完整的cookie信息');
            $done({});
            return;
        }
        
        // 格式化为指定格式
        const newCookieData = `sessionId=${sessionId};_login_mobile_=${loginMobile};_login_user_id_=${loginUserId}`;
        console.log(`[SF_COOKIE] 格式化数据: ${newCookieData}`);
        
        // 管理多账号
        manageSfCookies(loginMobile, newCookieData);
        
    } catch (error) {
        console.log(`[SF_COOKIE] 错误: ${error}`);
    }
    
    $done({});
    
    function manageSfCookies(mobile, newCookieData) {
        // 获取已存储的cookies
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
        
        // 发送通知
        const title = existingIndex === -1 ? "✅ SF Cookie已添加" : "🔄 SF Cookie已更新";
        const subtitle = `手机号: ${mobile}`;
        const message = `当前账号数: ${cookiesArray.length}\n格式: ${newCookieData}`;
        
        $notify(title, subtitle, message);
        
        console.log(`[SF_COOKIE] 保存成功，当前共 ${cookiesArray.length} 个账号`);
        console.log(`[SF_COOKIE] 存储格式: ${cookiesArray.join('&')}`);
    }
})();