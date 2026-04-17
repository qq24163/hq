/*
[MITM]
hostname = dt.yuanhukj.com

[rewrite_local]
# 林泽园用户信息捕获
^https:\/\/dt\.yuanhukj\.com\/api\/mobile\/account\/weiXin\/getusertelephone\?.* url script-response-body https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/lzy.js
*/
// lzy.js - 捕获林泽园请求头中的Authorization、app-sign和响应体中的data
(function() {
    'use strict';
    
    const STORAGE_KEY = 'lzy';
    const TARGET_URL = 'https://dt.yuanhukj.com/api/mobile/account/weiXin/getusertelephone';
    
    // 检查是否是目标URL
    if (!$request || !$request.url.indexOf(TARGET_URL) === -1) {
        $done({});
        return;
    }
    
    try {
        // 1. 从请求头中获取Authorization
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
            cleanAuth = authorization.substring(7); // 去掉"Bearer "（7个字符）
            console.log(`[LZY] 原始Authorization: ${authorization.substring(0, 30)}...`);
            console.log(`[LZY] 去掉Bearer后: ${cleanAuth.substring(0, 30)}...`);
        } else {
            console.log(`[LZY] Authorization (无Bearer): ${cleanAuth.substring(0, 30)}...`);
        }
        
        // 2. 获取app-sign（注意大小写）
        let appSign = headers['app-sign'] || headers['App-Sign'] || headers['app_sign'] || headers['appsign'];
        if (!appSign) {
            console.log('[LZY] 未找到app-sign头部');
            // 继续执行，但记录日志
        } else {
            console.log(`[LZY] 捕获到app-sign: ${appSign.substring(0, 30)}...`);
        }
        
        // 3. 从响应体中获取data
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
        
        // 提取data字段
        const data = jsonData.data;
        if (data === undefined || data === null) {
            console.log(`[LZY] data字段为空: ${data}`);
            $done({});
            return;
        }
        
        // 将data转换为字符串（如果是对象则JSON序列化）
        let dataStr = '';
        if (typeof data === 'object') {
            dataStr = JSON.stringify(data);
        } else {
            dataStr = String(data);
        }
        
        console.log(`[LZY] 捕获到data: ${dataStr.substring(0, 50)}...`);
        
        // 检查响应是否成功（可选）
        if (jsonData.code !== 0) {
            console.log(`[LZY] 响应状态码: ${jsonData.code}, msg: ${jsonData.msg}`);
        }
        
        // 格式化数据：data#app-sign#Authorization
        let newData = '';
        if (appSign) {
            newData = `${dataStr}#${appSign}#${cleanAuth}`;
        } else {
            // 如果没有app-sign，用空字符串代替
            newData = `${dataStr}##${cleanAuth}`;
            console.log(`[LZY] app-sign为空，使用空字符串`);
        }
        
        // 管理多账号
        manageLzyData(dataStr, appSign || '', cleanAuth, newData);
        
    } catch (error) {
        console.log(`[LZY] 错误: ${error}`);
    }
    
    $done({});
    
    function manageLzyData(data, appSign, auth, newData) {
        // 获取已存储的数据
        const storedData = $prefs.valueForKey(STORAGE_KEY) || '';
        let dataArray = storedData ? storedData.split('\n').filter(item => item.trim() !== '') : [];
        
        // 检查是否已存在相同的Authorization
        let existingIndex = -1;
        let oldData = '';
        let oldAppSign = '';
        
        for (let i = 0; i < dataArray.length; i++) {
            const parts = dataArray[i].split('#');
            if (parts.length >= 3) {
                const storedAuth = parts[2];
                if (storedAuth === auth) {
                    existingIndex = i;
                    oldData = parts[0];
                    oldAppSign = parts[1];
                    console.log(`[LZY] 找到相同Authorization的旧数据，索引: ${i}`);
                    break;
                }
            }
        }
        
        let action = '';
        
        if (existingIndex === -1) {
            // 新的Authorization，添加到数组末尾
            dataArray.push(newData);
            action = '添加';
            console.log(`[LZY] 添加新账号，Authorization: ${auth.substring(0, 30)}...`);
        } else {
            // 已存在Authorization，检查data或app-sign是否变化
            if (oldData !== data || oldAppSign !== appSign) {
                // 有变化，更新
                dataArray[existingIndex] = newData;
                action = '更新';
                console.log(`[LZY] 更新已有账号，旧data: ${oldData.substring(0, 30)}..., 新data: ${data.substring(0, 30)}...`);
                if (oldAppSign !== appSign) {
                    console.log(`[LZY] app-sign已更新: ${oldAppSign} -> ${appSign}`);
                }
            } else {
                // 都没变化，跳过
                action = '跳过';
                console.log(`[LZY] 账号已存在且数据未变化，跳过保存`);
                $notify(
                    "ℹ️ 林泽园账号", 
                    "账号已存在", 
                    `Authorization: ${auth.substring(0, 20)}...\n当前账号数: ${dataArray.length}`
                );
                $done({});
                return;
            }
        }
        
        // 保存到BoxJS，用换行符分隔
        $prefs.setValueForKey(dataArray.join('\n'), STORAGE_KEY);
        
        // 发送通知
        let title = '';
        let subtitle = `Authorization: ${auth.substring(0, 15)}...`;
        let message = `data: ${data.substring(0, 20)}...\napp-sign: ${appSign.substring(0, 15)}...\n当前账号数: ${dataArray.length}`;
        
        if (action === '添加') {
            title = "✅ 林泽园账号已添加";
        } else if (action === '更新') {
            title = "🔄 林泽园数据已更新";
            message = `旧data: ${oldData.substring(0, 15)}...\n新data: ${data.substring(0, 15)}...\n当前账号数: ${dataArray.length}`;
        }
        
        $notify(title, subtitle, message);
        
        // 自动复制当前数据到剪贴板
        if (typeof $tool !== 'undefined' && $tool.copy) {
            $tool.copy(newData);
            console.log('[LZY] 数据已复制到剪贴板');
        }
        
        console.log(`[LZY] 保存成功，当前共 ${dataArray.length} 个账号`);
        console.log(`[LZY] 存储格式（换行分隔，格式: data#app-sign#Authorization）:`);
        dataArray.forEach((item, index) => {
            const parts = item.split('#');
            console.log(`  ${index + 1}. data: ${parts[0].substring(0, 30)}..., app-sign: ${parts[1].substring(0, 20)}..., Authorization: ${parts[2].substring(0, 30)}...`);
        });
    }
})();