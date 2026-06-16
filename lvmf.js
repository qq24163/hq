/*
-------------- Quantumult X 配置 --------------

[MITM]
hostname = lmf.lvmifo.com

[rewrite_local]
# lvmf 平台 token 和手机号捕获
^https:\/\/lmf\.lvmifo\.com\/api\/5dca57afa379e\?m=getUserInfo url script-response-body https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/lvmf.js
*/
// lvmf.js - 捕获 lvmf 平台的 access-token、user-token 和手机号
(function() {
    'use strict';
    
    const TARGET_URL = 'https://lmf.lvmifo.com/api/5dca57afa379e?m=getUserInfo';
    const STORAGE_KEY = 'lvmf';
    const TEMP_KEY = 'lvmf_temp';
    
    // 保存数据到 BoxJS
    function saveData(accessToken, userToken, phone) {
        const storedData = $prefs.valueForKey(STORAGE_KEY) || '';
        // 按换行符分割，过滤空行
        let recordsArray = storedData ? storedData.split('\n').filter(r => r.trim() !== '') : [];
        
        // 新记录格式: access-token#user-token#phone (顺序与袋鼠不同)
        const newRecord = `${accessToken}#${userToken}#${phone}`;
        
        // 检查是否已存在相同 phone 的记录
        let isNewRecord = true;
        let accountNumber = recordsArray.length + 1;
        
        for (let i = 0; i < recordsArray.length; i++) {
            const parts = recordsArray[i].split('#');
            // 假设格式为 access-token#user-token#phone，phone 是第三个字段
            const existingPhone = parts.length === 3 ? parts[2] : '';
            if (existingPhone === phone) {
                isNewRecord = false;
                accountNumber = i + 1;
                recordsArray[i] = newRecord; // 更新为最新记录
                break;
            }
        }
        
        if (isNewRecord) {
            recordsArray.push(newRecord);
        }
        
        // 保存到 BoxJS，用换行符 \n 分隔
        $prefs.setValueForKey(recordsArray.join('\n'), STORAGE_KEY);
        
        // 发送通知
        const action = isNewRecord ? "已添加" : "已更新";
        const title = `✅ lvmf 平台账号${action}`;
        const subtitle = `账号${accountNumber} (手机: ${phone})`;
        const message = `access-token: ${accessToken.substring(0, 20)}...\nuser-token: ${userToken.substring(0, 20)}...`;
        
        $notify(title, subtitle, message);
        
        console.log(`[LVMF] 保存记录: ${newRecord}`);
        console.log(`[LVMF] 当前共存储 ${recordsArray.length} 个账号`);
        
        // 复制到剪贴板（可选）
        if (typeof $tool !== 'undefined' && $tool.copy) {
            $tool.copy(newRecord);
        }
    }
    
    try {
        // ========== 处理响应体（获取手机号） ==========
        if ($response && $response.body) {
            console.log('[LVMF] 处理响应体');
            
            const body = $response.body;
            const responseData = JSON.parse(body);
            
            // 注意：接口返回格式可能与袋鼠不同，这里判断 code 为 1 表示成功
            if (responseData.code === 1 && responseData.data && responseData.data.phone) {
                const phone = responseData.data.phone;
                console.log(`[LVMF] 捕获到手机号: ${phone}`);
                
                // 从临时存储获取 token
                const tempDataStr = $prefs.valueForKey(TEMP_KEY);
                if (tempDataStr) {
                    const tempData = JSON.parse(tempDataStr);
                    const accessToken = tempData.accessToken;
                    const userToken = tempData.userToken;
                    
                    if (accessToken && userToken) {
                        saveData(accessToken, userToken, phone);
                        // 清除临时数据
                        $prefs.removeValueForKey(TEMP_KEY);
                    } else {
                        console.log('[LVMF] 临时数据中 token 不完整');
                    }
                } else {
                    console.log('[LVMF] 未找到临时存储的 token，可能请求脚本未执行');
                }
            } else {
                console.log(`[LVMF] 响应体中没有手机号或 code 不为1 (code: ${responseData.code})`);
            }
        }
        
        // ========== 处理请求头（获取 token） ==========
        if ($request && $request.headers) {
            console.log('[LVMF] 处理请求头');
            
            const accessToken = $request.headers['access-token'] || $request.headers['Access-Token'];
            const userToken = $request.headers['user-token'] || $request.headers['User-Token'];
            
            if (accessToken && userToken) {
                console.log('[LVMF] 捕获到 token，暂存到临时变量');
                
                // 存储到临时变量，等响应体回来后再合并保存
                $prefs.setValueForKey(JSON.stringify({
                    accessToken: accessToken,
                    userToken: userToken,
                    timestamp: Date.now()
                }), TEMP_KEY);
            } else {
                console.log('[LVMF] 未找到完整的 token 信息');
            }
        }
        
    } catch (error) {
        console.log(`[LVMF] 错误: ${error}`);
        console.log(`[LVMF] 错误堆栈: ${error.stack}`);
    }
    
    $done({});
})();