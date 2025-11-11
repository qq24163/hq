/*
-------------- Quantumult X 配置 --------------

[MITM]
hostname = n05.sentezhenxuan.com

[rewrite_local]
^https?:\/\/n05\.sentezhenxuan\.com\/api\/user url script-response-body https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/sxsgtoken.js
*/
// capture-sxsgtoken.js - 捕获Authorization和昵称并格式化存储
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
            console.log('[SXSGTOKEN] 未找到Authorization头部');
            $done({});
            return;
        }
        
        // 获取响应体中的昵称
        const body = JSON.parse($response.body);
        if (!body.data || !body.data.nickname) {
            console.log('[SXSGTOKEN] 未找到昵称数据');
            $done({});
            return;
        }
        
        const nickname = body.data.nickname;
        const newTokenData = `${nickname}#${authorization}`;
        
        console.log(`[SXSGTOKEN] 捕获到数据: ${nickname} - ${authorization.substring(0, 20)}...`);
        
        // 保存当前token到BoxJS
        $prefs.setValueForKey(authorization, 'sxsgtoken_current');
        
        // 多账号管理（换行分隔）
        const storedTokens = $prefs.valueForKey('SXSGTOKEN') || '';
        let tokensArray = storedTokens ? storedTokens.split('\n').filter(t => t.trim() !== '') : [];
        
        let isUpdated = false;
        let updatedTokens = [];
        
        // 检查是否已存在该昵称，如果存在则更新
        for (let token of tokensArray) {
            const [existingNickname] = token.split('#');
            if (existingNickname === nickname) {
                // 找到相同昵称，更新数据
                updatedTokens.push(newTokenData);
                isUpdated = true;
            } else {
                updatedTokens.push(token);
            }
        }
        
        // 如果是新昵称，添加到数组
        if (!isUpdated) {
            updatedTokens.push(newTokenData);
        }
        
        // 保存更新后的数据
        const newTokensString = updatedTokens.join('\n');
        $prefs.setValueForKey(newTokensString, 'SXSGTOKEN');
        
        // 单条精简通知
        $notify(
            isUpdated ? "🔄 SXSGTOKEN已更新" : "✅ SXSGTOKEN已保存",
            `账号: ${nickname}`,
            `Token: ${authorization.substring(0, 15)}...\n总账号数: ${updatedTokens.length}`
        );
        
        console.log(`[SXSGTOKEN] ${isUpdated ? '更新' : '新增'}账号数据: ${nickname}`);
        
    } catch (error) {
        console.log(`[SXSGTOKEN] 错误: ${error}`);
        $notify("❌ SXSGTOKEN捕获失败", "处理数据时出错", error.toString());
    }
    
    $done({});
})();
