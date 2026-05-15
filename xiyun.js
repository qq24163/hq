/*
[MITM]
hostname = cid-cps-api.heliang.cc

[rewrite_local]
# 喜运请求头捕获 (POST请求)
^https:\/\/cid-cps-api\.heliang\.cc\/coin\/withdrawal-list url script-request-header https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/xiyun.js
*/
// xiyun.js - 捕获喜运POST请求头中的x-token、x-web-id、scene
(function() {
    'use strict';
    
    const STORAGE_KEY = 'xiyun';
    const TARGET_URL = 'https://cid-cps-api.heliang.cc/coin/withdrawal-list';
    
    // 检查是否是目标URL
    if (!$request || $request.url.indexOf(TARGET_URL) === -1) {
        $done({});
        return;
    }
    
    // 记录请求方法
    const requestMethod = $request.method || 'UNKNOWN';
    console.log(`[Xiyun] 请求方法: ${requestMethod}`);
    console.log(`[Xiyun] 请求URL: ${$request.url}`);
    
    // 只处理POST请求（可选，也可以处理所有请求）
    if (requestMethod !== 'POST') {
        console.log('[Xiyun] 非POST请求，跳过处理');
        $done({});
        return;
    }
    
    try {
        // 获取请求头部
        const headers = $request.headers;
        if (!headers) {
            console.log('[Xiyun] 请求头部为空');
            $done({});
            return;
        }
        
        // 打印所有请求头（调试用）
        console.log('[Xiyun] 请求头列表:');
        for (let key in headers) {
            if (key.toLowerCase().includes('token') || key.toLowerCase().includes('web') || key.toLowerCase().includes('scene')) {
                console.log(`  ${key}: ${headers[key]}`);
            }
        }
        
        // 获取x-token（尝试多种大小写）
        let xToken = headers['x-token'] || 
                     headers['X-Token'] || 
                     headers['X_TOKEN'] || 
                     headers['x_token'] || '';
        
        // 获取x-web-id（尝试多种大小写）
        let xWebId = headers['x-web-id'] || 
                     headers['X-Web-Id'] || 
                     headers['X_WEB_ID'] || 
                     headers['x_web_id'] || 
                     headers['xwebid'] || 
                     headers['XWebId'] || '';
        
        // 获取scene（尝试多种大小写）
        let scene = headers['scene'] || 
                    headers['Scene'] || 
                    headers['SCENE'] || '';
        
        // 详细日志
        if (xToken) {
            console.log(`[Xiyun] ✅ x-token: ${xToken.substring(0, 30)}...`);
        } else {
            console.log('[Xiyun] ❌ 未找到x-token');
        }
        
        if (xWebId) {
            console.log(`[Xiyun] ✅ x-web-id: ${xWebId.substring(0, 30)}...`);
        } else {
            console.log('[Xiyun] ❌ 未找到x-web-id');
        }
        
        if (scene) {
            console.log(`[Xiyun] ✅ scene: ${scene.substring(0, 30)}...`);
        } else {
            console.log('[Xiyun] ❌ 未找到scene');
        }
        
        // 检查必要字段
        if (!xToken) {
            console.log('[Xiyun] 缺少必要字段 x-token，跳过保存');
            $notify("⚠️ 喜运", "缺少必要字段", "未找到 x-token，请检查请求头");
            $done({});
            return;
        }
        
        // 格式化数据：x-token#x-web-id@scene
        const newData = `${xToken}#${xWebId}@${scene}`;
        console.log(`[Xiyun] 格式化数据: ${newData.substring(0, 80)}`);
        
        // 管理多账号
        manageXiyunData(xToken, newData);
        
    } catch (error) {
        console.log(`[Xiyun] 错误: ${error}`);
    }
    
    $done({});
    
    function manageXiyunData(xToken, newData) {
        // 获取已存储的数据
        let storedData = $prefs.valueForKey(STORAGE_KEY) || '';
        console.log(`[Xiyun] 当前存储: ${storedData || '(空)'}`);
        
        // 解析现有数据（按&分隔）
        let dataArray = storedData ? storedData.split('&').filter(item => item.trim() !== '') : [];
        
        // 检查是否已存在相同的x-token
        let existingIndex = -1;
        
        for (let i = 0; i < dataArray.length; i++) {
            const item = dataArray[i];
            // 格式：x-token#x-web-id@scene
            const tokenEndIndex = item.indexOf('#');
            if (tokenEndIndex !== -1) {
                const storedToken = item.substring(0, tokenEndIndex);
                if (storedToken === xToken) {
                    existingIndex = i;
                    console.log(`[Xiyun] 找到相同x-token，索引: ${i}`);
                    break;
                }
            }
        }
        
        let action = '';
        
        if (existingIndex === -1) {
            // 新的x-token，添加到数组末尾
            dataArray.push(newData);
            action = '添加';
            console.log(`[Xiyun] 添加新账号`);
        } else {
            // 已存在x-token，更新数据
            dataArray[existingIndex] = newData;
            action = '更新';
            console.log(`[Xiyun] 更新已有账号`);
        }
        
        // 保存到BoxJS，用&分隔
        const newStoredData = dataArray.join('&');
        $prefs.setValueForKey(newStoredData, STORAGE_KEY);
        
        // 发送通知
        const title = action === '添加' ? "✅ 喜运账号已添加" : "🔄 喜运数据已更新";
        const subtitle = `x-token: ${xToken.substring(0, 15)}...`;
        const message = `当前账号数: ${dataArray.length}`;
        
        $notify(title, subtitle, message);
        
        // 自动复制当前数据到剪贴板
        if (typeof $tool !== 'undefined' && $tool.copy) {
            $tool.copy(newData);
            console.log('[Xiyun] 数据已复制到剪贴板');
        }
        
        console.log(`[Xiyun] 保存成功，当前共 ${dataArray.length} 个账号`);
        console.log(`[Xiyun] 存储格式: x-token#x-web-id@scene&x-token2#x-web-id2@scene2`);
        dataArray.forEach((item, index) => {
            const tokenPart = item.split('#')[0];
            console.log(`  ${index + 1}. x-token: ${tokenPart?.substring(0, 30)}...`);
        });
    }
})();