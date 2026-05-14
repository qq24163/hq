/*
[MITM]
hostname = vapp.taizhou.com.cn

[rewrite_local]
^https:\/\/vapp\.taizhou\.com\.cn\/api\/zbtxz\/login url script-response-body https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/wc.js
*/
// wc.js - 王朝账号更新器 (POST登录接口版本)
(function() {
    'use strict';

    const STORAGE_KEY = 'WangChao';
    const TARGET_URL = 'https://vapp.taizhou.com.cn/api/zbtxz/login';

    // --- 1. 确认请求目标 ---
    if (!$request || $request.url.indexOf(TARGET_URL) === -1) {
        $done({});
        return;
    }

    console.log(`[WangChao] 捕获到登录请求`);

    // --- 2. 从请求头获取需要更新的字段 ---
    const headers = $request.headers;
    const newUserAgent = headers['User-Agent'] || '';
    const newXSessionId = headers['X-SESSION-ID'] || headers['X-Session-Id'] || '';
    const newXRequestId = headers['X-REQUEST-ID'] || headers['X-Request-Id'] || '';
    const newXTimestamp = headers['X-TIMESTAMP'] || headers['X-Timestamp'] || '';
    const newXSignature = headers['X-SIGNATURE'] || headers['X-Signature'] || '';
    const newXTenantId = headers['X-TENANT-ID'] || headers['X-Tenant-Id'] || '';

    // --- 3. 从响应体获取手机号 ---
    const responseBody = $response.body;
    if (!responseBody) {
        console.log('[WangChao] 错误: 响应体为空');
        $done({});
        return;
    }

    let mobile = null;
    try {
        const jsonData = JSON.parse(responseBody);
        
        // 根据实际响应结构: data.account.mobile
        if (jsonData.data && jsonData.data.account && jsonData.data.account.mobile) {
            mobile = jsonData.data.account.mobile;
            console.log(`[WangChao] 从 data.account.mobile 提取手机号: ${mobile}`);
        }
        // 备用路径
        else if (jsonData.data && jsonData.data.mobile) {
            mobile = jsonData.data.mobile;
            console.log(`[WangChao] 从 data.mobile 提取手机号: ${mobile}`);
        }
        else if (jsonData.mobile) {
            mobile = jsonData.mobile;
            console.log(`[WangChao] 从 mobile 提取手机号: ${mobile}`);
        }
        
        if (!mobile && jsonData.data && jsonData.data.account && jsonData.data.account.phone_number) {
            mobile = jsonData.data.account.phone_number;
            console.log(`[WangChao] 从 phone_number 提取: ${mobile}`);
        }
    } catch (e) {
        console.log('[WangChao] 错误: 响应体 JSON 解析失败');
        $done({});
        return;
    }

    if (!mobile) {
        console.log('[WangChao] 错误: 未能从响应中提取到手机号');
        $notify("⚠️ 王朝助手", "登录失败", "未能从响应中获取手机号");
        $done({});
        return;
    }
    console.log(`[WangChao] 手机号: ${mobile}`);

    // --- 4. 读取 BoxJS 并查找账号 ---
    let storedData = $prefs.valueForKey(STORAGE_KEY) || '';
    if (!storedData) {
        console.log('[WangChao] BoxJS 中没有数据，跳过更新');
        $done({});
        return;
    }

    let accounts = storedData.split('\n').filter(function(line) {
        return line.trim() !== '';
    });
    
    let targetIndex = -1;
    let oldPassword = '';

    for (var i = 0; i < accounts.length; i++) {
        var fields = accounts[i].split('&');
        if (fields.length > 0 && fields[0] === mobile) {
            targetIndex = i;
            oldPassword = fields[1] || '';
            console.log('[WangChao] 找到已存在账号，密码已保留');
            break;
        }
    }

    // --- 5. 执行更新或跳过 ---
    if (targetIndex === -1) {
        console.log('[WangChao] 手机号 ' + mobile + ' 不存在于 BoxJS 中，跳过添加');
        $notify("⚠️ 王朝助手", "未找到账号", "手机号 " + mobile + " 不在列表中");
        $done({});
        return;
    }

    // 组装新数据
    var newData = mobile + '&' + oldPassword + '&' + newUserAgent + '&' + newXSessionId + '&' + newXRequestId + '&' + newXTimestamp + '&' + newXSignature + '&' + newXTenantId;
    
    accounts[targetIndex] = newData;
    $prefs.setValueForKey(accounts.join('\n'), STORAGE_KEY);

    console.log('[WangChao] 更新成功');
    $notify("✅ 王朝助手", "账号数据已更新", "手机号: " + mobile + "\n账号数: " + accounts.length);

    $done({});
})();