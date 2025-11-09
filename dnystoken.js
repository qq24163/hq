/*
-------------- Quantumult X 配置 --------------

[MITM]
hostname = api.digital4danone.com.cn

[rewrite_local]
^https:\/\/api\.digital4danone\.com\.cn\/healthyaging\/danone\/wx\/config\/eventReport url script-request-body https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/dnystoken.js
*/
// capture-dnystoken-debug.js - 调试版本
(function() {
    'use strict';
    
    const url = $request.url;
    
    if (!url.includes('api.digital4danone.com.cn/healthyaging/danone/wx/config/eventReport')) {
        $done({});
        return;
    }
    
    try {
        const headers = $request.headers;
        const body = $request.body;
        
        console.log('[DNYSTOKEN] 开始捕获数据...');
        
        // 调试：输出所有请求头
        console.log('[DNYSTOKEN] 请求头:', JSON.stringify(headers, null, 2));
        
        // 从请求头获取X-Access-Token
        const xAccessToken = headers['X-Access-Token'] || headers['x-access-token'];
        console.log(`[DNYSTOKEN] X-Access-Token: ${xAccessToken ? xAccessToken.substring(0, 20) + '...' : '未找到'}`);
        
        let openId = '';
        let unionId = '';
        
        // 从JSON请求体获取openId和unionId
        if (body) {
            console.log('[DNYSTOKEN] 原始请求体:', body);
            
            try {
                const jsonBody = JSON.parse(body);
                console.log('[DNYSTOKEN] 解析后的JSON:', JSON.stringify(jsonBody, null, 2));
                
                openId = jsonBody.openId || '';
                unionId = jsonBody.unionId || '';
                
                console.log(`[DNYSTOKEN] openId: ${openId || '未找到'}`);
                console.log(`[DNYSTOKEN] unionId: ${unionId || '未找到'}`);
                
            } catch (e) {
                console.log('[DNYSTOKEN] JSON解析失败:', e);
            }
        } else {
            console.log('[DNYSTOKEN] 无请求体数据');
        }
        
        // 检查是否有有效数据
        if (!xAccessToken && !openId && !unionId) {
            console.log('[DNYSTOKEN] 未找到任何有效参数');
            $done({});
            return;
        }
        
        // 构建备注格式的组合
        const tokenCombination = `#${xAccessToken || ''}#${openId}#${unionId}`;
        
        console.log(`[DNYSTOKEN] 最终组合: ${tokenCombination}`);
        
        // 保存到BoxJS
        $prefs.setValueForKey(tokenCombination, 'dnystoken_current');
        
        // 多账号管理（换行分隔）
        const storedTokens = $prefs.valueForKey('DNYSTOKEN') || '';
        let tokensArray = storedTokens ? storedTokens.split('\n').filter(t => t.trim() !== '') : [];
        
        const isNewToken = !tokensArray.includes(tokenCombination);
        
        if (isNewToken) {
            // 新token，添加到数组
            if (tokensArray.length >= 10) {
                tokensArray.shift(); // 移除最早的账号
            }
            tokensArray.push(tokenCombination);
            
            // 保存用换行分隔的字符串，并添加序号备注
            const numberedTokens = tokensArray.map((token, index) => {
                return `${index + 1}${token}`;
            });
            
            const newTokensString = numberedTokens.join('\n');
            $prefs.setValueForKey(newTokensString, 'DNYSTOKEN');
        }
        
        // 单条通知
        $notify(
            isNewToken ? "✅ 新DNYSTOKEN" : "🔄 DNYSTOKEN",
            `账号数: ${tokensArray.length}`,
            `组合: ${tokenCombination.substring(0, 25)}...`
        );
        
        $tool.copy(tokenCombination);
        
    } catch (error) {
        console.log(`[DNYSTOKEN] 全局错误: ${error}`);
    }
    
    $done({});
})();
