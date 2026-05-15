/*
[MITM]
hostname = www.yipintemian.com

[rewrite_local]
# 帝天宝请求头捕获 (POST请求)
^https:\/\/www\.yipintemian\.com\/mbuy\/intf\/account\/wxSecondLogin url script-request-header https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/dtb.js
*/
// dtb.js - 捕获帝天宝POST请求头中的openId、Authorization、appid
(function() {
    'use strict';
    
    const STORAGE_KEY = 'dtb';
    const TARGET_URL = 'https://www.yipintemian.com/mbuy/intf/account/wxSecondLogin';
    
    // 检查是否是目标URL
    if (!$request || $request.url.indexOf(TARGET_URL) === -1) {
        $done({});
        return;
    }
    
    // 记录请求方法
    const requestMethod = $request.method || 'UNKNOWN';
    console.log(`[Dtb] 请求方法: ${requestMethod}`);
    console.log(`[Dtb] 请求URL: ${$request.url}`);
    
    // 只处理POST请求（可选，也可以处理所有请求）
    if (requestMethod !== 'POST') {
        console.log('[Dtb] 非POST请求，跳过处理');
        $done({});
        return;
    }
    
    try {
        // 获取请求头部
        const headers = $request.headers;
        if (!headers) {
            console.log('[Dtb] 请求头部为空');
            $done({});
            return;
        }
        
        // 打印所有请求头（调试用）
        console.log('[Dtb] 请求头列表:');
        for (let key in headers) {
            if (key.toLowerCase().includes('open') || 
                key.toLowerCase().includes('authorization') || 
                key.toLowerCase().includes('app')) {
                console.log(`  ${key}: ${headers[key]}`);
            }
        }
        
        // 获取openId（尝试多种大小写）
        let openId = headers['openId'] || 
                     headers['OpenId'] || 
                     headers['OPENID'] || 
                     headers['openid'] || 
                     headers['OpenID'] || '';
        
        // 获取Authorization（尝试多种大小写）
        let authorization = headers['Authorization'] || 
                            headers['authorization'] || '';
        
        // 获取appid（尝试多种大小写）
        let appid = headers['appid'] || 
                    headers['AppId'] || 
                    headers['APPID'] || 
                    headers['appId'] || 
                    headers['Appid'] || '';
        
        // 详细日志
        if (openId) {
            console.log(`[Dtb] ✅ openId: ${openId.substring(0, 30)}...`);
        } else {
            console.log('[Dtb] ❌ 未找到openId');
        }
        
        if (authorization) {
            // 去掉Bearer前缀（如果存在）
            let cleanAuth = authorization;
            if (authorization.startsWith('Bearer ') || authorization.startsWith('bearer ')) {
                cleanAuth = authorization.substring(7);
                console.log(`[Dtb] ✅ Authorization (去Bearer): ${cleanAuth.substring(0, 30)}...`);
            } else {
                console.log(`[Dtb] ✅ Authorization: ${authorization.substring(0, 30)}...`);
            }
            authorization = cleanAuth;
        } else {
            console.log('[Dtb] ❌ 未找到Authorization');
        }
        
        if (appid) {
            console.log(`[Dtb] ✅ appid: ${appid}`);
        } else {
            console.log('[Dtb] ❌ 未找到appid');
        }
        
        // 检查必要字段
        if (!openId) {
            console.log('[Dtb] 缺少必要字段 openId，跳过保存');
            $notify("⚠️ 帝天宝", "缺少必要字段", "未找到 openId，请检查请求头");
            $done({});
            return;
        }
        
        if (!authorization) {
            console.log('[Dtb] 缺少必要字段 Authorization，跳过保存');
            $notify("⚠️ 帝天宝", "缺少必要字段", "未找到 Authorization");
            $done({});
            return;
        }
        
        // 格式化数据：openId#Authorization#appid
        const newData = `${openId}#${authorization}#${appid}`;
        console.log(`[Dtb] 格式化数据: ${newData.substring(0, 80)}`);
        
        // 管理多账号
        manageDtbData(openId, newData);
        
    } catch (error) {
        console.log(`[Dtb] 错误: ${error}`);
    }
    
    $done({});
    
    function manageDtbData(openId, newData) {
        // 获取已存储的数据
        let storedData = $prefs.valueForKey(STORAGE_KEY) || '';
        console.log(`[Dtb] 当前存储: ${storedData || '(空)'}`);
        
        // 解析现有数据（按&分隔）
        let dataArray = storedData ? storedData.split('&').filter(item => item.trim() !== '') : [];
        
        // 检查是否已存在相同的openId
        let existingIndex = -1;
        
        for (let i = 0; i < dataArray.length; i++) {
            const item = dataArray[i];
            // 格式：openId#Authorization#appid
            const tokenEndIndex = item.indexOf('#');
            if (tokenEndIndex !== -1) {
                const storedOpenId = item.substring(0, tokenEndIndex);
                if (storedOpenId === openId) {
                    existingIndex = i;
                    console.log(`[Dtb] 找到相同openId，索引: ${i}`);
                    break;
                }
            }
        }
        
        let action = '';
        
        if (existingIndex === -1) {
            // 新的openId，添加到数组末尾
            dataArray.push(newData);
            action = '添加';
            console.log(`[Dtb] 添加新账号，openId: ${openId.substring(0, 20)}...`);
        } else {
            // 已存在openId，更新数据
            dataArray[existingIndex] = newData;
            action = '更新';
            console.log(`[Dtb] 更新已有账号，openId: ${openId.substring(0, 20)}...`);
        }
        
        // 保存到BoxJS，用&分隔
        const newStoredData = dataArray.join('&');
        $prefs.setValueForKey(newStoredData, STORAGE_KEY);
        
        // 发送通知
        const title = action === '添加' ? "✅ 帝天宝账号已添加" : "🔄 帝天宝数据已更新";
        const subtitle = `openId: ${openId.substring(0, 15)}...`;
        const message = `当前账号数: ${dataArray.length}`;
        
        $notify(title, subtitle, message);
        
        // 自动复制当前数据到剪贴板
        if (typeof $tool !== 'undefined' && $tool.copy) {
            $tool.copy(newData);
            console.log('[Dtb] 数据已复制到剪贴板');
        }
        
        console.log(`[Dtb] 保存成功，当前共 ${dataArray.length} 个账号`);
        console.log(`[Dtb] 存储格式: openId#Authorization#appid&openId2#Authorization2#appid2`);
        dataArray.forEach((item, index) => {
            const openIdPart = item.split('#')[0];
            console.log(`  ${index + 1}. openId: ${openIdPart?.substring(0, 30)}...`);
        });
    }
})();