/*
-------------- Quantumult X 配置 --------------

[MITM]
hostname = lm.api.sujh.net

[rewrite_local]
# lvyanzi Authorization 捕获
^https:\/\/lm\.api\.sujh\.net\/app\/score\/index\?platform=1 url script-request-header https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/lvyz.js
*/
// lvyz.js - 捕获 lvyanzi 的 Authorization（需要先判断 Appid）
(function() {
    'use strict';
    
    const TARGET_URL = 'https://lm.api.sujh.net/app/score/index?platform=1';
    const TARGET_APPID = 'lvyanzi';
    const STORAGE_KEY = 'lvyz';
    
    // 检查是否是目标URL
    if (!$request || $request.url.indexOf(TARGET_URL) === -1) {
        $done({});
        return;
    }
    
    try {
        // 获取请求头中的 Appid 和 Authorization
        const appid = $request.headers['Appid'] || $request.headers['appid'] || 
                      $request.headers['AppId'] || $request.headers['appId'];
        const authorization = $request.headers['Authorization'] || $request.headers['authorization'];
        
        // 打印调试信息
        console.log(`[LVYZ] 捕获到 Appid: ${appid}`);
        console.log(`[LVYZ] Authorization 是否存在: ${!!authorization}`);
        
        // 判断 Appid 是否为 lvyanzi
        if (!appid || appid.toLowerCase() !== TARGET_APPID) {
            console.log(`[LVYZ] Appid 不是 ${TARGET_APPID}，跳过捕获 (当前: ${appid})`);
            $done({});
            return;
        }
        
        if (!authorization) {
            console.log('[LVYZ] 未找到 Authorization');
            $done({});
            return;
        }
        
        console.log(`[LVYZ] 捕获到 Authorization: ${authorization.substring(0, 30)}...`);
        
        // 管理多账号
        function manageLVYZToken(newAuthorization) {
            const storedData = $prefs.valueForKey(STORAGE_KEY) || '';
            let tokensArray = storedData ? storedData.split('&').filter(t => t.trim() !== '') : [];
            
            // 检查是否已存在相同 Authorization
            let isNewToken = true;
            let accountNumber = tokensArray.length + 1;
            
            for (let i = 0; i < tokensArray.length; i++) {
                if (tokensArray[i] === newAuthorization) {
                    isNewToken = false;
                    accountNumber = i + 1;
                    break;
                }
            }
            
            if (isNewToken) {
                tokensArray.push(newAuthorization);
                $prefs.setValueForKey(tokensArray.join('&'), STORAGE_KEY);
            }
            
            // 发送通知
            const title = isNewToken ? "✅ lvyanzi Authorization已添加" : "🔄 lvyanzi Authorization已存在";
            const subtitle = `账号${accountNumber}`;
            const message = `Authorization: ${newAuthorization.substring(0, 25)}...`;
            
            $notify(title, subtitle, message);
            
            // 自动复制当前 Authorization
            if (typeof $tool !== 'undefined' && $tool.copy) {
                $tool.copy(newAuthorization);
                console.log('[LVYZ] Authorization已复制到剪贴板');
            }
            
            console.log(`[LVYZ] 当前共存储 ${tokensArray.length} 个账号的Authorization`);
        }
        
        manageLVYZToken(authorization);
        
    } catch (error) {
        console.log(`[LVYZ] 错误: ${error}`);
    }
    
    $done({});
})();