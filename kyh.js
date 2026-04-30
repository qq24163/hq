/*
[MITM]
hostname = wxashopapi.heliang.cc

[rewrite_local]
# 康悦汇请求头捕获
^https:\/\/wxashopapi\.heliang\.cc\/wxa\/ad\/getAdList url script-request-header https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/kyh.js
*/
// kyh.js - 捕获康悦汇请求头中的stoken、x-web-id、x-cdn-relay-etag
(function() {
    'use strict';
    
    const STORAGE_KEY = 'kyh';
    const TARGET_URL = 'https://wxashopapi.heliang.cc/wxa/ad/getAdList';
    
    // 检查是否是目标URL
    if (!$request || !$request.url.indexOf(TARGET_URL) === -1) {
        $done({});
        return;
    }
    
    try {
        // 获取请求头部
        const headers = $request.headers;
        if (!headers) {
            console.log('[KYH] 请求头部为空');
            $done({});
            return;
        }
        
        // 获取stoken
        let stoken = headers['stoken'] || headers['Stoken'] || headers['STOKEN'];
        if (!stoken) {
            console.log('[KYH] 未找到stoken头部');
            $done({});
            return;
        }
        
        // 获取x-web-id
        let xWebId = headers['x-web-id'] || headers['X-Web-Id'] || headers['X-WEB-ID'];
        if (!xWebId) {
            console.log('[KYH] 未找到x-web-id头部');
            xWebId = '';
        }
        
        // 获取x-cdn-relay-etag
        let xCdnRelayEtag = headers['x-cdn-relay-etag'] || headers['X-Cdn-Relay-Etag'] || headers['X-CDN-RELAY-ETAG'];
        if (!xCdnRelayEtag) {
            console.log('[KYH] 未找到x-cdn-relay-etag头部');
            xCdnRelayEtag = '';
        }
        
        console.log(`[KYH] 捕获到数据:`);
        console.log(`[KYH]   stoken: ${stoken.substring(0, 30)}...`);
        console.log(`[KYH]   x-web-id: ${xWebId.substring(0, 30)}...`);
        console.log(`[KYH]   x-cdn-relay-etag: ${xCdnRelayEtag.substring(0, 30)}...`);
        
        // 生成序号（用于标识账号）
        let serialNumber = '';
        
        // 管理多账号数据
        manageKyhData(stoken, xWebId, xCdnRelayEtag);
        
    } catch (error) {
        console.log(`[KYH] 错误: ${error}`);
    }
    
    $done({});
    
    function manageKyhData(stoken, xWebId, xCdnRelayEtag) {
        // 获取已存储的数据
        let storedData = $prefs.valueForKey(STORAGE_KEY) || '';
        console.log(`[KYH] 原始存储数据: ${storedData.substring(0, 100)}`);
        
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
        
        console.log(`[KYH] 当前存储 ${dataArray.length} 条记录`);
        
        // 检查是否已存在相同的stoken
        let existingIndex = -1;
        let existingSerial = '';
        
        for (let i = 0; i < dataArray.length; i++) {
            const item = dataArray[i];
            // 格式：序号&stoken&x-web-id&x-cdn-relay-etag
            const parts = item.split('&');
            if (parts.length >= 2) {
                const storedStoken = parts[1];
                if (storedStoken === stoken) {
                    existingIndex = i;
                    existingSerial = parts[0];
                    console.log(`[KYH] 找到相同stoken，索引: ${i}, 原序号: ${existingSerial}`);
                    break;
                }
            }
        }
        
        let action = '';
        let newSerial = '';
        
        if (existingIndex === -1) {
            // 新的stoken，生成新序号
            const nextNumber = dataArray.length + 1;
            newSerial = String(nextNumber);
            const newData = `${newSerial}&${stoken}&${xWebId}&${xCdnRelayEtag}`;
            dataArray.push(newData);
            action = '添加';
            console.log(`[KYH] 添加新账号，序号: ${newSerial}, stoken: ${stoken.substring(0, 30)}...`);
        } else {
            // 已存在stoken，更新数据（保留原序号）
            newSerial = existingSerial;
            const newData = `${newSerial}&${stoken}&${xWebId}&${xCdnRelayEtag}`;
            dataArray[existingIndex] = newData;
            action = '更新';
            console.log(`[KYH] 更新已有账号，序号: ${newSerial}, stoken: ${stoken.substring(0, 30)}...`);
        }
        
        // 保存到BoxJS，用@分隔
        const newStoredData = dataArray.join('@');
        $prefs.setValueForKey(newStoredData, STORAGE_KEY);
        
        // 格式化新数据用于复制
        const newDataFormatted = `${newSerial}&${stoken}&${xWebId}&${xCdnRelayEtag}`;
        
        // 发送通知
        const title = action === '添加' ? "✅ 康悦汇账号已添加" : "🔄 康悦汇数据已更新";
        const subtitle = `序号: ${newSerial}`;
        const message = `当前账号数: ${dataArray.length}`;
        
        $notify(title, subtitle, message);
        
        // 自动复制当前数据到剪贴板
        if (typeof $tool !== 'undefined' && $tool.copy) {
            $tool.copy(newDataFormatted);
            console.log('[KYH] 数据已复制到剪贴板');
        }
        
        console.log(`[KYH] 保存成功，当前共 ${dataArray.length} 个账号`);
        console.log(`[KYH] 存储格式: 序号&stoken&x-web-id&x-cdn-relay-etag@...`);
        dataArray.forEach((item, index) => {
            const parts = item.split('&');
            console.log(`  ${index + 1}. 序号:${parts[0]}, stoken:${parts[1]?.substring(0, 20)}...`);
        });
    }
})();