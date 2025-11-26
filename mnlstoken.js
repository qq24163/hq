/*

-------------- Quantumult X 配置 --------------

[MITM]
hostname = mcs.monalisagroup.com.cn

[rewrite_local]
# MNLS 请求主体表单数据捕获
^https:\/\/mcs\.monalisagroup\.com\.cn\/member\/doAction url script-request-body https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/mnlstoken.js
*/
// mnls.js - 捕获MNLS请求主体表单数据并管理多账号
(function() {
    'use strict';
    
    const TARGET_URL = 'mcs.monalisagroup.com.cn/member/doAction';
    
    // 检查是否是目标URL
    if (!$request || !$request.url.includes(TARGET_URL)) {
        $done({});
        return;
    }
    
    try {
        // 获取请求主体
        const body = $request.body;
        if (!body) {
            console.log('[MNLS] 请求主体为空');
            $done({});
            return;
        }
        
        let customerID, tokenStr;
        
        // 解析表单数据
        const params = new URLSearchParams(body);
        
        // 尝试获取CustomerID和tokenStr
        customerID = params.get('CustomerID') || params.get('customerid') || params.get('CustomerId');
        tokenStr = params.get('tokenStr') || params.get('tokenstr') || params.get('TokenStr');
        
        if (!customerID) {
            console.log('[MNLS] 未找到CustomerID参数');
            $done({});
            return;
        }
        
        if (!tokenStr) {
            console.log('[MNLS] 未找到tokenStr参数');
            $done({});
            return;
        }
        
        console.log(`[MNLS] 捕获到CustomerID: ${customerID}`);
        console.log(`[MNLS] 捕获到tokenStr: ${tokenStr.substring(0, 20)}...`);
        
        // 管理多账号
        manageMnlsData(customerID, tokenStr);
        
    } catch (error) {
        console.log(`[MNLS] 错误: ${error}`);
    }
    
    $done({});
    
    function manageMnlsData(newCustomerID, newTokenStr) {
        const STORAGE_KEY = 'MNLS';
        const storedData = $prefs.valueForKey(STORAGE_KEY) || '';
        let dataArray = storedData ? storedData.split('\n').filter(d => d.trim() !== '') : [];
        
        // 检查是否已存在相同CustomerID
        let isNewData = true;
        let accountNumber = dataArray.length + 1;
        
        // 遍历现有数据检查重复
        for (let i = 0; i < dataArray.length; i++) {
            const existingCustomerID = dataArray[i].split('#')[0];
            if (existingCustomerID === newCustomerID) {
                isNewData = false;
                accountNumber = i + 1;
                break;
            }
        }
        
        if (isNewData) {
            // 新数据，添加到数组，格式：CustomerID#tokenStr
            dataArray.push(`${newCustomerID}#${newTokenStr}`);
            
            // 保存到BoxJS
            $prefs.setValueForKey(dataArray.join('\n'), STORAGE_KEY);
        }
        
        // 发送精简通知
        const title = isNewData ? "✅ MNLS 数据已添加" : "🔄 MNLS 数据已存在";
        const subtitle = `账号${accountNumber}`;
        const message = `ID: ${newCustomerID} | Token: ${newTokenStr.substring(0, 10)}...`;
        
        $notify(title, subtitle, message);
        
        // 自动复制当前CustomerID#tokenStr
        if (typeof $tool !== 'undefined' && $tool.copy) {
            const copyData = `${newCustomerID}#${newTokenStr}`;
            $tool.copy(copyData);
            console.log('[MNLS] CustomerID#tokenStr已复制到剪贴板');
        }
    }
})();