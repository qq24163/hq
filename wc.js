/*
[MITM]
hostname = vapp.taizhou.com.cn

[rewrite_local]
# 王朝账号信息捕获（响应体脚本）
^https:\/\/vapp\.taizhou\.com\.cn\/api\/user_mumber\/account_detail\?osTypeCode=2 url script-response-body https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/wc.js
*/
// wc.js - 捕获王朝账户详情接口的请求头和响应体
// 使用 script-response-body 类型，可以同时访问请求头和响应体
(function() {
    'use strict';
    
    const STORAGE_KEY = 'WangChao';
    const TARGET_URL = 'https://vapp.taizhou.com.cn/api/user_mumber/account_detail';
    
    console.log(`[WangChao] 脚本类型: response-body`);
    
    // 检查是否是目标URL
    if (!$request || $request.url.indexOf(TARGET_URL) === -1) {
        $done({});
        return;
    }
    
    console.log(`[WangChao] ========== 捕获请求 ==========`);
    console.log(`[WangChao] 请求方法: ${$request.method || 'UNKNOWN'}`);
    
    try {
        // ========== 1. 获取请求头部信息 ==========
        const headers = $request.headers;
        if (!headers) {
            console.log('[WangChao] 请求头部为空');
            $done({});
            return;
        }
        
        // 获取需要的请求头字段
        let userAgent = headers['User-Agent'] || headers['user-agent'] || '';
        let xSessionId = headers['X-SESSION-ID'] || headers['X-Session-Id'] || headers['x-session-id'] || '';
        let xRequestId = headers['X-REQUEST-ID'] || headers['X-Request-Id'] || headers['x-request-id'] || '';
        let xTimestamp = headers['X-TIMESTAMP'] || headers['X-Timestamp'] || headers['x-timestamp'] || '';
        let xSignature = headers['X-SIGNATURE'] || headers['X-Signature'] || headers['x-signature'] || '';
        let xTenantId = headers['X-TENANT-ID'] || headers['X-Tenant-Id'] || headers['x-tenant-id'] || '';
        
        console.log(`[WangChao] 请求头捕获:`);
        console.log(`[WangChao]   User-Agent: ${userAgent.substring(0, 50)}...`);
        console.log(`[WangChao]   X-SESSION-ID: ${xSessionId.substring(0, 30)}...`);
        console.log(`[WangChao]   X-SIGNATURE: ${xSignature.substring(0, 30)}...`);
        
        // ========== 2. 获取响应体中的手机号 ==========
        const responseBody = $response.body;
        if (!responseBody) {
            console.log('[WangChao] 响应体为空');
            $done({});
            return;
        }
        
        console.log(`[WangChao] 响应内容: ${responseBody.substring(0, 300)}`);
        
        // 解析JSON
        let jsonData;
        try {
            jsonData = JSON.parse(responseBody);
        } catch (e) {
            console.log(`[WangChao] JSON解析失败: ${e}`);
            $done({});
            return;
        }
        
        // 提取mobile（手机号）
        let mobile = '';
        
        // 尝试多种可能的路径
        if (jsonData.data) {
            if (jsonData.data.account) {
                mobile = jsonData.data.account.mobile || jsonData.data.account.phone_number || '';
            } else {
                mobile = jsonData.data.mobile || jsonData.data.phone_number || '';
            }
        } else {
            mobile = jsonData.mobile || jsonData.phone_number || '';
        }
        
        if (!mobile) {
            console.log(`[WangChao] 未找到手机号，使用X-SESSION-ID作为标识`);
            mobile = xSessionId.substring(0, 15);
        }
        
        console.log(`[WangChao] 使用的标识: ${mobile}`);
        
        // ========== 3. 获取旧的密码（从存储中）==========
        let storedData = $prefs.valueForKey(STORAGE_KEY) || '';
        let oldPassword = '';
        
        if (storedData) {
            const lines = storedData.split('\n');
            for (let line of lines) {
                const parts = line.split('&');
                if (parts.length >= 1 && parts[0] === mobile) {
                    oldPassword = parts[1] || '';
                    console.log(`[WangChao] 找到旧密码: ${oldPassword ? '已设置' : '未设置'}`);
                    break;
                }
            }
        }
        
        // ========== 4. 格式化并保存 ==========
        const newData = `${mobile}&${oldPassword}&${userAgent}&${xSessionId}&${xRequestId}&${xTimestamp}&${xSignature}&${xTenantId}`;
        
        // 管理存储
        let dataArray = storedData ? storedData.split('\n').filter(item => item.trim() !== '') : [];
        let existingIndex = -1;
        
        for (let i = 0; i < dataArray.length; i++) {
            const parts = dataArray[i].split('&');
            if (parts.length >= 1 && parts[0] === mobile) {
                existingIndex = i;
                break;
            }
        }
        
        if (existingIndex === -1) {
            dataArray.push(newData);
            console.log(`[WangChao] 添加新账号`);
        } else {
            dataArray[existingIndex] = newData;
            console.log(`[WangChao] 更新账号`);
        }
        
        $prefs.setValueForKey(dataArray.join('\n'), STORAGE_KEY);
        
        $notify("✅ 王朝数据已更新", `标识: ${mobile.substring(0, 15)}`, `账号数: ${dataArray.length}`);
        
    } catch (error) {
        console.log(`[WangChao] 错误: ${error}`);
    }
    
    $done({});
})();