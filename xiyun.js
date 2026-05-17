/*
[MITM]
hostname = cid-cps-api.heliang.cc

[rewrite_local]
# 喜运请求头捕获 (POST请求)
^https:\/\/cid-cps-api\.heliang\.cc\/coin\/withdrawal-list url script-request-header https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/xiyun.js
*/
// xiyun.js - 捕获喜运POST请求头中的x-token、x-web-id、scene
// 根据 x-web-id 判断和更新对应账号
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
    
    // 只处理POST请求
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
        
        // 获取x-token
        let xToken = headers['x-token'] || 
                     headers['X-Token'] || 
                     headers['X_TOKEN'] || 
                     headers['x_token'] || '';
        
        // 获取x-web-id（用于判断的唯一标识）
        let xWebId = headers['x-web-id'] || 
                     headers['X-Web-Id'] || 
                     headers['X_WEB_ID'] || 
                     headers['x_web_id'] || 
                     headers['xwebid'] || 
                     headers['XWebId'] || '';
        
        // 获取scene
        let scene = headers['scene'] || 
                    headers['Scene'] || 
                    headers['SCENE'] || '';
        
        console.log(`[Xiyun] x-token: ${xToken ? xToken.substring(0, 30) + '...' : '未找到'}`);
        console.log(`[Xiyun] x-web-id: ${xWebId ? xWebId.substring(0, 30) + '...' : '未找到'}`);
        console.log(`[Xiyun] scene: ${scene ? scene.substring(0, 30) + '...' : '未找到'}`);
        
        // 检查必要字段
        if (!xWebId) {
            console.log('[Xiyun] 缺少必要字段 x-web-id，跳过保存');
            $notify("⚠️ 喜运", "缺少必要字段", "未找到 x-web-id，请检查请求头");
            $done({});
            return;
        }
        
        if (!xToken) {
            console.log('[Xiyun] 缺少 x-token，仍保存但token为空');
        }
        
        // 格式化数据：x-token#x-web-id@scene
        const newData = `${xToken}#${xWebId}@${scene}`;
        console.log(`[Xiyun] 格式化数据: ${newData.substring(0, 80)}`);
        
        // 根据 x-web-id 管理多账号
        manageXiyunData(xWebId, newData);
        
    } catch (error) {
        console.log(`[Xiyun] 错误: ${error}`);
    }
    
    $done({});
    
    function manageXiyunData(xWebId, newData) {
        // 获取已存储的数据
        let storedData = $prefs.valueForKey(STORAGE_KEY) || '';
        console.log(`[Xiyun] 当前存储: ${storedData || '(空)'}`);
        
        // 解析现有数据（按&分隔）
        let dataArray = storedData ? storedData.split('&').filter(item => item.trim() !== '') : [];
        
        // 根据 x-web-id 查找是否已存在
        // 数据格式：x-token#x-web-id@scene
        let existingIndex = -1;
        let oldData = '';
        
        for (let i = 0; i < dataArray.length; i++) {
            const item = dataArray[i];
            // 提取 # 和 @ 之间的 x-web-id
            const hashIndex = item.indexOf('#');
            const atIndex = item.indexOf('@');
            if (hashIndex !== -1 && atIndex !== -1) {
                const storedWebId = item.substring(hashIndex + 1, atIndex);
                if (storedWebId === xWebId) {
                    existingIndex = i;
                    oldData = item;
                    console.log(`[Xiyun] 找到相同x-web-id: ${xWebId.substring(0, 20)}...，索引: ${i}`);
                    break;
                }
            }
        }
        
        let action = '';
        
        if (existingIndex === -1) {
            // 新的x-web-id，添加到数组末尾
            dataArray.push(newData);
            action = '添加';
            console.log(`[Xiyun] 添加新账号，x-web-id: ${xWebId.substring(0, 20)}...`);
        } else {
            // 已存在x-web-id，更新数据
            if (oldData !== newData) {
                dataArray[existingIndex] = newData;
                action = '更新';
                console.log(`[Xiyun] 更新已有账号，x-web-id: ${xWebId.substring(0, 20)}...`);
            } else {
                action = '跳过';
                console.log(`[Xiyun] 数据未变化，跳过保存`);
                $done({});
                return;
            }
        }
        
        // 保存到BoxJS，用&分隔
        const newStoredData = dataArray.join('&');
        $prefs.setValueForKey(newStoredData, STORAGE_KEY);
        
        // 发送通知
        const title = action === '添加' ? "✅ 喜运账号已添加" : "🔄 喜运数据已更新";
        const subtitle = `x-web-id: ${xWebId.substring(0, 15)}...`;
        const message = `当前账号数: ${dataArray.length}`;
        
        $notify(title, subtitle, message);
        
        // 自动复制当前数据到剪贴板
        if (typeof $tool !== 'undefined' && $tool.copy) {
            $tool.copy(newData);
            console.log('[Xiyun] 数据已复制到剪贴板');
        }
        
        console.log(`[Xiyun] 保存成功，当前共 ${dataArray.length} 个账号`);
        console.log(`[Xiyun] 存储格式: x-token#x-web-id@scene&...`);
        dataArray.forEach((item, index) => {
            const hashIndex = item.indexOf('#');
            const atIndex = item.indexOf('@');
            const webId = (hashIndex !== -1 && atIndex !== -1) ? item.substring(hashIndex + 1, atIndex) : 'unknown';
            console.log(`  ${index + 1}. x-web-id: ${webId.substring(0, 30)}...`);
        });
    }
})();