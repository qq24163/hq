/*
[MITM]
hostname = msmarket.msx.digitalyili.com

[rewrite_local]
# 伊利用户信息接口数据捕获
^https:\/\/msmarket\.msx\.digitalyili\.com\/gateway\/api\/auth\/account\/user\/info url script-request-header https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/yili.js

# 同时捕获响应体
^https:\/\/msmarket\.msx\.digitalyili\.com\/gateway\/api\/auth\/account\/user\/info url script-response-body https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/yili.js
/*
// yili_user.js - 捕获伊利用户信息接口的access-token和手机号
(function() {
    'use strict';
    
    const TARGET_URL = 'https://msmarket.msx.digitalyili.com/gateway/api/auth/account/user/info';
    
    // 检查是否是目标URL
    if (!$request || !$request.url.includes(TARGET_URL)) {
        $done({});
        return;
    }
    
    console.log('[YILI] 匹配到用户信息接口');
    
    try {
        // 1. 从请求头部获取access-token
        const headers = $request.headers;
        let accessToken = headers['access-token'] || headers['Access-Token'] || 
                         headers['accessToken'] || headers['AccessToken'] ||
                         headers['authorization'] || headers['Authorization'];
        
        if (!accessToken) {
            console.log('[YILI] 未找到access-token');
            $done({});
            return;
        }
        
        // 清理可能的Bearer前缀
        if (accessToken.startsWith('Bearer ')) {
            accessToken = accessToken.substring(7);
        } else if (accessToken.startsWith('bearer ')) {
            accessToken = accessToken.substring(7);
        }
        
        console.log(`[YILI] 捕获到access-token: ${accessToken.substring(0, 20)}...`);
        
        // 2. 从响应体中获取手机号和昵称
        const response = $response.body;
        if (!response) {
            console.log('[YILI] 响应体为空');
            $done({});
            return;
        }
        
        let mobile = '';
        let nickName = '';
        
        try {
            const data = JSON.parse(response);
            if (data.data && data.status === true) {
                mobile = data.data.mobile || data.data.phone || '';
                nickName = data.data.nickName || data.data.nickname || '';
                
                console.log(`[YILI] 捕获到手机号: ${mobile}`);
                console.log(`[YILI] 捕获到昵称: ${nickName}`);
            } else {
                console.log('[YILI] 接口返回失败，可能token无效');
                $notify("⚠️ 伊利Token无效", "", "请检查token是否已过期");
                $done({});
                return;
            }
        } catch (e) {
            console.log('[YILI] 解析响应体失败:', e);
            $done({});
            return;
        }
        
        if (!mobile) {
            console.log('[YILI] 未找到手机号');
            $done({});
            return;
        }
        
        // 3. 管理多账号存储
        manageYiliAccounts(mobile, accessToken);
        
    } catch (error) {
        console.log(`[YILI] 错误: ${error}`);
    }
    
    $done({});
    
    function manageYiliAccounts(mobile, token) {
        const STORAGE_KEY = 'YILI';
        const storedData = $prefs.valueForKey(STORAGE_KEY) || '';
        let accountsArray = storedData ? storedData.split('\n').filter(a => a.trim() !== '') : [];
        
        // 格式：mobile#access-token
        const accountData = `${mobile}#${token}`;
        
        // 检查是否已存在相同手机号的账号
        let isNewAccount = true;
        let accountIndex = -1;
        
        for (let i = 0; i < accountsArray.length; i++) {
            const existingMobile = accountsArray[i].split('#')[0];
            if (existingMobile === mobile) {
                isNewAccount = false;
                accountIndex = i;
                break;
            }
        }
        
        if (isNewAccount) {
            // 新账号，添加到数组
            accountsArray.push(accountData);
            console.log(`[YILI] 添加新账号: ${mobile}`);
        } else {
            // 更新已有账号
            accountsArray[accountIndex] = accountData;
            console.log(`[YILI] 更新账号: ${mobile}`);
        }
        
        // 保存到BoxJS
        $prefs.setValueForKey(accountsArray.join('\n'), STORAGE_KEY);
        
        // 发送精简通知
        const title = isNewAccount ? "✅ 伊利账号已添加" : "🔄 伊利账号已更新";
        const subtitle = `手机号: ${mobile}`;
        const message = `Token: ${token.substring(0, 15)}...`;
        
        $notify(title, subtitle, message);
        
        // 自动复制当前账号数据
        if (typeof $tool !== 'undefined' && $tool.copy) {
            $tool.copy(accountData);
            console.log('[YILI] 账号数据已复制到剪贴板');
        }
    }
})();