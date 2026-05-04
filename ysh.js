/*
[MITM]
hostname = h5forphone.wostore.cn

[rewrite_local]
# 悦生活用户信息捕获 (POST请求)
^https:\/\/h5forphone\.wostore\.cn\/h5forphone\/changxiangUser\/gResource url script-response-body https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/ysh.js
*/
// ysh.js - 捕获悦生活响应体中的memberId、accesstoken和usercode (支持POST请求)
(function() {
    'use strict';
    
    const STORAGE_KEY = 'ysh';
    const TARGET_URL = 'https://h5forphone.wostore.cn/h5forphone/changxiangUser/gResource';
    
    // 检查是否是目标URL
    if (!$request || !$request.url.indexOf(TARGET_URL) === -1) {
        $done({});
        return;
    }
    
    // 记录请求方法
    const requestMethod = $request.method || 'UNKNOWN';
    console.log(`[YSH] 请求方法: ${requestMethod}`);
    
    try {
        // 获取响应体
        const responseBody = $response.body;
        if (!responseBody) {
            console.log('[YSH] 响应体为空');
            $done({});
            return;
        }
        
        console.log(`[YSH] 响应内容长度: ${responseBody.length}`);
        console.log(`[YSH] 响应内容预览: ${responseBody.substring(0, 300)}`);
        
        // 解析JSON
        let jsonData;
        try {
            jsonData = JSON.parse(responseBody);
        } catch (e) {
            console.log(`[YSH] JSON解析失败: ${e}`);
            console.log(`[YSH] 原始响应: ${responseBody}`);
            $done({});
            return;
        }
        
        console.log(`[YSH] 完整JSON结构: ${JSON.stringify(jsonData, null, 2)}`);
        
        // 提取需要的字段（根据实际响应结构调整）
        let memberId = '';
        let accesstoken = '';
        let usercode = '';
        
        // 尝试多种可能的路径
        if (jsonData.data) {
            // 如果数据在data字段下
            memberId = jsonData.data.memberId || jsonData.data.member_id || jsonData.data.userId || jsonData.data.id || '';
            accesstoken = jsonData.data.accesstoken || jsonData.data.accessToken || jsonData.data.token || jsonData.data.access_token || '';
            usercode = jsonData.data.usercode || jsonData.data.userCode || jsonData.data.code || jsonData.data.user_code || '';
        } else if (jsonData.result) {
            // 如果数据在result字段下
            memberId = jsonData.result.memberId || jsonData.result.member_id || '';
            accesstoken = jsonData.result.accesstoken || jsonData.result.accessToken || '';
            usercode = jsonData.result.usercode || jsonData.result.userCode || '';
        } else {
            // 数据直接在根节点
            memberId = jsonData.memberId || jsonData.member_id || jsonData.userId || jsonData.id || '';
            accesstoken = jsonData.accesstoken || jsonData.accessToken || jsonData.token || jsonData.access_token || '';
            usercode = jsonData.usercode || jsonData.userCode || jsonData.code || jsonData.user_code || '';
        }
        
        if (!memberId || !accesstoken || !usercode) {
            console.log(`[YSH] 未找到完整数据 - memberId: "${memberId}", accesstoken: "${accesstoken}", usercode: "${usercode}"`);
            console.log(`[YSH] 请检查JSON结构，完整响应: ${JSON.stringify(jsonData)}`);
            
            // 发送通知提示用户查看日志
            $notify(
                "⚠️ YSH数据提取失败", 
                "请查看日志", 
                "JSON结构可能与预期不符，请检查日志中的完整响应"
            );
            $done({});
            return;
        }
        
        console.log(`[YSH] ✅ 捕获到完整数据:`);
        console.log(`[YSH]   memberId: ${memberId}`);
        console.log(`[YSH]   accesstoken: ${accesstoken.substring(0, 30)}...`);
        console.log(`[YSH]   usercode: ${usercode}`);
        
        // 格式化数据：memberId&accesstoken&usercode
        const newData = `${memberId}&${accesstoken}&${usercode}`;
        
        // 管理多账号
        manageYshData(memberId, accesstoken, usercode, newData);
        
    } catch (error) {
        console.log(`[YSH] 错误: ${error}`);
        console.log(`[YSH] 错误堆栈: ${error.stack}`);
    }
    
    $done({});
    
    function manageYshData(memberId, accesstoken, usercode, newData) {
        // 获取已存储的数据
        let storedData = $prefs.valueForKey(STORAGE_KEY) || '';
        console.log(`[YSH] 当前存储数据: ${storedData || '(空)'}`);
        
        // 解析现有数据（按换行分隔）
        let dataArray = storedData ? storedData.split('\n').filter(item => item.trim() !== '') : [];
        
        // 检查是否已存在相同的memberId
        let existingIndex = -1;
        let oldData = '';
        
        for (let i = 0; i < dataArray.length; i++) {
            const item = dataArray[i];
            const parts = item.split('&');
            if (parts.length > 0) {
                const storedMemberId = parts[0];
                if (storedMemberId === memberId) {
                    existingIndex = i;
                    oldData = item;
                    console.log(`[YSH] 找到相同memberId，索引: ${i}`);
                    break;
                }
            }
        }
        
        let action = '';
        
        if (existingIndex === -1) {
            // 新的memberId，添加到末尾
            dataArray.push(newData);
            action = '添加';
            console.log(`[YSH] 添加新账号，memberId: ${memberId}`);
        } else {
            // 已存在memberId，更新数据
            dataArray[existingIndex] = newData;
            action = '更新';
            console.log(`[YSH] 更新已有账号，memberId: ${memberId}`);
            if (oldData !== newData) {
                console.log(`[YSH]   旧数据: ${oldData}`);
                console.log(`[YSH]   新数据: ${newData}`);
            }
        }
        
        // 保存到BoxJS，用换行符分隔
        const newStoredData = dataArray.join('\n');
        $prefs.setValueForKey(newStoredData, STORAGE_KEY);
        
        // 发送通知
        const title = action === '添加' ? "✅ 悦生活账号已添加" : "🔄 悦生活数据已更新";
        const subtitle = `memberId: ${memberId}`;
        const message = `当前账号数: ${dataArray.length}`;
        
        $notify(title, subtitle, message);
        
        // 自动复制当前数据到剪贴板
        if (typeof $tool !== 'undefined' && $tool.copy) {
            $tool.copy(newData);
            console.log('[YSH] 数据已复制到剪贴板');
        }
        
        console.log(`[YSH] 保存成功，当前共 ${dataArray.length} 个账号`);
        console.log(`[YSH] ========== 当前所有账号 ==========`);
        dataArray.forEach((item, index) => {
            const parts = item.split('&');
            console.log(`  ${index + 1}. memberId: ${parts[0]}`);
        });
        console.log(`[YSH] ==================================`);
    }
})();