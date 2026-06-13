/*
-------------- Quantumult X 配置 --------------

[MITM]
hostname = feima.zhisongshu.cn

[rewrite_local]
# 袋鼠平台 token 和手机号捕获（只使用响应体脚本）
^https:\/\/feima\.zhisongshu\.cn\/api\/5dca57afa379e\?m=getUserInfo url script-response-body https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/daishu.js
*/
// daishu.js - 捕获袋鼠平台的 access-token、user-token 和手机号（修正版）
(function() {
    'use strict';
    
    const TARGET_URL = 'https://feima.zhisongshu.cn/api/5dca57afa379e?m=getUserInfo';
    
    // 检查是否是目标URL
    if (!$response || $response.url.indexOf(TARGET_URL) === -1) {
        $done({});
        return;
    }
    
    try {
        // 从原始请求中获取 headers（需要从 $response 中获取原始请求信息）
        // 注意：Quantumult X 中 $response 可能包含 originalRequest 属性
        let accessToken = null;
        let userToken = null;
        
        // 尝试多种方式获取请求头
        if ($response.originalRequest && $response.originalRequest.headers) {
            accessToken = $response.originalRequest.headers['access-token'] || $response.originalRequest.headers['Access-Token'];
            userToken = $response.originalRequest.headers['user-token'] || $response.originalRequest.headers['User-Token'];
        }
        
        if (!accessToken || !userToken) {
            console.log('[DAISHU] 无法从响应中获取请求头token');
            $done({});
            return;
        }
        
        // 解析响应体
        const body = $response.body;
        if (!body) {
            console.log('[DAISHU] 响应体为空');
            $done({});
            return;
        }
        
        const responseData = JSON.parse(body);
        
        if (responseData.code !== 1 || !responseData.data || !responseData.data.phone) {
            console.log('[DAISHU] 响应体中没有手机号');
            $done({});
            return;
        }
        
        const phone = responseData.data.phone;
        
        console.log(`[DAISHU] 捕获到 access-token: ${accessToken.substring(0, 30)}...`);
        console.log(`[DAISHU] 捕获到 user-token: ${userToken.substring(0, 30)}...`);
        console.log(`[DAISHU] 捕获到手机号: ${phone}`);
        
        // 管理多账号
        function manageDaishuData(accessToken, userToken, phone) {
            const STORAGE_KEY = 'daishu';
            const storedData = $prefs.valueForKey(STORAGE_KEY) || '';
            let recordsArray = storedData ? storedData.split('&').filter(r => r.trim() !== '') : [];
            
            // 新记录格式: phone#access-token#user-token
            const newRecord = `${phone}#${accessToken}#${userToken}`;
            
            // 检查是否已存在相同phone的记录
            let isNewRecord = true;
            let accountNumber = recordsArray.length + 1;
            
            for (let i = 0; i < recordsArray.length; i++) {
                const existingPhone = recordsArray[i].split('#')[0];
                if (existingPhone === phone) {
                    isNewRecord = false;
                    accountNumber = i + 1;
                    // 更新为最新记录
                    recordsArray[i] = newRecord;
                    break;
                }
            }
            
            if (isNewRecord) {
                // 新记录，添加到数组
                recordsArray.push(newRecord);
            }
            
            // 保存到BoxJS，用&分隔
            $prefs.setValueForKey(recordsArray.join('&'), STORAGE_KEY);
            
            // 发送通知
            const action = isNewRecord ? "已添加" : "已更新";
            const title = `✅ 袋鼠平台账号${action}`;
            const subtitle = `账号${accountNumber} (手机: ${phone})`;
            const message = `access-token: ${accessToken.substring(0, 20)}...\nuser-token: ${userToken.substring(0, 20)}...`;
            
            $notify(title, subtitle, message);
            
            console.log(`[DAISHU] 保存记录: ${newRecord}`);
            console.log(`[DAISHU] 当前共存储 ${recordsArray.length} 个账号`);
        }
        
        manageDaishuData(accessToken, userToken, phone);
        
    } catch (error) {
        console.log(`[DAISHU] 错误: ${error}`);
    }
    
    $done({});
})();