/*
[MITM]
hostname = vapp.taizhou.com.cn

[rewrite_local]
^https:\/\/vapp\.taizhou\.com\.cn\/api\/user_mumber\/account_detail\?osTypeCode=2 url script-response-body https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/wc.js
*/
// wc.js - 王朝账号更新器 (只更新已存在账号，保留密码)
(function() {
    'use strict';

    const STORAGE_KEY = 'WangChao';
    const TARGET_URL = 'https://vapp.taizhou.com.cn/api/user_mumber/account_detail';

    // --- 1. 确认请求目标 ---
    if (!$request || $request.url.indexOf(TARGET_URL) === -1) {
        $done({});
        return;
    }

    // --- 2. 获取请求头 (需要更新的新数据) ---
    const headers = $request.headers;
    const newUserAgent = headers['User-Agent'] || '';
    const newXSessionId = headers['X-SESSION-ID'] || headers['X-Session-Id'] || '';
    const newXRequestId = headers['X-REQUEST-ID'] || headers['X-Request-Id'] || '';
    const newXTimestamp = headers['X-TIMESTAMP'] || headers['X-Timestamp'] || '';
    const newXSignature = headers['X-SIGNATURE'] || headers['X-Signature'] || '';
    const newXTenantId = headers['X-TENANT-ID'] || headers['X-Tenant-Id'] || '';

    // --- 3. 获取响应体 (用于定位账号的手机号) ---
    const responseBody = $response.body;
    if (!responseBody) {
        console.log('[WangChao] 错误: 响应体为空');
        $done({});
        return;
    }

    // 解析 JSON 并提取手机号
    let mobile = null;
    try {
        const jsonData = JSON.parse(responseBody);
        // 手机号可能在 data.rst.mobile 路径下
        if (jsonData && jsonData.data && jsonData.data.rst && jsonData.data.rst.mobile) {
            mobile = jsonData.data.rst.mobile;
        }
        // 兼容其他可能的路径
        else if (jsonData && jsonData.data && jsonData.data.mobile) {
            mobile = jsonData.data.mobile;
        }
        else if (jsonData && jsonData.mobile) {
            mobile = jsonData.mobile;
        }
    } catch (e) {
        console.log('[WangChao] 错误: 响应体JSON解析失败');
        $done({});
        return;
    }

    if (!mobile) {
        console.log('[WangChao] 错误: 未能从响应中提取到手机号(mobile)');
        $done({});
        return;
    }
    console.log(`[WangChao] 从响应中提取到手机号: ${mobile}`);

    // --- 4. 读取 BoxJS 并查找账号 ---
    let storedData = $prefs.valueForKey(STORAGE_KEY) || '';
    if (!storedData) {
        console.log('[WangChao] BoxJS 中没有数据，跳过更新');
        $done({});
        return;
    }

    let accounts = storedData.split('\n').filter(line => line.trim() !== '');
    let targetIndex = -1;
    let oldPassword = '';

    // 按行查找匹配的手机号
    for (let i = 0; i < accounts.length; i++) {
        const fields = accounts[i].split('&');
        if (fields.length > 0 && fields[0] === mobile) {
            targetIndex = i;
            // 密码是第二个字段，必须保留
            oldPassword = fields[1] || '';
            console.log(`[WangChao] 找到手机号 ${mobile} 的旧记录，密码已保留`);
            break;
        }
    }

    // --- 5. 执行更新或跳过 ---
    if (targetIndex === -1) {
        console.log(`[WangChao] 手机号 ${mobile} 不存在于 BoxJS 中，跳过添加操作`);
        $notify("⚠️ 王朝助手", "未找到账号", `手机号 ${mobile}\n不在您的账号列表中，已跳过添加。`);
        $done({});
        return;
    }

    // 组装新数据，格式: 手机号&密码&User-Agent&X-SESSION-ID&X-REQUEST-ID&X-TIMESTAMP&X-SIGNATURE&X-TENANT-ID
    const newData = [
        mobile,
        oldPassword,
        newUserAgent,
        newXSessionId,
        newXRequestId,
        newXTimestamp,
        newXSignature,
        newXTenantId
    ].join('&');

    // 更新数组
    accounts[targetIndex] = newData;

    // 保存回 BoxJS
    $prefs.setValueForKey(accounts.join('\n'), STORAGE_KEY);

    console.log(`[WangChao] 成功更新手机号 ${mobile} 的请求头信息`);
    $notify("✅ 王朝助手", "账号数据已更新", `手机号: ${mobile}\n账号总数: ${accounts.length}`);

    $done({});
})();