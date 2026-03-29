/*
[MITM]
hostname = wxashopapi.heliang.cc

[rewrite_local]
# 康悦汇stoken捕获
^https:\/\/wxashopapi\.heliang\.cc\/wxa\/user\/editUserInfo url script-request-header https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/kyh.js
*/
// kyh.js - 捕获康悦汇请求头中的stoken（增强版，支持自动更新）
(function() {
    'use strict';
    
    const STORAGE_KEY = 'kyh';
    const TARGET_URL = 'https://wxashopapi.heliang.cc/wxa/user/editUserInfo';
    
    // 检查是否是目标URL
    if (!$request || !$request.url.indexOf(TARGET_URL) === -1) {
        $done({});
        return;
    }
    
    try {
        // 获取请求头部
        const headers = $request.headers;
        if (!headers) {
            console.log('[KYH] 请求头部为空');
            $done({});
            return;
        }
        
        // 获取stoken（注意大小写）
        let stoken = headers['stoken'] || headers['Stoken'] || headers['STOKEN'];
        if (!stoken) {
            console.log('[KYH] 未找到stoken头部');
            $done({});
            return;
        }
        
        console.log(`[KYH] 捕获到stoken: ${stoken.substring(0, 30)}...`);
        
        // 管理多账号数据
        manageKyhData(stoken);
        
    } catch (error) {
        console.log(`[KYH] 错误: ${error}`);
    }
    
    $done({});
    
    function manageKyhData(newStoken) {
        // 获取已存储的数据
        const storedData = $prefs.valueForKey(STORAGE_KEY) || '';
        let dataArray = storedData ? storedData.split('&').filter(item => item.trim() !== '') : [];
        
        // 检查是否已存在相同的stoken
        let existingIndex = -1;
        
        for (let i = 0; i < dataArray.length; i++) {
            if (dataArray[i] === newStoken) {
                existingIndex = i;
                console.log(`[KYH] 找到相同的stoken，索引: ${i}`);
                break;
            }
        }
        
        let action = '';
        
        if (existingIndex === -1) {
            // 新的stoken，添加到数组末尾
            dataArray.push(newStoken);
            action = '添加';
            console.log(`[KYH] 添加新的stoken`);
        } else {
            // 已存在，可以选择更新或跳过
            // 这里选择跳过，避免重复
            action = '跳过';
            console.log(`[KYH] stoken已存在，跳过添加`);
            $notify(
                "ℹ️ 康悦汇", 
                "Token已存在", 
                `该stoken已在列表中\n当前账号数: ${dataArray.length}`
            );
            $done({});
            return;
        }
        
        // 保存到BoxJS，用&分隔
        $prefs.setValueForKey(dataArray.join('&'), STORAGE_KEY);
        
        // 发送通知
        const title = action === '添加' ? "✅ 康悦汇Token已添加" : "ℹ️ 康悦汇Token已存在";
        const subtitle = `Token: ${newStoken.substring(0, 20)}...`;
        const message = `当前账号数: ${dataArray.length}\n操作: ${action}`;
        
        $notify(title, subtitle, message);
        
        // 自动复制当前stoken到剪贴板
        if (typeof $tool !== 'undefined' && $tool.copy) {
            $tool.copy(newStoken);
            console.log('[KYH] stoken已复制到剪贴板');
        }
        
        console.log(`[KYH] 保存成功，当前共 ${dataArray.length} 个账号`);
        console.log(`[KYH] 存储格式（&分隔）:`);
        dataArray.forEach((item, index) => {
            console.log(`  ${index + 1}. ${item.substring(0, 30)}...`);
        });
    }
})();