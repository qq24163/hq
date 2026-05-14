/*
[MITM]
hostname = vapp.taizhou.com.cn

[rewrite_local]
# 王朝账号信息捕获（响应体脚本）
^https:\/\/vapp\.taizhou\.com\.cn\/api\/user_mumber\/account_detail\?osTypeCode=2 url script-response-body https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/wc.js
*/
// wc.js - 捕获王朝账户详情接口的请求头和响应体（只更新已存在账号）
(function() {
    'use strict';
    
    const STORAGE_KEY = 'WangChao';
    const TARGET_URL = 'https://vapp.taizhou.com.cn/api/user_mumber/account_detail';
    
    console.log(`[WangChao] ========== 捕获请求 ==========`);
    
    if (!$request || $request.url.indexOf(TARGET_URL) === -1) {
        $done({});
        return;
    }
    
    console.log(`[WangChao] 请求方法: ${$request.method || 'UNKNOWN'}`);
    
    try {
        // ========== 1. 获取请求头部信息 ==========
        const headers = $request.headers;
        if (!headers) {
            console.log('[WangChao] 请求头部为空');
            $done({});
            return;
        }
        
        let userAgent = headers['User-Agent'] || headers['user-agent'] || '';
        let xSessionId = headers['X-SESSION-ID'] || headers['X-Session-Id'] || headers['x-session-id'] || '';
        let xRequestId = headers['X-REQUEST-ID'] || headers['X-Request-Id'] || headers['x-request-id'] || '';
        let xTimestamp = headers['X-TIMESTAMP'] || headers['X-Timestamp'] || headers['x-timestamp'] || '';
        let xSignature = headers['X-SIGNATURE'] || headers['X-Signature'] || headers['x-signature'] || '';
        let xTenantId = headers['X-TENANT-ID'] || headers['X-Tenant-Id'] || headers['x-tenant-id'] || '';
        
        console.log(`[WangChao] User-Agent: ${userAgent.substring(0, 50)}...`);
        console.log(`[WangChao] X-SESSION-ID: ${xSessionId.substring(0, 30)}...`);
        
        // ========== 2. 获取响应体中的手机号 ==========
        const responseBody = $response.body;
        if (!responseBody) {
            console.log('[WangChao] 响应体为空');
            $done({});
            return;
        }
        
        let jsonData;
        try {
            jsonData = JSON.parse(responseBody);
        } catch (e) {
            console.log(`[WangChao] JSON解析失败: ${e}`);
            $done({});
            return;
        }
        
        // 提取手机号
        let mobile = '';
        if (jsonData.data && jsonData.data.mobile) {
            mobile = jsonData.data.mobile;
        }
        
        if (!mobile) {
            console.log(`[WangChao] 未找到手机号，跳过更新`);
            $done({});
            return;
        }
        
        console.log(`[WangChao] ✅ 捕获到手机号: ${mobile}`);
        
        // ========== 3. 获取存储的数据 ==========
        let storedData = $prefs.valueForKey(STORAGE_KEY) || '';
        if (!storedData) {
            console.log(`[WangChao] BoxJS中无数据，跳过更新`);
            $done({});
            return;
        }
        
        let dataArray = storedData.split('\n').filter(item => item.trim() !== '');
        let existingIndex = -1;
        let oldPassword = '';
        
        // 查找是否存在该手机号
        for (let i = 0; i < dataArray.length; i++) {
            const parts = dataArray[i].split('&');
            if (parts.length >= 1 && parts[0] === mobile) {
                existingIndex = i;
                oldPassword = parts[1] || '';
                console.log(`[WangChao] 找到已存在账号，手机号: ${mobile}`);
                break;
            }
        }
        
        // 如果不存在，跳过不添加
        if (existingIndex === -1) {
            console.log(`[WangChao] ❌ 手机号 ${mobile} 不在BoxJS中，跳过更新`);
            $notify("⚠️ 王朝", "未找到账号", `手机号 ${mobile} 不在列表中，请先手动添加`);
            $done({});
            return;
        }
        
        // ========== 4. 更新数据（保留密码）==========
        const newData = `${mobile}&${oldPassword}&${userAgent}&${xSessionId}&${xRequestId}&${xTimestamp}&${xSignature}&${xTenantId}`;
        dataArray[existingIndex] = newData;
        
        // 保存到BoxJS
        $prefs.setValueForKey(dataArray.join('\n'), STORAGE_KEY);
        
        $notify("✅ 王朝数据已更新", `手机号: ${mobile}`, `账号数: ${dataArray.length}`);
        
        // 自动复制到剪贴板
        if (typeof $tool !== 'undefined' && $tool.copy) {
            $tool.copy(newData);
        }
        
        console.log(`[WangChao] 更新成功，手机号: ${mobile}`);
        
    } catch (error) {
        console.log(`[WangChao] 错误: ${error}`);
    }
    
    $done({});
})();