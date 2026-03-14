/*
[MITM]
hostname = mcs-mimp-web.sf-express.com

[rewrite_local]
# 顺丰活动完整URL捕获（换行分隔）
^https:\/\/mcs-mimp-web\.sf-express\.com\/mcs-mimp\/share\/weChat\/activityRedirect url script-request-header https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/sf.js
*/
// sf_url.js - 捕获顺丰活动完整URL并管理多账号（换行分隔，最新替换旧版）
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
        
        // 从URL中提取unionId作为账号唯一标识
        let accountId = 'unknown';
        try {
            const urlObj = new URL(fullUrl);
            // 优先使用unionId作为唯一标识，如果不存在则尝试其他参数
            accountId = urlObj.searchParams.get('unionId') || 
                       urlObj.searchParams.get('openId') || 
                       urlObj.searchParams.get('memId') || 
                       urlObj.searchParams.get('mobile') ||
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
        let urlsArray = storedUrls ? storedUrls.split('\n').filter(u => u.trim() !== '') : [];
        
        // 检查是否已存在相同accountId的URL
        let isNewAccount = true;
        let existingIndex = -1;
        
        // 遍历现有URL，查找相同账号标识的条目
        for (let i = 0; i < urlsArray.length; i++) {
            // 检查当前URL是否包含相同的accountId
            if (accountId !== 'unknown' && urlsArray[i].includes(accountId)) {
                isNewAccount = false;
                existingIndex = i;
                break;
            }
        }
        
        if (isNewAccount) {
            // 新账号，添加到数组末尾
            urlsArray.push(newUrl);
            console.log(`[SF] 添加新账号，当前总数: ${urlsArray.length}`);
        } else {
            // 已有账号，替换旧数据（最新的替换以前的）
            urlsArray[existingIndex] = newUrl;
            console.log(`[SF] 更新已有账号，索引: ${existingIndex}`);
        }
        
        // 保存到BoxJS，用换行分隔
        $prefs.setValueForKey(urlsArray.join('\n'), STORAGE_KEY);
        
        // 发送精简通知
        const title = isNewAccount ? "✅ SF活动链接已添加" : "🔄 SF活动链接已更新";
        const subtitle = `账号: ${accountId.substring(0, 15)}...`;
        const message = `当前账号数: ${urlsArray.length}`;
        
        $notify(title, subtitle, message);
        
        // 自动复制当前URL
        if (typeof $tool !== 'undefined' && $tool.copy) {
            $tool.copy(newUrl);
            console.log('[SF] 完整URL已复制到剪贴板');
        }
        
        // 打印当前所有账号数量
        console.log(`[SF] 当前共 ${urlsArray.length} 个账号`);
    }
})();