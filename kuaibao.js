/*
-------------- Quantumult X 配置 --------------

[MITM]
hostname = vues.dd1x.cn

[rewrite_local]
# 快报平台 token 捕获
^https:\/\/vues\.dd1x\.cn\/api\/kuaibao\/login\/wx_login\?code= url script-response-body https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/kuaibao.js
*/
// kuaibao.js - 捕获快报平台的 token
(function() {
    'use strict';
    
    const TARGET_URL = 'https://vues.dd1x.cn/api/kuaibao/login/wx_login';
    const STORAGE_KEY = 'kuaibao';
    
    // 检查是否是目标URL
    if (!$response || $response.url.indexOf(TARGET_URL) === -1) {
        $done({});
        return;
    }
    
    try {
        const body = $response.body;
        if (!body) {
            console.log('[KUAIBAO] 响应体为空');
            $done({});
            return;
        }
        
        console.log('[KUAIBAO] 响应体: ' + body.substring(0, 200) + '...');
        
        const responseData = JSON.parse(body);
        
        // 检查响应是否成功 (code为0表示成功)
        if (responseData.code !== 0 || !responseData.data || !responseData.data.token) {
            console.log('[KUAIBAO] 响应中没有token或code不为0');
            $done({});
            return;
        }
        
        const token = responseData.data.token;
        const openid = responseData.data.openid || '未知';
        const mid = responseData.data.mid || '未知';
        
        console.log(`[KUAIBAO] 捕获到 token: ${token.substring(0, 30)}...`);
        console.log(`[KUAIBAO] openid: ${openid}`);
        console.log(`[KUAIBAO] mid: ${mid}`);
        
        // 管理多账号
        function manageKuaibaoToken(newToken) {
            const storedData = $prefs.valueForKey(STORAGE_KEY) || '';
            let tokensArray = storedData ? storedData.split('&').filter(t => t.trim() !== '') : [];
            
            // 检查是否已存在相同 token
            let isNewToken = true;
            let accountNumber = tokensArray.length + 1;
            
            for (let i = 0; i < tokensArray.length; i++) {
                if (tokensArray[i] === newToken) {
                    isNewToken = false;
                    accountNumber = i + 1;
                    break;
                }
            }
            
            if (isNewToken) {
                tokensArray.push(newToken);
                $prefs.setValueForKey(tokensArray.join('&'), STORAGE_KEY);
            }
            
            // 发送通知
            const title = isNewToken ? "✅ 快报平台 token已添加" : "🔄 快报平台 token已存在";
            const subtitle = `账号${accountNumber}`;
            const message = `Token: ${newToken.substring(0, 25)}...\nopenid: ${openid}`;
            
            $notify(title, subtitle, message);
            
            // 自动复制当前 token
            if (typeof $tool !== 'undefined' && $tool.copy) {
                $tool.copy(newToken);
                console.log('[KUAIBAO] token已复制到剪贴板');
            }
            
            console.log(`[KUAIBAO] 当前共存储 ${tokensArray.length} 个账号的token`);
        }
        
        manageKuaibaoToken(token);
        
    } catch (error) {
        console.log(`[KUAIBAO] 错误: ${error}`);
    }
    
    $done({});
})();