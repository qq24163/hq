/*
[MITM]
hostname = infor.leyaoyao.com

[rewrite_local]
# 乐药耀xiaoletoken捕获
^https:\/\/infor\.leyaoyao\.com\/infor\/xiaolelife\/is-show-new-user-popup url script-request-header https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/lzsh.js
*/
// lzsh.js - 捕获乐药耀请求头中的xiaoletoken
(function() {
    'use strict';
    
    const STORAGE_KEY = 'lzsh';
    const TARGET_URL = 'https://infor.leyaoyao.com/infor/xiaolelife/is-show-new-user-popup';
    
    // 检查是否是目标URL
    if (!$request || !$request.url.indexOf(TARGET_URL) === -1) {
        $done({});
        return;
    }
    
    try {
        // 获取请求头部
        const headers = $request.headers;
        if (!headers) {
            console.log('[LZSH] 请求头部为空');
            $done({});
            return;
        }
        
        // 获取xiaoletoken（注意大小写）
        let xiaoletoken = headers['xiaoletoken'] || headers['Xiaoletoken'] || headers['XiaoLeToken'];
        if (!xiaoletoken) {
            console.log('[LZSH] 未找到xiaoletoken头部');
            $done({});
            return;
        }
        
        console.log(`[LZSH] 捕获到xiaoletoken: ${xiaoletoken.substring(0, 30)}...`);
        
        // 管理多账号数据
        manageLzshData(xiaoletoken);
        
    } catch (error) {
        console.log(`[LZSH] 错误: ${error}`);
    }
    
    $done({});
    
    function manageLzshData(newToken) {
        // 获取已存储的数据
        let storedData = $prefs.valueForKey(STORAGE_KEY) || '';
        console.log(`[LZSH] 原始存储数据: ${storedData.substring(0, 100)}`);
        
        // 解析现有的数据（按@分隔）
        let dataArray = [];
        if (storedData) {
            // 按@分割，过滤空项
            const items = storedData.split('@');
            for (let item of items) {
                const trimmedItem = item.trim();
                if (trimmedItem !== '') {
                    dataArray.push(trimmedItem);
                }
            }
        }
        
        console.log(`[LZSH] 当前存储 ${dataArray.length} 条记录`);
        
        // 检查是否已存在相同的token
        let existingIndex = -1;
        
        for (let i = 0; i < dataArray.length; i++) {
            if (dataArray[i] === newToken) {
                existingIndex = i;
                console.log(`[LZSH] 找到相同token，索引: ${i}`);
                break;
            }
        }
        
        let action = '';
        
        if (existingIndex === -1) {
            // 新的token，添加到数组末尾
            dataArray.push(newToken);
            action = '添加';
            console.log(`[LZSH] 添加新token: ${newToken.substring(0, 30)}...`);
        } else {
            // token已存在，跳过添加（不重复）
            action = '跳过';
            console.log(`[LZSH] token已存在，跳过添加`);
            $notify(
                "ℹ️ 乐药耀", 
                "Token已存在", 
                `当前账号数: ${dataArray.length}`
            );
            $done({});
            return;
        }
        
        // 保存到BoxJS，用@分隔
        const newStoredData = dataArray.join('@');
        $prefs.setValueForKey(newStoredData, STORAGE_KEY);
        
        // 发送通知
        const title = "✅ 乐药耀Token已添加";
        const subtitle = `Token: ${newToken.substring(0, 20)}...`;
        const message = `当前账号数: ${dataArray.length}`;
        
        $notify(title, subtitle, message);
        
        // 自动复制当前token到剪贴板
        if (typeof $tool !== 'undefined' && $tool.copy) {
            $tool.copy(newToken);
            console.log('[LZSH] token已复制到剪贴板');
        }
        
        console.log(`[LZSH] 保存成功，当前共 ${dataArray.length} 个账号`);
        console.log(`[LZSH] 存储格式: token1@token2@token3`);
        dataArray.forEach((item, index) => {
            console.log(`  ${index + 1}. ${item.substring(0, 40)}...`);
        });
    }
})();