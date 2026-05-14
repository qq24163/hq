/*
[MITM]
hostname = vapp.taizhou.com.cn, xmt.taizhou.com.cn

[rewrite_local]
# 王朝统一登录信息捕获
^https:\/\/vapp\.taizhou\.com\.cn\/api\/user_mumber\/account_detail\?.* url script-response-body https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/wc.js
^https:\/\/xmt\.taizhou\.com\.cn\/prod-api\/user-read\/app\/login url script-response-body https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/wc.js
*/
// WangChao.js - 统一捕获王朝账号详情接口和登录接口
// 接口1: vapp.taizhou.com.cn/api/user_mumber/account_detail - 捕获请求头字段，提取手机号
// 接口2: xmt.taizhou.com.cn/prod-api/user-read/app/login - 捕获User-Agent2，按顺序匹配更新
// 存储格式：手机号&密码&User-Agent1&X-SESSION-ID&X-REQUEST-ID&X-TIMESTAMP&X-SIGNATURE&X-TENANT-ID&User-Agent2
(function() {
    'use strict';
    
    const STORAGE_KEY = 'WangChao';
    
    // 两个接口的URL
    const URL_VAPP = 'https://vapp.taizhou.com.cn/api/user_mumber/account_detail';
    const URL_XMT = 'https://xmt.taizhou.com.cn/prod-api/user-read/app/login';
    
    // 记录xmt请求次数（用于顺序匹配）
    let xmtRequestCount = 0;
    
    // 判断是哪个接口
    const isVapp = $request && $request.url.indexOf(URL_VAPP) !== -1;
    const isXmt = $request && $request.url.indexOf(URL_XMT) !== -1;
    
    if (!isVapp && !isXmt) {
        $done({});
        return;
    }
    
    console.log(`[WangChao] 接口: ${isVapp ? 'vapp(账号详情)' : 'xmt(登录接口-顺序匹配)'}`);
    
    try {
        // 获取请求头
        const headers = $request.headers;
        if (!headers) {
            console.log('[WangChao] 请求头部为空');
            $done({});
            return;
        }
        
        // 获取User-Agent
        let userAgent = headers['User-Agent'] || headers['user-agent'] || '';
        
        if (isVapp) {
            // ========== vapp接口：捕获所有请求头字段 ==========
            let xSessionId = headers['X-SESSION-ID'] || headers['X-Session-Id'] || headers['x-session-id'] || '';
            let xRequestId = headers['X-REQUEST-ID'] || headers['X-Request-Id'] || headers['x-request-id'] || '';
            let xTimestamp = headers['X-TIMESTAMP'] || headers['X-Timestamp'] || headers['x-timestamp'] || '';
            let xSignature = headers['X-SIGNATURE'] || headers['X-Signature'] || headers['x-signature'] || '';
            let xTenantId = headers['X-TENANT-ID'] || headers['X-Tenant-Id'] || headers['x-tenant-id'] || '';
            
            console.log(`[WangChao] User-Agent1: ${userAgent.substring(0, 50)}...`);
            console.log(`[WangChao] X-SESSION-ID: ${xSessionId.substring(0, 30)}...`);
            console.log(`[WangChao] X-SIGNATURE: ${xSignature.substring(0, 30)}...`);
            
            // 获取响应体中的手机号
            const responseBody = $response.body;
            let mobile = '';
            
            if (responseBody) {
                mobile = extractMobileFromResponse(responseBody);
            }
            
            if (!mobile) {
                console.log('[WangChao] 未找到手机号，使用时间戳作为临时标识');
                mobile = `temp_${Date.now()}`;
            }
            
            console.log(`[WangChao] 手机号: ${mobile}`);
            
            // 获取旧数据中的密码和User-Agent2
            let oldPassword = '';
            let oldUserAgent2 = '';
            let storedData = $prefs.valueForKey(STORAGE_KEY) || '';
            
            if (storedData) {
                const lines = storedData.split('\n');
                for (let line of lines) {
                    const parts = line.split('&');
                    if (parts.length >= 1 && parts[0] === mobile) {
                        oldPassword = parts.length >= 2 ? parts[1] : '';
                        oldUserAgent2 = parts.length >= 9 ? parts[8] : '';
                        console.log(`[WangChao] 找到旧数据，密码: ${oldPassword ? '已设置' : '未设置'}`);
                        break;
                    }
                }
            }
            
            // 构建新数据（9个字段）
            const newData = `${mobile}&${oldPassword}&${userAgent}&${xSessionId}&${xRequestId}&${xTimestamp}&${xSignature}&${xTenantId}&${oldUserAgent2}`;
            
            // 保存数据
            saveWangChaoData(mobile, newData);
            
        } else if (isXmt) {
            // ========== xmt接口：按顺序更新User-Agent2 ==========
            console.log(`[WangChao] User-Agent2: ${userAgent.substring(0, 80)}...`);
            
            // 按顺序匹配更新
            updateUserAgent2ByOrder(userAgent);
        }
        
    } catch (error) {
        console.log(`[WangChao] 错误: ${error}`);
    }
    
    $done({});
    
    // ========== 从响应体提取手机号 ==========
    function extractMobileFromResponse(responseBody) {
        try {
            let jsonData = JSON.parse(responseBody);
            let mobile = '';
            
            // 尝试多种路径
            if (jsonData.data) {
                if (jsonData.data.account) {
                    mobile = jsonData.data.account.mobile || jsonData.data.account.phone_number || '';
                } else {
                    mobile = jsonData.data.mobile || jsonData.data.phone_number || '';
                }
            } else {
                mobile = jsonData.mobile || jsonData.phone_number || '';
            }
            
            return mobile;
        } catch (e) {
            console.log(`[WangChao] JSON解析失败: ${e}`);
            return '';
        }
    }
    
    // ========== 保存数据（vapp接口） ==========
    function saveWangChaoData(mobile, newData) {
        let storedData = $prefs.valueForKey(STORAGE_KEY) || '';
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
            console.log(`[WangChao] 添加新账号，手机号: ${mobile}`);
        } else {
            dataArray[existingIndex] = newData;
            console.log(`[WangChao] 更新账号，手机号: ${mobile}`);
        }
        
        $prefs.setValueForKey(dataArray.join('\n'), STORAGE_KEY);
        
        const title = existingIndex === -1 ? "✅ 王朝账号已添加" : "🔄 王朝数据已更新";
        const message = `当前账号数: ${dataArray.length}${existingIndex === -1 ? '\n请手动填写密码(第2字段)' : ''}`;
        
        $notify(title, `手机号: ${mobile}`, message);
        
        console.log(`[WangChao] 保存成功，当前共 ${dataArray.length} 个账号`);
        console.log(`[WangChao] ========== 当前所有账号 ==========`);
        dataArray.forEach((item, index) => {
            const parts = item.split('&');
            console.log(`  ${index + 1}. 手机号: ${parts[0]}`);
        });
        console.log(`[WangChao] ==================================`);
    }
    
    // ========== 按顺序匹配更新User-Agent2（xmt接口） ==========
    function updateUserAgent2ByOrder(newUserAgent2) {
        let storedData = $prefs.valueForKey(STORAGE_KEY) || '';
        
        if (!storedData) {
            console.log('[WangChao] 存储为空，无法更新User-Agent2');
            $notify("⚠️ 王朝", "存储为空", "请先通过账号详情接口添加账号");
            return;
        }
        
        let dataArray = storedData.split('\n').filter(item => item.trim() !== '');
        
        if (dataArray.length === 0) {
            console.log('[WangChao] 无账号数据');
            $notify("⚠️ 王朝", "无账号数据", "请先通过账号详情接口添加账号");
            return;
        }
        
        // 按顺序循环匹配
        let index = xmtRequestCount % dataArray.length;
        let parts = dataArray[index].split('&');
        let mobile = parts[0];
        
        // 补齐到9个字段
        while (parts.length < 9) {
            parts.push('');
        }
        
        // 更新第9个字段（User-Agent2）
        parts[8] = newUserAgent2;
        dataArray[index] = parts.join('&');
        
        // 保存更新后的数据
        $prefs.setValueForKey(dataArray.join('\n'), STORAGE_KEY);
        
        // 记录请求次数
        xmtRequestCount++;
        
        console.log(`[WangChao] 顺序匹配: 第${xmtRequestCount}次xmt请求 -> 更新第${index + 1}个账号`);
        console.log(`[WangChao]   手机号: ${mobile}`);
        console.log(`[WangChao]   User-Agent2: ${newUserAgent2.substring(0, 80)}...`);
        
        $notify(
            "✅ 王朝User-Agent2已更新",
            `第${index + 1}个账号 | 手机号: ${mobile}`,
            `当前已更新次数: ${xmtRequestCount}`
        );
    }
})();