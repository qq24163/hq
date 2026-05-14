/*
[MITM]
hostname = vapp.taizhou.com.cn

[rewrite_local]
# 王朝账号信息捕获（GET请求）
^https:\/\/vapp\.taizhou\.com\.cn\/api\/user_mumber\/account_detail\?osTypeCode=2 url script-request-header https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/wc.js
*/
// WangChao.js - 捕获王朝账户详情接口的请求头
// 抓取请求头：User-Agent, X-SESSION-ID, X-REQUEST-ID, X-TIMESTAMP, X-SIGNATURE, X-TENANT-ID
// 根据响应体中的手机号更新对应账号（保留密码）
(function() {
    'use strict';
    
    const STORAGE_KEY = 'WangChao';
    const TARGET_URL = 'https://vapp.taizhou.com.cn/api/user_mumber/account_detail';
    
    // 检查是否是目标URL
    if (!$request || $request.url.indexOf(TARGET_URL) === -1) {
        $done({});
        return;
    }
    
    console.log(`[WangChao] ========== 捕获请求 ==========`);
    console.log(`[WangChao] 请求方法: ${$request.method || 'UNKNOWN'}`);
    console.log(`[WangChao] 请求URL: ${$request.url}`);
    
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
        console.log(`[WangChao]   X-REQUEST-ID: ${xRequestId}`);
        console.log(`[WangChao]   X-TIMESTAMP: ${xTimestamp}`);
        console.log(`[WangChao]   X-SIGNATURE: ${xSignature.substring(0, 30)}...`);
        console.log(`[WangChao]   X-TENANT-ID: ${xTenantId}`);
        
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
        
        // 提取mobile（手机号）- 根据实际响应结构调整
        let mobile = '';
        
        // 尝试多种可能的路径
        if (jsonData.code === 10102) {
            console.log('[WangChao] 签名无效，可能需要先登录获取有效签名');
            // 仍然继续，因为可能请求头中有有效信息
        }
        
        if (jsonData.data) {
            if (jsonData.data.account) {
                mobile = jsonData.data.account.mobile || jsonData.data.account.phone_number || '';
            } else {
                mobile = jsonData.data.mobile || jsonData.data.phone_number || '';
            }
        } else {
            mobile = jsonData.mobile || jsonData.phone_number || '';
        }
        
        // 如果响应中没有手机号，尝试从请求头或URL中获取
        if (!mobile) {
            // 从X-SESSION-ID中可能包含用户信息
            console.log('[WangChao] 响应中未找到手机号，将使用请求头中的信息进行匹配');
            // 使用X-SESSION-ID的前几位作为临时标识
            mobile = xSessionId.substring(0, 15);
            console.log(`[WangChao] 使用X-SESSION-ID作为标识: ${mobile}`);
        }
        
        console.log(`[WangChao] 使用的标识: ${mobile}`);
        
        // ========== 3. 获取旧的密码（从存储中）==========
        let storedData = $prefs.valueForKey(STORAGE_KEY) || '';
        let oldPassword = '';
        let existingData = '';
        
        if (storedData) {
            // 按换行分隔查找对应标识的旧数据
            const lines = storedData.split('\n');
            for (let line of lines) {
                const parts = line.split('&');
                if (parts.length >= 1) {
                    // 比较手机号或session ID
                    const storedId = parts[0];
                    if (storedId === mobile || (xSessionId && storedId === xSessionId.substring(0, 15))) {
                        oldPassword = parts[1] || '';
                        existingData = line;
                        console.log(`[WangChao] 找到旧数据，密码: ${oldPassword ? '已设置' : '未设置'}`);
                        break;
                    }
                }
            }
        }
        
        // ========== 4. 格式化数据（保留旧密码）==========
        // 格式：标识&密码&User-Agent&X-SESSION-ID&X-REQUEST-ID&X-TIMESTAMP&X-SIGNATURE&X-TENANT-ID
        const newData = `${mobile}&${oldPassword}&${userAgent}&${xSessionId}&${xRequestId}&${xTimestamp}&${xSignature}&${xTenantId}`;
        
        // 管理多账号
        manageWangChaoData(mobile, oldPassword, newData);
        
    } catch (error) {
        console.log(`[WangChao] 错误: ${error}`);
    }
    
    $done({});
    
    function manageWangChaoData(mobile, password, newData) {
        // 获取已存储的数据
        let storedData = $prefs.valueForKey(STORAGE_KEY) || '';
        
        // 解析现有数据（按换行分隔）
        let dataArray = storedData ? storedData.split('\n').filter(item => item.trim() !== '') : [];
        
        // 检查是否已存在相同的标识
        let existingIndex = -1;
        
        for (let i = 0; i < dataArray.length; i++) {
            const item = dataArray[i];
            const parts = item.split('&');
            if (parts.length >= 1) {
                const storedId = parts[0];
                if (storedId === mobile) {
                    existingIndex = i;
                    console.log(`[WangChao] 找到相同标识，索引: ${i}`);
                    break;
                }
            }
        }
        
        let action = '';
        
        if (existingIndex === -1) {
            // 新的标识，添加到末尾
            dataArray.push(newData);
            action = '添加';
            console.log(`[WangChao] 添加新账号，标识: ${mobile}`);
            if (!password) {
                console.log(`[WangChao] 新账号密码为空，需要手动填写`);
            }
        } else {
            // 已存在标识，更新数据（保留密码）
            dataArray[existingIndex] = newData;
            action = '更新';
            console.log(`[WangChao] 更新已有账号，标识: ${mobile}`);
        }
        
        // 保存到BoxJS，用换行符分隔
        const newStoredData = dataArray.join('\n');
        $prefs.setValueForKey(newStoredData, STORAGE_KEY);
        
        // 发送通知
        let title = action === '添加' ? "✅ 王朝账号已添加" : "🔄 王朝数据已更新";
        let message = `当前账号数: ${dataArray.length}`;
        
        if (action === '添加' && !password) {
            title = "⚠️ 王朝新账号";
            message = `请手动填写密码（第2个字段）\n当前账号数: ${dataArray.length}`;
        }
        
        $notify(title, `标识: ${mobile.substring(0, 15)}...`, message);
        
        // 自动复制当前数据到剪贴板
        if (typeof $tool !== 'undefined' && $tool.copy) {
            $tool.copy(newData);
            console.log('[WangChao] 数据已复制到剪贴板');
        }
        
        console.log(`[WangChao] 保存成功，当前共 ${dataArray.length} 个账号`);
        console.log(`[WangChao] ========== 当前所有账号 ==========`);
        dataArray.forEach((item, index) => {
            const parts = item.split('&');
            const hasPwd = parts[1] ? '有密码' : '无密码';
            console.log(`  ${index + 1}. 标识: ${parts[0]}, ${hasPwd}`);
        });
        console.log(`[WangChao] ==================================`);
    }
})();