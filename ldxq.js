/*
-------------- Quantumult X 配置 --------------

[MITM]
hostname = lvdong.fzjingzhou.com

[rewrite_local]
^https:\/\/lvdong\.fzjingzhou\.com\/api\/Index\/index url script-request-body https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/cxktoken.js
*/
// capture-ldxqtoken.js - 捕获token存储到LDXQTOKEN
(function() {
    'use strict';
    
    const url = $request.url;
    
    // 检查是否是目标URL
    if (!url.includes('lvdong.fzjingzhou.com/api/Index/index')) {
        $done({});
        return;
    }
    
    try {
        const body = $request.body;
        
        if (!body) {
            console.log('[LDXQTOKEN] 无请求体数据');
            $done({});
            return;
        }
        
        let tokenValue = null;
        
        // 解析表单数据获取token
        try {
            const params = new URLSearchParams(body);
            tokenValue = params.get('token');
            
            if (!tokenValue) {
                console.log('[LDXQTOKEN] 未找到token参数');
                $done({});
                return;
            }
            
        } catch (e) {
            console.log('[LDXQTOKEN] 表单解析失败:', e);
            $done({});
            return;
        }
        
        console.log(`[LDXQTOKEN] 捕获到token: ${tokenValue}`);
        
        // 保存到BoxJS
        $prefs.setValueForKey(tokenValue, 'ldxqtoken_current');
        
        // 多账号管理（&分隔）
        const storedTokens = $prefs.valueForKey('LDXQTOKEN') || '';
        let tokensArray = storedTokens ? storedTokens.split('&').filter(t => t.trim() !== '') : [];
        
        const isNewToken = !tokensArray.includes(tokenValue);
        
        if (isNewToken) {
            // 新token，添加到数组
            if (tokensArray.length >= 10) {
                tokensArray.shift(); // 移除最早的账号
            }
            tokensArray.push(tokenValue);
            
            // 保存用&分隔的字符串
            const newTokensString = tokensArray.join('&');
            $prefs.setValueForKey(newTokensString, 'LDXQTOKEN');
        }
        
        // 单条精简通知
        $notify(
            isNewToken ? "✅ 新LDXQTOKEN" : "🔄 LDXQTOKEN",
            `账号数: ${tokensArray.length}`,
            `Token: ${tokenValue.substring(0, 15)}...`
        );
        
        // 自动复制当前token
        if (typeof $tool !== 'undefined' && $tool.copy) {
            $tool.copy(tokenValue);
        }
        
    } catch (error) {
        console.log(`[LDXQTOKEN] 错误: ${error}`);
    }
    
    $done({});
})();
