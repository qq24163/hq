/*
[MITM]
hostname = dt.yuanhukj.com

[rewrite_local]
# 林泽园用户信息捕获
^https:\/\/dt\.yuanhukj\.com\/api\/mobile\/account\/user\/overview_my\?.* url script-response-body https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/lzy.js
*/
// lzy.js - 捕获林泽园请求头中的Authorization、app-sign和响应体中的user_id
// 修复：正确识别相同user_id并更新
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
        
        // 获取Authorization
        let authorization = headers['Authorization'] || headers['authorization'];
        if (!authorization) {
            console.log('[LZY] 未找到Authorization头部');
            $done({});
            return;
        }
        
        // 去掉Bearer前缀
        let cleanAuth = authorization;
        if (authorization.startsWith('Bearer ') || authorization.startsWith('bearer ')) {
            cleanAuth = authorization.substring(7);
            console.log(`[LZY] 去掉Bearer后: ${cleanAuth.substring(0, 30)}...`);
        } else {
            console.log(`[LZY] Authorization: ${cleanAuth.substring(0, 30)}...`);
        }
        
        // 获取app-sign
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
            if (jsonData.code === 30 || (jsonData.msg && (jsonData.msg.includes('未登录') || jsonData.msg.includes('token已经过期')))) {
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
        
        // 转为字符串并去除空白字符
        const userIdStr = String(userId).trim();
        console.log(`[LZY] 捕获到user_id: "${userIdStr}"`);
        
        // 格式化数据
        const newData = `${userIdStr}#${cleanAuth}#${appSign}`;
        
        // 管理多账号
        manageLzyData(userIdStr, cleanAuth, appSign, newData);
        
    } catch (error) {
        console.log(`[LZY] 错误: ${error}`);
    }
    
    $done({});
    
    function manageLzyData(userId, auth, appSign, newData) {
        // 获取已存储的数据
        let storedData = $prefs.valueForKey(STORAGE_KEY) || '';
        console.log(`[LZY] 原始存储数据: "${storedData}"`);
        
        // 分割并清理每一行
        let dataArray = [];
        if (storedData) {
            // 按换行符分割，过滤空行，并清理每行首尾空格
            const lines = storedData.split('\n');
            for (let line of lines) {
                const trimmedLine = line.trim();
                if (trimmedLine !== '') {
                    dataArray.push(trimmedLine);
                }
            }
        }
        
        console.log(`[LZY] 当前存储 ${dataArray.length} 条记录`);
        
        // 查找是否存在相同的user_id
        let existingIndex = -1;
        let oldData = '';
        
        for (let i = 0; i < dataArray.length; i++) {
            const line = dataArray[i];
            // 提取第一个#之前的内容作为user_id
            const firstHashIndex = line.indexOf('#');
            if (firstHashIndex !== -1) {
                const storedUserId = line.substring(0, firstHashIndex).trim();
                console.log(`[LZY] 比较: 存储的user_id="${storedUserId}" vs 新的user_id="${userId}"`);
                if (storedUserId === userId) {
                    existingIndex = i;
                    oldData = line;
                    console.log(`[LZY] 找到相同user_id，索引: ${i}`);
                    break;
                }
            }
        }
        
        let action = '';
        
        if (existingIndex === -1) {
            // 新的user_id，添加到末尾
            dataArray.push(newData);
            action = '添加';
            console.log(`[LZY] 添加新账号，user_id: ${userId}`);
        } else {
            // 已存在，更新
            dataArray[existingIndex] = newData;
            action = '更新';
            console.log(`[LZY] 更新已有账号，user_id: ${userId}`);
            console.log(`[LZY] 旧数据: ${oldData.substring(0, 80)}...`);
            console.log(`[LZY] 新数据: ${newData.substring(0, 80)}...`);
        }
        
        // 保存到BoxJS
        const newStoredData = dataArray.join('\n');
        $prefs.setValueForKey(newStoredData, STORAGE_KEY);
        
        // 发送通知
        const title = action === '添加' ? "✅ 林泽园账号已添加" : "🔄 林泽园数据已更新";
        const subtitle = `user_id: ${userId}`;
        const message = `当前账号数: ${dataArray.length}`;
        
        $notify(title, subtitle, message);
        
        // 自动复制
        if (typeof $tool !== 'undefined' && $tool.copy) {
            $tool.copy(newData);
            console.log('[LZY] 数据已复制到剪贴板');
        }
        
        console.log(`[LZY] 保存成功，当前共 ${dataArray.length} 个账号`);
        console.log(`[LZY] ========== 当前所有账号 ==========`);
        dataArray.forEach((item, index) => {
            const firstHash = item.indexOf('#');
            const uid = firstHash !== -1 ? item.substring(0, firstHash) : 'unknown';
            console.log(`  ${index + 1}. user_id: ${uid}`);
        });
        console.log(`[LZY] ==================================`);
    }
})();