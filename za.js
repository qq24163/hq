/*
[MITM]
hostname = ihealth.zhongan.com

[rewrite_local]
# 众安健康信息捕获
^https:\/\/ihealth\.zhongan\.com\/api\/lemon\/v1\/personalCenter\/obtainPersonalBaseInfo\/c20195660470001 url script-response-header https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/za.js
*/
// za.js - 捕获众安健康请求头中的Access-Token和响应头中的Set-Cookie
(function() {
    'use strict';
    
    const STORAGE_KEY = 'za';
    const TARGET_URL = 'https://ihealth.zhongan.com/api/lemon/v1/personalCenter/obtainPersonalBaseInfo/c20195660470001';
    
    // 检查是否是目标URL
    if (!$request || !$request.url.indexOf(TARGET_URL) === -1) {
        $done({});
        return;
    }
    
    try {
        // 1. 从请求头中获取Access-Token
        const requestHeaders = $request.headers;
        if (!requestHeaders) {
            console.log('[ZA] 请求头部为空');
            $done({});
            return;
        }
        
        // 获取Access-Token（注意大小写）
        let accessToken = requestHeaders['Access-Token'] || requestHeaders['access-token'] || requestHeaders['Access_Token'];
        if (!accessToken) {
            console.log('[ZA] 未找到Access-Token头部');
            $done({});
            return;
        }
        
        console.log(`[ZA] 捕获到Access-Token: ${accessToken.substring(0, 30)}...`);
        
        // 2. 从响应头中获取Set-Cookie
        const responseHeaders = $response.headers;
        if (!responseHeaders) {
            console.log('[ZA] 响应头部为空');
            $done({});
            return;
        }
        
        // 获取Set-Cookie（可能是字符串或数组）
        let setCookies = responseHeaders['Set-Cookie'] || responseHeaders['set-cookie'];
        if (!setCookies) {
            console.log('[ZA] 未找到Set-Cookie头部');
            $done({});
            return;
        }
        
        // 确保是数组
        if (!Array.isArray(setCookies)) {
            setCookies = [setCookies];
        }
        
        console.log(`[ZA] 捕获到${setCookies.length}个Set-Cookie`);
        
        // 合并所有Set-Cookie（用;分隔）
        let allCookies = setCookies.join('; ');
        
        // 提取关键的cookie值（可选：只保留需要的字段）
        // 如果需要精简，可以提取特定cookie，这里保存完整cookie
        console.log(`[ZA] Set-Cookie: ${allCookies.substring(0, 100)}...`);
        
        // 格式化数据：token&cookie
        const newData = `${accessToken}&${allCookies}`;
        
        // 管理多账号
        manageZaData(accessToken, allCookies, newData);
        
    } catch (error) {
        console.log(`[ZA] 错误: ${error}`);
    }
    
    $done({});
    
    function manageZaData(token, cookie, newData) {
        // 获取已存储的数据
        let storedData = $prefs.valueForKey(STORAGE_KEY) || '';
        console.log(`[ZA] 原始存储数据: ${storedData.substring(0, 100)}...`);
        
        // 解析现有的数据（按@分隔）
        let dataArray = [];
        if (storedData) {
            // 按@分割，过滤空项
            const items = storedData.split('@');
            for (let item of items) {
                const trimmedItem = item.trim();
                if (trimmedItem !== '') {
                    dataArray.push(trimmedItem);
                }
            }
        }
        
        console.log(`[ZA] 当前存储 ${dataArray.length} 条记录`);
        
        // 检查是否已存在相同的token
        let existingIndex = -1;
        let oldCookie = '';
        
        for (let i = 0; i < dataArray.length; i++) {
            const item = dataArray[i];
            // 提取&之前的token
            const andIndex = item.indexOf('&');
            if (andIndex !== -1) {
                const storedToken = item.substring(0, andIndex);
                if (storedToken === token) {
                    existingIndex = i;
                    oldCookie = item.substring(andIndex + 1);
                    console.log(`[ZA] 找到相同token，索引: ${i}`);
                    break;
                }
            }
        }
        
        let action = '';
        
        if (existingIndex === -1) {
            // 新的token，添加到数组末尾
            dataArray.push(newData);
            action = '添加';
            console.log(`[ZA] 添加新账号，token: ${token.substring(0, 20)}...`);
        } else {
            // 已存在token，更新cookie
            dataArray[existingIndex] = newData;
            action = '更新';
            console.log(`[ZA] 更新已有账号的cookie，token: ${token.substring(0, 20)}...`);
        }
        
        // 保存到BoxJS，用@分隔
        const newStoredData = dataArray.join('@');
        $prefs.setValueForKey(newStoredData, STORAGE_KEY);
        
        // 发送通知
        const title = action === '添加' ? "✅ 众安健康账号已添加" : "🔄 众安健康Cookie已更新";
        const subtitle = `Token: ${token.substring(0, 15)}...`;
        const message = `当前账号数: ${dataArray.length}`;
        
        $notify(title, subtitle, message);
        
        // 自动复制当前数据到剪贴板
        if (typeof $tool !== 'undefined' && $tool.copy) {
            $tool.copy(newData);
            console.log('[ZA] 数据已复制到剪贴板');
        }
        
        console.log(`[ZA] 保存成功，当前共 ${dataArray.length} 个账号`);
        console.log(`[ZA] 存储格式: token&cookie@token&cookie`);
        dataArray.forEach((item, index) => {
            const andIndex = item.indexOf('&');
            const tkn = andIndex !== -1 ? item.substring(0, andIndex) : 'unknown';
            console.log(`  ${index + 1}. token: ${tkn.substring(0, 30)}...`);
        });
    }
})();