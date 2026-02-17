/*
[MITM]
hostname = msmarket.msx.digitalyili.com

[rewrite_local]
# 伊利 - 捕获请求头的 access-token
^https:\/\/msmarket\.msx\.digitalyili\.com\/gateway\/api\/auth\/account\/user\/info url script-request-header https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/yili.js

# 伊利 - 处理响应体获取用户信息
^https:\/\/msmarket\.msx\.digitalyili\.com\/gateway\/api\/auth\/account\/user\/info url script-response-body https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/yili.js
*/
// yili_combined.js - 伊利账号捕获合并版
(function() {
    'use strict';
    
    const TARGET_URL = 'https://msmarket.msx.digitalyili.com/gateway/api/auth/account/user/info';
    
    if (!$request || !$request.url.includes(TARGET_URL)) {
        $done({});
        return;
    }
    
    // 判断是请求阶段还是响应阶段
    const isRequest = typeof $response === 'undefined';
    
    try {
        if (isRequest) {
            // 请求阶段：获取 access-token
            const headers = $request.headers;
            let accessToken = headers['access-token'] || headers['Access-Token'] || headers['authorization'] || headers['Authorization'];
            
            if (!accessToken) {
                console.log('[YILI] 未找到 access-token');
                $done({});
                return;
            }
            
            if (accessToken.startsWith('Bearer ')) {
                accessToken = accessToken.substring(7);
            }
            
            console.log(`[YILI] 请求阶段: 捕获到 token`);
            
            // 保存临时 token
            $prefs.setValueForKey(accessToken, 'yili_temp_token');
            
        } else {
            // 响应阶段：获取用户信息
            const accessToken = $prefs.valueForKey('yili_temp_token');
            
            if (!accessToken) {
                console.log('[YILI] 响应阶段: 未找到临时 token');
                $done({});
                return;
            }
            
            const body = $response.body;
            if (!body) {
                console.log('[YILI] 响应体为空');
                $done({});
                return;
            }
            
            const data = JSON.parse(body);
            
            if (!data.status || data.error) {
                console.log('[YILI] 响应状态异常:', data.error?.msg);
                $done({});
                return;
            }
            
            const userData = data.data;
            if (!userData || !userData.mobile) {
                console.log('[YILI] 未找到手机号');
                $done({});
                return;
            }
            
            const mobile = userData.mobile;
            const accountData = `${mobile}#${accessToken}`;
            
            console.log(`[YILI] 响应阶段: ${mobile} 数据准备保存`);
            
            // 保存到 BoxJS
            const STORAGE_KEY = 'yili';
            const storedData = $prefs.valueForKey(STORAGE_KEY) || '';
            let accountsArray = storedData ? storedData.split('\n').filter(a => a.trim() !== '') : [];
            
            let isNew = true;
            for (let i = 0; i < accountsArray.length; i++) {
                if (accountsArray[i].split('#')[0] === mobile) {
                    accountsArray[i] = accountData;
                    isNew = false;
                    break;
                }
            }
            
            if (isNew) {
                accountsArray.push(accountData);
            }
            
            $prefs.setValueForKey(accountsArray.join('\n'), STORAGE_KEY);
            $prefs.removeValueForKey('yili_temp_token');
            
            $notify(
                isNew ? "✅ 伊利账号已添加" : "🔄 伊利账号已更新",
                `手机号: ${mobile}`,
                `Token: ${accessToken.substring(0, 10)}...`
            );
        }
        
    } catch (error) {
        console.log(`[YILI] 错误: ${error}`);
    }
    
    $done({});
})();