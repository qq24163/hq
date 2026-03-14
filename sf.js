/*
[MITM]
hostname = mcs-mimp-web.sf-express.com

[rewrite_local]
# 顺丰活动完整URL捕获（换行分隔）
^https:\/\/mcs-mimp-web\.sf-express\.com\/mcs-mimp\/share\/weChat\/activityRedirect url script-request-header https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/sf.js
*/
// sf_url.js - 捕获顺丰活动完整URL，基于unionId管理多账号
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
        
        // 从URL中提取unionId作为唯一标识
        let unionId = '';
        try {
            const urlObj = new URL(fullUrl);
            unionId = urlObj.searchParams.get('unionId');
            
            if (!unionId) {
                console.log('[SF] URL中未找到unionId参数');
                $done({});
                return;
            }
            
            console.log(`[SF] 提取到unionId: ${unionId.substring(0, 30)}...`);
        } catch (e) {
            console.log('[SF] 解析URL失败:', e);
            $done({});
            return;
        }
        
        // 管理多账号
        manageSfUrls(unionId, fullUrl);
        
    } catch (error) {
        console.log(`[SF] 错误: ${error}`);
    }
    
    $done({});
    
    function manageSfUrls(unionId, newUrl) {
        const STORAGE_KEY = 'sf';
        const storedUrls = $prefs.valueForKey(STORAGE_KEY) || '';
        let urlsArray = storedUrls ? storedUrls.split('\n').filter(u => u.trim() !== '') : [];
        
        // 查找是否已存在相同unionId的URL
        let existingIndex = -1;
        
        for (let i = 0; i < urlsArray.length; i++) {
            // 从存储的URL中提取unionId进行比较
            try {
                const urlObj = new URL(urlsArray[i]);
                const storedUnionId = urlObj.searchParams.get('unionId');
                
                if (storedUnionId === unionId) {
                    existingIndex = i;
                    console.log(`[SF] 找到相同unionId的旧URL，索引: ${i}`);
                    break;
                }
            } catch (e) {
                // 如果解析失败，跳过这条记录
                console.log(`[SF] 解析存储URL失败，跳过索引: ${i}`);
                continue;
            }
        }
        
        if (existingIndex === -1) {
            // 新unionId，添加到数组末尾
            urlsArray.push(newUrl);
            console.log(`[SF] 添加新unionId账号，当前总数: ${urlsArray.length}`);
        } else {
            // 已存在unionId，替换旧URL（最新的替换以前的）
            urlsArray[existingIndex] = newUrl;
            console.log(`[SF] 更新已有unionId账号，索引: ${existingIndex}`);
        }
        
        // 保存到BoxJS，用换行分隔
        $prefs.setValueForKey(urlsArray.join('\n'), STORAGE_KEY);
        
        // 发送精简通知
        const title = existingIndex === -1 ? "✅ SF活动链接已添加" : "🔄 SF活动链接已更新";
        const subtitle = `unionId: ${unionId.substring(0, 15)}...`;
        const message = `当前账号数: ${urlsArray.length}`;
        
        $notify(title, subtitle, message);
        
        // 自动复制当前URL
        if (typeof $tool !== 'undefined' && $tool.copy) {
            $tool.copy(newUrl);
            console.log('[SF] 完整URL已复制到剪贴板');
        }
        
        console.log(`[SF] 当前共 ${urlsArray.length} 个账号`);
    }
})();
