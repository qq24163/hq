/*
[MITM]
hostname = dt.yuanhukj.com

[rewrite_local]
# 林泽园用户信息捕获
^https:\/\/dt\.yuanhukj\.com\/api\/mobile\/account\/user\/overview_my\?.* url script-response-body https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/lzy.js
*/
// lzy.js - 捕获林泽园请求头中的Authorization、app-sign和响应体中的user_id
// 支持根据user_id自动更新Authorization和app-sign
(function() {
    'use strict';
    
    const STORAGE_KEY = 'lzy';
    const TARGET_URL = 'https://dt.yuanhukj.com/api/mobile/account/user/overview_my';
    
    // 检查是否是目标URL
    if (!$request || !$request.url.indexOf(TARGET_URL) === -1) {
        $done({});
        return;
    }
    
    try {
        // 1. 从请求头中获取Authorization和app-sign
        const headers = $request.headers;
        if (!headers) {
            console.log('[LZY] 请求头部为空');
            $done({});
            return;
        }
        
        // 获取Authorization（注意大小写）
        let authorization = headers['Authorization'] || headers['authorization'];
        if (!authorization) {
            console.log('[LZY] 未找到Authorization头部');
            $done({});
            return;
        }
        
        // 去掉Bearer前缀（如果存在）
        let cleanAuth = authorization;
        if (authorization.startsWith('Bearer ') || authorization.startsWith('bearer ')) {
            cleanAuth = authorization.substring(7);
            console.log(`[LZY] 去掉Bearer后: ${cleanAuth.substring(0, 30)}...`);
        } else {
            console.log(`[LZY] Authorization: ${cleanAuth.substring(0, 30)}...`);
        }
        
        // 获取app-sign（注意大小写）
        let appSign = headers['app-sign'] || headers['App-Sign'] || headers['app_sign'] || headers['App_Sign'];
        if (!appSign) {
            console.log('[LZY] 未找到app-sign头部');
            appSign = '';
        } else {
            console.log(`[LZY] app-sign: ${appSign.substring(0, 30)}...`);
        }
        
        // 2. 从响应体中获取data.user_id
        const responseBody = $response.body;
        if (!responseBody) {
            console.log('[LZY] 响应体为空');
            $done({});
            return;
        }
        
        // 解析JSON
        let jsonData;
        try {
            jsonData = JSON.parse(responseBody);
        } catch (e) {
            console.log(`[LZY] JSON解析失败: ${e}`);
            $done({});
            return;
        }
        
        // 检查响应状态
        if (jsonData.code !== 0) {
            console.log(`[LZY] 响应状态码: ${jsonData.code}, msg: ${jsonData.msg}`);
            // 如果未登录，不保存数据
            if (jsonData.code === 30 || jsonData.msg.includes('未登录') || jsonData.msg.includes('token已经过期')) {
                console.log('[LZY] 用户未登录或token已过期，跳过保存');
                $done({});
                return;
            }
        }
        
        // 提取data.user_id
        const userId = jsonData.data?.user_id;
        if (!userId) {
            console.log(`[LZY] 未找到user_id字段`);
            $done({});
            return;
        }
        
        console.log(`[LZY] 捕获到user_id: ${userId}`);
        
        // 格式化数据：user_id#Authorization#app-sign
        const newData = `${userId}#${cleanAuth}#${appSign}`;
        
        // 管理多账号（支持根据user_id自动更新）
        manageLzyData(userId, cleanAuth, appSign, newData);
        
    } catch (error) {
        console.log(`[LZY] 错误: ${error}`);
    }
    
    $done({});
    
    function manageLzyData(userId, auth, appSign, newData) {
        // 获取已存储的数据
        const storedData = $prefs.valueForKey(STORAGE_KEY) || '';
        let dataArray = storedData ? storedData.split('\n').filter(item => item.trim() !== '') : [];
        
        // 检查是否已存在相同的user_id
        let existingIndex = -1;
        let oldAuth = '';
        let oldAppSign = '';
        
        for (let i = 0; i < dataArray.length; i++) {
            const parts = dataArray[i].split('#');
            if (parts.length >= 1) {
                const storedUserId = parts[0];
                if (storedUserId === userId) {
                    existingIndex = i;
                    oldAuth = parts.length >= 2 ? parts[1] : '';
                    oldAppSign = parts.length >= 3 ? parts[2] : '';
                    console.log(`[LZY] 找到相同user_id，索引: ${i}`);
                    break;
                }
            }
        }
        
        let action = '';
        
        if (existingIndex === -1) {
            // 新的user_id，添加到数组末尾
            dataArray.push(newData);
            action = '添加';
            console.log(`[LZY] 添加新账号，user_id: ${userId}`);
        } else {
            // 已存在user_id，更新数据
            dataArray[existingIndex] = newData;
            action = '更新';
            console.log(`[LZY] 更新已有账号，user_id: ${userId}`);
            if (oldAuth !== auth) {
                console.log(`[LZY]   Authorization已更新`);
            }
            if (oldAppSign !== appSign) {
                console.log(`[LZY]   app-sign已更新`);
            }
        }
        
        // 保存到BoxJS，用换行符分隔
        $prefs.setValueForKey(dataArray.join('\n'), STORAGE_KEY);
        
        // 发送通知
        const title = action === '添加' ? "✅ 林泽园账号已添加" : "🔄 林泽园数据已更新";
        const subtitle = `user_id: ${userId}`;
        const message = `当前账号数: ${dataArray.length}`;
        
        $notify(title, subtitle, message);
        
        // 自动复制当前数据到剪贴板
        if (typeof $tool !== 'undefined' && $tool.copy) {
            $tool.copy(newData);
            console.log('[LZY] 数据已复制到剪贴板');
        }
        
        console.log(`[LZY] 保存成功，当前共 ${dataArray.length} 个账号`);
        console.log(`[LZY] 存储格式: user_id#Authorization#app-sign`);
        dataArray.forEach((item, index) => {
            const parts = item.split('#');
            console.log(`  ${index + 1}. user_id: ${parts[0]}`);
        });
    }
})();