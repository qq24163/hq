/*
[MITM]
hostname = mcs-mimp-web.sf-express.com

[rewrite_local]
# 顺丰活动完整URL捕获
^https:\/\/mcs-mimp-web\.sf-express\.com\/mcs-mimp\/share\/weChat\/activityRedirect url script-request-header https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/sf.js
*/
// sf_url.js - 捕获顺丰活动完整URL并管理多账号
(function() {
    'use strict';
    
    const TARGET_URL = 'https://mcs-mimp-web.sf-express.com/mcs-mimp/share/weChat/activityRedirect';
    
    // 检查是否是目标URL
    if (!$request || !$request.url.includes(TARGET_URL)) {
        $done({});
        return;
    }
    
    try {
        // 获取完整URL
        const fullUrl = $request.url;
        
        console.log(`[SF] 捕获到完整URL，长度: ${fullUrl.length}`);
        console.log(`[SF] URL预览: ${fullUrl.substring(0, 100)}...`);
        
        // 从URL中提取unionId作为账号唯一标识（也可根据需要改为其他参数）
        let accountId = 'unknown';
        try {
            const urlObj = new URL(fullUrl);
            accountId = urlObj.searchParams.get('unionId') || 
                       urlObj.searchParams.get('openId') || 
                       urlObj.searchParams.get('memId') || 
                       'unknown';
            console.log(`[SF] 账号标识: ${accountId.substring(0, 20)}...`);
        } catch (e) {
            console.log('[SF] 解析URL参数失败');
        }
        
        // 管理多账号
        manageSfUrls(accountId, fullUrl);
        
    } catch (error) {
        console.log(`[SF] 错误: ${error}`);
    }
    
    $done({});
    
    function manageSfUrls(accountId, newUrl) {
        const STORAGE_KEY = 'sf';
        const storedUrls = $prefs.valueForKey(STORAGE_KEY) || '';
        let urlsArray = storedUrls ? storedUrls.split('&').filter(u => u.trim() !== '') : [];
        
        // 检查是否已存在相同accountId的URL
        let isNewUrl = true;
        let existingIndex = -1;
        
        // 简单去重策略：基于accountId判断
        // 如果不想去重，可以注释掉这部分，每次都添加
        for (let i = 0; i < urlsArray.length; i++) {
            if (urlsArray[i].includes(accountId) && accountId !== 'unknown') {
                isNewUrl = false;
                existingIndex = i;
                break;
            }
        }
        
        if (isNewUrl) {
            // 新URL，添加到数组
            urlsArray.push(newUrl);
            console.log(`[SF] 添加新URL，当前总数: ${urlsArray.length}`);
        } else {
            // 更新已有URL
            urlsArray[existingIndex] = newUrl;
            console.log(`[SF] 更新已有URL，索引: ${existingIndex}`);
        }
        
        // 保存到BoxJS，用&分隔
        $prefs.setValueForKey(urlsArray.join('&'), STORAGE_KEY);
        
        // 发送精简通知
        const title = isNewUrl ? "✅ SF活动链接已添加" : "🔄 SF活动链接已更新";
        const subtitle = `账号ID: ${accountId.substring(0, 15)}...`;
        const message = `当前链接数: ${urlsArray.length}`;
        
        $notify(title, subtitle, message);
        
        // 自动复制当前URL
        if (typeof $tool !== 'undefined' && $tool.copy) {
            $tool.copy(newUrl);
            console.log('[SF] 完整URL已复制到剪贴板');
        }
    }
})();
