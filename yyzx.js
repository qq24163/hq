/*
-------------- Quantumult X 配置 --------------

[MITM]
hostname = n05.sentezhenxuan.com

[rewrite_local]
^https?://n05\.sentezhenxuan\.com/api/goods_details_user url script-response-body https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/yyzx.js
*/
// capture-sxsgtoken.js - 捕获Authorization和UID并格式化为YYZX格式
(function() {
    'use strict';
    
    const url = $request.url;
    
    // 检查是否是目标URL - 更新为新的接口
    if (!url.includes('n05.sentezhenxuan.com/api/goods_details_user')) {
        $done({});
        return;
    }
    
    try {
        // 处理请求 - 捕获Authorization
        if ($request && $request.headers) {
            const headers = $request.headers;
            const authorization = headers['Authori-zation'] || headers['Authorization'] || headers['authorization'];
            
            if (!authorization) {
                console.log('[YYZX] 未找到Authorization头部');
                $done({});
                return;
            }
            
            console.log(`[YYZX] 捕获到Authorization: ${authorization.substring(0, 20)}...`);
            
            // 保存当前Authorization到临时变量，等待响应
            $prefs.setValueForKey(authorization, 'yyzx_temp_authorization');
            
            // 立即返回，等待响应
            $done({});
            return;
        }
        
        // 处理响应 - 捕获UID
        if ($response && $response.body) {
            const authorization = $prefs.valueForKey('yyzx_temp_authorization');
            
            if (!authorization) {
                console.log('[YYZX] 没有找到临时保存的Authorization');
                $done({});
                return;
            }
            
            let body = $response.body;
            if (typeof body === 'string') {
                try {
                    body = JSON.parse(body);
                } catch (e) {
                    console.log('[YYZX] 响应体JSON解析失败');
                    $done({});
                    return;
                }
            }
            
            // 提取UID - 根据实际响应结构调整
            const uid = body.uid || body.data?.uid || body.user?.uid;
            
            if (!uid) {
                console.log('[YYZX] 未找到UID字段，响应体:', JSON.stringify(body).substring(0, 200));
                $done({});
                return;
            }
            
            console.log(`[YYZX] 捕获到UID: ${uid}, Authorization: ${authorization.substring(0, 15)}...`);
            
            // 保存到BoxJS的YYZX数据
            const storedData = $prefs.valueForKey('YYZX') || '';
            let dataArray = storedData ? storedData.split('\n').filter(item => item.trim() !== '') : [];
            
            // 查找是否已存在相同UID的记录
            let found = false;
            const newDataArray = dataArray.map(item => {
                const [existingUid] = item.split('#');
                if (existingUid === uid.toString()) {
                    found = true;
                    return `${uid}#${authorization}`; // 更新Authorization
                }
                return item;
            });
            
            if (!found) {
                // 新UID，添加到数组
                newDataArray.push(`${uid}#${authorization}`);
                
                // 限制最多保存10个账号
                if (newDataArray.length > 10) {
                    newDataArray.shift(); // 移除最早的账号
                }
            }
            
            // 保存到YYZX
            const newDataString = newDataArray.join('\n');
            $prefs.setValueForKey(newDataString, 'YYZX');
            
            // 清理临时数据
            $prefs.removeValueForKey('yyzx_temp_authorization');
            
            // 发送通知
            $notify(
                found ? "🔄 YYZX Token更新" : "✅ YYZX 新Token",
                `UID: ${uid}`,
                `账号数: ${newDataArray.length}\nToken: ${authorization.substring(0, 15)}...`
            );
            
            // 自动复制当前token
            if (typeof $tool !== 'undefined' && $tool.copy) {
                $tool.copy(authorization);
            }
        }
        
    } catch (error) {
        console.log(`[YYZX] 错误: ${error}`);
        // 清理临时数据
        $prefs.removeValueForKey('yyzx_temp_authorization');
    }
    
    $done({});
})();
