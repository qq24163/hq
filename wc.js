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
        console.log(`[WangChao] X-REQUEST-ID: ${xRequestId}`);
        console.log(`[WangChao] X-TIMESTAMP: ${xTimestamp}`);
        console.log(`[WangChao] X-SIGNATURE: ${xSignature.substring(0, 30)}...`);
        console.log(`[WangChao] X-TENANT-ID: ${xTenantId}`);
        
        // ========== 2. 获取响应体中的手机号 ==========
        const responseBody = $response.body;
        if (!responseBody) {
            console.log('[WangChao] 响应体为空');
            $done({});
            return;
        }
        
        console.log(`[WangChao] 原始响应体长度: ${responseBody.length}`);
        
        let jsonData;
        try {
            jsonData = JSON.parse(responseBody);
            console.log(`[WangChao] JSON解析成功`);
        } catch (e) {
            console.log(`[WangChao] JSON解析失败: ${e}`);
            $done({});
            return;
        }
        
        // ========== 3. 提取手机号（修复路径：data.rst.mobile）==========
        let mobile = '';
        
        // 路径1: data.rst.mobile（根据实际响应结构）
        if (jsonData.data && jsonData.data.rst && jsonData.data.rst.mobile) {
            mobile = jsonData.data.rst.mobile;
            console.log(`[WangChao] 从 data.rst.mobile 提取: ${mobile}`);
        }
        // 路径2: data.mobile
        else if (jsonData.data && jsonData.data.mobile) {
            mobile = jsonData.data.mobile;
            console.log(`[WangChao] 从 data.mobile 提取: ${mobile}`);
        }
        // 路径3: data.account.mobile
        else if (jsonData.data && jsonData.data.account && jsonData.data.account.mobile) {
            mobile = jsonData.data.account.mobile;
            console.log(`[WangChao] 从 data.account.mobile 提取: ${mobile}`);
        }
        // 路径4: mobile
        else if (jsonData.mobile) {
            mobile = jsonData.mobile;
            console.log(`[WangChao] 从 mobile 提取: ${mobile}`);
        }
        
        if (!mobile) {
            console.log(`[WangChao] ❌ 未找到手机号，跳过更新`);
            $done({});
            return;
        }
        
        console.log(`[WangChao] ✅ 捕获到手机号: ${mobile}`);
        
        // ========== 4. 获取存储的数据 ==========
        let storedData = $prefs.valueForKey(STORAGE_KEY) || '';
        if (!storedData) {
            console.log(`[WangChao] BoxJS中无数据，跳过更新`);
            $done({});
            return;
        }
        
        console.log(`[WangChao] 存储数据预览: ${storedData.substring(0, 100)}...`);
        
        let dataArray = storedData.split('\n').filter(item => item.trim() !== '');
        let existingIndex = -1;
        let oldPassword = '';
        let oldData = '';
        
        // 查找是否存在该手机号
        for (let i = 0; i < dataArray.length; i++) {
            const parts = dataArray[i].split('&');
            if (parts.length >= 1) {
                const storedMobile = parts[0];
                if (storedMobile === mobile) {
                    existingIndex = i;
                    oldPassword = parts[1] || '';
                    oldData = dataArray[i];
                    console.log(`[WangChao] ✅ 找到已存在账号，索引: ${i}`);
                    break;
                }
            }
        }
        
        // 如果不存在，跳过不添加
        if (existingIndex === -1) {
            console.log(`[WangChao] ❌ 手机号 ${mobile} 不在BoxJS中，跳过更新`);
            $notify("⚠️ 王朝", "未找到账号", `手机号 ${mobile} 不在列表中，请先手动添加`);
            $done({});
            return;
        }
        
        // ========== 5. 更新数据（保留密码）==========
        // 格式：手机号&密码&User-Agent&X-SESSION-ID&X-REQUEST-ID&X-TIMESTAMP&X-SIGNATURE&X-TENANT-ID
        const newData = `${mobile}&${oldPassword}&${userAgent}&${xSessionId}&${xRequestId}&${xTimestamp}&${xSignature}&${xTenantId}`;
        
        console.log(`[WangChao] 旧数据: ${oldData.substring(0, 80)}...`);
        console.log(`[WangChao] 新数据: ${newData.substring(0, 80)}...`);
        
        dataArray[existingIndex] = newData;
        
        // 保存到BoxJS
        $prefs.setValueForKey(dataArray.join('\n'), STORAGE_KEY);
        
        $notify("✅ 王朝数据已更新", `手机号: ${mobile}`, `账号数: ${dataArray.length}`);
        
        // 自动复制到剪贴板
        if (typeof $tool !== 'undefined' && $tool.copy) {
            $tool.copy(newData);
            console.log('[WangChao] 数据已复制到剪贴板');
        }
        
        console.log(`[WangChao] 更新成功！`);
        console.log(`[WangChao] ========== 当前所有账号 ==========`);
        dataArray.forEach((item, index) => {
            const parts = item.split('&');
            console.log(`  ${index + 1}. 手机号: ${parts[0]}, 密码: ${parts[1] ? '有' : '无'}`);
        });
        
    } catch (error) {
        console.log(`[WangChao] 错误: ${error}`);
    }
    
    $done({});
})();