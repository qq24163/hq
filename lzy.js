/*
[MITM]
hostname = dt.yuanhukj.com

[rewrite_local]
# 林泽园用户信息捕获
^https:\/\/dt\.yuanhukj\.com\/api\/mobile\/account\/weiXin\/getusertelephone\?.* url script-response-body https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/lzy.js
*/
// lzy.js - 捕获林泽园请求头中的Authorization和响应体中的data
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
        
        // 2. 从响应体中获取data
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
        
        // 检查响应是否成功（可选：根据实际需求判断）
        if (jsonData.code !== 0) {
            console.log(`[LZY] 响应状态码: ${jsonData.code}, msg: ${jsonData.msg}`);
            // 即使未登录也继续保存？这里选择保存，因为可能有data信息
        }
        
        // 格式化数据：data#Authorization
        const newData = `${dataStr}#${cleanAuth}`;
        
        // 管理多账号
        manageLzyData(dataStr, cleanAuth, newData);
        
    } catch (error) {
        console.log(`[LZY] 错误: ${error}`);
    }
    
    $done({});
    
    function manageLzyData(data, auth, newData) {
        // 获取已存储的数据
        const storedData = $prefs.valueForKey(STORAGE_KEY) || '';
        let dataArray = storedData ? storedData.split('\n').filter(item => item.trim() !== '') : [];
        
        // 检查是否已存在相同的Authorization
        let existingIndex = -1;
        let oldData = '';
        
        for (let i = 0; i < dataArray.length; i++) {
            const storedAuth = dataArray[i].split('#')[1];
            if (storedAuth === auth) {
                existingIndex = i;
                oldData = dataArray[i].split('#')[0];
                console.log(`[LZY] 找到相同Authorization的旧数据，索引: ${i}`);
                break;
            }
        }
        
        let action = '';
        
        if (existingIndex === -1) {
            // 新的Authorization，添加到数组末尾
            dataArray.push(newData);
            action = '添加';
            console.log(`[LZY] 添加新账号，Authorization: ${auth.substring(0, 30)}...`);
        } else {
            // 已存在Authorization，检查data是否变化
            if (oldData !== data) {
                // data有变化，更新
                dataArray[existingIndex] = newData;
                action = '更新';
                console.log(`[LZY] 更新已有账号的data，旧data: ${oldData.substring(0, 30)}..., 新data: ${data.substring(0, 30)}...`);
            } else {
                // data没变化，跳过
                action = '跳过';
                console.log(`[LZY] 账号已存在且data未变化，跳过保存`);
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
        let message = `data: ${data.substring(0, 30)}...\n当前账号数: ${dataArray.length}`;
        
        if (action === '添加') {
            title = "✅ 林泽园账号已添加";
        } else if (action === '更新') {
            title = "🔄 林泽园数据已更新";
            message = `旧data: ${oldData.substring(0, 20)}...\n新data: ${data.substring(0, 20)}...\n当前账号数: ${dataArray.length}`;
        }
        
        $notify(title, subtitle, message);
        
        // 自动复制当前数据到剪贴板
        if (typeof $tool !== 'undefined' && $tool.copy) {
            $tool.copy(newData);
            console.log('[LZY] 数据已复制到剪贴板');
        }
        
        console.log(`[LZY] 保存成功，当前共 ${dataArray.length} 个账号`);
        console.log(`[LZY] 存储格式（换行分隔）:`);
        dataArray.forEach((item, index) => {
            const parts = item.split('#');
            console.log(`  ${index + 1}. data: ${parts[0].substring(0, 30)}..., Authorization: ${parts[1].substring(0, 30)}...`);
        });
    }
})();