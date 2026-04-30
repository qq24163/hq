/*
[MITM]
hostname = wxashopapi.heliang.cc

[rewrite_local]
# 康悦汇广告信息捕获
^https:\/\/wxashopapi\.heliang\.cc\/wxa\/ad\/getAdList url script-response-body https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/kyh.js
*/
// kyh.js - 捕获康悦汇请求头中的stoken、x-web-id、x-cdn-relay-etag和响应体中的adid
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
        // 1. 从请求头中获取stoken、x-web-id、x-cdn-relay-etag
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
        console.log(`[KYH] 捕获到stoken: ${stoken.substring(0, 30)}...`);
        
        // 获取x-web-id
        let xWebId = headers['x-web-id'] || headers['X-Web-Id'] || headers['X-WEB-ID'];
        if (!xWebId) {
            console.log('[KYH] 未找到x-web-id头部');
            xWebId = '';
        } else {
            console.log(`[KYH] 捕获到x-web-id: ${xWebId.substring(0, 30)}...`);
        }
        
        // 获取x-cdn-relay-etag
        let xCdnRelayEtag = headers['x-cdn-relay-etag'] || headers['X-Cdn-Relay-Etag'] || headers['X-CDN-RELAY-ETAG'];
        if (!xCdnRelayEtag) {
            console.log('[KYH] 未找到x-cdn-relay-etag头部');
            xCdnRelayEtag = '';
        } else {
            console.log(`[KYH] 捕获到x-cdn-relay-etag: ${xCdnRelayEtag.substring(0, 30)}...`);
        }
        
        // 2. 从响应体中获取adid
        const responseBody = $response.body;
        if (!responseBody) {
            console.log('[KYH] 响应体为空');
            $done({});
            return;
        }
        
        // 解析JSON
        let jsonData;
        try {
            jsonData = JSON.parse(responseBody);
        } catch (e) {
            console.log(`[KYH] JSON解析失败: ${e}`);
            $done({});
            return;
        }
        
        // 检查响应是否成功
        if (jsonData.error_code !== 0) {
            console.log(`[KYH] 响应失败: error_code=${jsonData.error_code}, msg=${jsonData.msg}`);
            $done({});
            return;
        }
        
        // 提取adid
        const adid = jsonData.data?.wx_my_recommend_goods?.adid;
        if (!adid) {
            console.log('[KYH] 未找到adid字段');
            $done({});
            return;
        }
        
        console.log(`[KYH] 捕获到adid: ${adid}`);
        
        // 格式化数据：adid&stoken&x-web-id&x-cdn-relay-etag
        const newData = `${adid}&${stoken}&${xWebId}&${xCdnRelayEtag}`;
        
        // 管理多账号
        manageKyhData(adid, stoken, xWebId, xCdnRelayEtag, newData);
        
    } catch (error) {
        console.log(`[KYH] 错误: ${error}`);
    }
    
    $done({});
    
    function manageKyhData(adid, stoken, xWebId, xCdnRelayEtag, newData) {
        // 获取已存储的数据
        let storedData = $prefs.valueForKey(STORAGE_KEY) || '';
        console.log(`[KYH] 原始存储数据: ${storedData.substring(0, 100)}`);
        
        // 解析现有的数据（按@分隔）
        let dataArray = [];
        if (storedData) {
            const items = storedData.split('@');
            for (let item of items) {
                const trimmedItem = item.trim();
                if (trimmedItem !== '') {
                    dataArray.push(trimmedItem);
                }
            }
        }
        
        console.log(`[KYH] 当前存储 ${dataArray.length} 条记录`);
        
        // 检查是否已存在相同的adid
        let existingIndex = -1;
        let oldData = '';
        
        for (let i = 0; i < dataArray.length; i++) {
            const item = dataArray[i];
            // 提取第一个&之前的adid
            const andIndex = item.indexOf('&');
            if (andIndex !== -1) {
                const storedAdid = item.substring(0, andIndex);
                if (storedAdid === adid) {
                    existingIndex = i;
                    oldData = item;
                    console.log(`[KYH] 找到相同adid，索引: ${i}`);
                    break;
                }
            }
        }
        
        let action = '';
        
        if (existingIndex === -1) {
            // 新的adid，添加到数组末尾
            dataArray.push(newData);
            action = '添加';
            console.log(`[KYH] 添加新账号，adid: ${adid}`);
        } else {
            // 已存在adid，检查是否有变化
            if (oldData !== newData) {
                dataArray[existingIndex] = newData;
                action = '更新';
                console.log(`[KYH] 更新已有账号，adid: ${adid}`);
            } else {
                action = '跳过';
                console.log(`[KYH] 数据未变化，跳过保存`);
                $notify(
                    "ℹ️ 康悦汇", 
                    "数据未变化", 
                    `adid: ${adid}\n当前账号数: ${dataArray.length}`
                );
                $done({});
                return;
            }
        }
        
        // 保存到BoxJS，用@分隔
        const newStoredData = dataArray.join('@');
        $prefs.setValueForKey(newStoredData, STORAGE_KEY);
        
        // 发送通知
        const title = action === '添加' ? "✅ 康悦汇广告已添加" : "🔄 康悦汇广告已更新";
        const subtitle = `adid: ${adid}`;
        const message = `当前账号数: ${dataArray.length}`;
        
        $notify(title, subtitle, message);
        
        // 自动复制当前数据到剪贴板
        if (typeof $tool !== 'undefined' && $tool.copy) {
            $tool.copy(newData);
            console.log('[KYH] 数据已复制到剪贴板');
        }
        
        console.log(`[KYH] 保存成功，当前共 ${dataArray.length} 个账号`);
        console.log(`[KYH] 存储格式: adid&stoken&x-web-id&x-cdn-relay-etag@...`);
        dataArray.forEach((item, index) => {
            const parts = item.split('&');
            console.log(`  ${index + 1}. adid: ${parts[0]}, stoken: ${parts[1]?.substring(0, 20)}...`);
        });
    }
})();