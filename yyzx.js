/*
-------------- Quantumult X 配置 --------------

[MITM]
hostname = n05.sentezhenxuan.com

[rewrite_local]
^https?:\/\/n05\.sentezhenxuan\.com\/api\/user url script-response-body https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/yyzx.js
*/
// capture-yyzx.js - 捕获Authorization并存储
(function() {
    'use strict';
    
    const url = $request.url;
    
    // 检查是否是目标URL
    if (!url.includes('n05.sentezhenxuan.com/api/user')) {
        $done({});
        return;
    }
    
    try {
        // 获取请求头中的Authorization
        const headers = $request.headers;
        const authorization = headers['Authorization'] || headers['authorization'];
        
        if (!authorization) {
            console.log('[YYZX] 未找到Authorization头部');
            $done({});
            return;
        }
        
        console.log(`[YYZX] 捕获到Token: ${authorization.substring(0, 30)}...`);
        
        // 多账号管理
        const storedData = $prefs.valueForKey('YYZX') || '';
        let tokensArray = storedData ? storedData.split('\n').filter(t => t.trim() !== '') : [];
        
        let isDuplicate = false;
        let tokenIndex = -1;
        
        // 检查是否已存在相同的token
        for (let i = 0; i < tokensArray.length; i++) {
            const token = tokensArray[i];
            const existingToken = token.split('#').slice(1).join('#');
            if (existingToken === authorization) {
                isDuplicate = true;
                tokenIndex = i;
                break;
            }
        }
        
        if (isDuplicate) {
            // 重复token，精简通知
            $notify("🔄 YYZX Token重复", `账号 ${tokenIndex + 1}`, "Token已存在，无需重复添加");
            console.log(`[YYZX] Token重复，位置: ${tokenIndex + 1}`);
        } else {
            // 新token，添加到数组
            const newIndex = tokensArray.length + 1;
            const newTokenData = `${newIndex}#${authorization}`;
            tokensArray.push(newTokenData);
            
            // 保存数据
            const newDataString = tokensArray.join('\n');
            $prefs.setValueForKey(newDataString, 'YYZX');
            
            // 精简通知
            $notify("✅ YYZX Token已保存", `账号 ${newIndex}`, `Token: ${authorization.substring(0, 15)}...`);
            console.log(`[YYZX] 新Token已保存为账号 ${newIndex}`);
        }
        
    } catch (error) {
        console.log(`[YYZX] 错误: ${error}`);
    }
    
    $done({});
})();
