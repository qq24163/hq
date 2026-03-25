/*
[MITM]
hostname = m.wxx.ball.warhorsechina.jsinfo.org.cn

[rewrite_local]
# 战马用户信息捕获
^https:\/\/m\.wxx\.ball\.warhorsechina\.jsinfo\.org\.cn\/app\/api\/custom\/getusercenter\?safe=.* url script-response-body https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/zm.js
*/
// zm.js - 捕获战马用户信息中的safe和nickname
(function() {
    'use strict';
    
    const STORAGE_KEY = 'zm';
    const TARGET_URL = 'https://m.wxx.ball.warhorsechina.jsinfo.org.cn/app/api/custom/getusercenter';
    
    // 检查是否是目标URL
    if (!$request || !$request.url.indexOf(TARGET_URL) === -1) {
        $done({});
        return;
    }
    
    try {
        // 从URL中提取safe参数
        const url = $request.url;
        const safeMatch = url.match(/safe=([^&]+)/);
        let safe = '';
        
        if (safeMatch && safeMatch[1]) {
            safe = safeMatch[1];
            console.log(`[ZM] 从URL提取到safe: ${safe}`);
        } else {
            console.log('[ZM] 未从URL找到safe参数');
            $done({});
            return;
        }
        
        // 获取响应体
        const responseBody = $response.body;
        if (!responseBody) {
            console.log('[ZM] 响应体为空');
            $done({});
            return;
        }
        
        // 解析JSON
        let jsonData;
        try {
            jsonData = JSON.parse(responseBody);
        } catch (e) {
            console.log(`[ZM] JSON解析失败: ${e}`);
            $done({});
            return;
        }
        
        // 提取nickname
        const nickname = jsonData.nickname;
        if (!nickname) {
            console.log(`[ZM] 未找到nickname`);
            $done({});
            return;
        }
        
        console.log(`[ZM] 捕获到数据 - safe: ${safe}, nickname: ${nickname}`);
        
        // 格式化数据
        const newData = `${safe}#${nickname}`;
        
        // 管理多账号
        manageZmData(safe, nickname, newData);
        
    } catch (error) {
        console.log(`[ZM] 错误: ${error}`);
    }
    
    $done({});
    
    function manageZmData(safe, nickname, newData) {
        // 获取已存储的数据
        const storedData = $prefs.valueForKey(STORAGE_KEY) || '';
        let dataArray = storedData ? storedData.split('\n').filter(item => item.trim() !== '') : [];
        
        // 检查是否已存在相同的safe
        let existingIndex = -1;
        
        for (let i = 0; i < dataArray.length; i++) {
            const storedSafe = dataArray[i].split('#')[0];
            if (storedSafe === safe) {
                existingIndex = i;
                console.log(`[ZM] 找到相同safe的旧数据，索引: ${i}, 旧昵称: ${dataArray[i].split('#')[1]}`);
                break;
            }
        }
        
        if (existingIndex === -1) {
            // 新的safe，添加到数组末尾
            dataArray.push(newData);
            console.log(`[ZM] 添加新账号，safe: ${safe}, nickname: ${nickname}`);
        } else {
            // 已存在safe，更新nickname
            dataArray[existingIndex] = newData;
            console.log(`[ZM] 更新已有账号的nickname，safe: ${safe}, 新昵称: ${nickname}`);
        }
        
        // 保存到BoxJS，用换行符分隔
        $prefs.setValueForKey(dataArray.join('\n'), STORAGE_KEY);
        
        // 发送通知
        const title = existingIndex === -1 ? "✅ 战马账号已添加" : "🔄 战马昵称已更新";
        const subtitle = `昵称: ${nickname}`;
        const message = `safe: ${safe}\n当前账号数: ${dataArray.length}`;
        
        $notify(title, subtitle, message);
        
        // 自动复制当前数据到剪贴板
        if (typeof $tool !== 'undefined' && $tool.copy) {
            $tool.copy(newData);
            console.log('[ZM] 数据已复制到剪贴板');
        }
        
        console.log(`[ZM] 保存成功，当前共 ${dataArray.length} 个账号`);
        console.log(`[ZM] 存储格式（换行分隔）:`);
        dataArray.forEach((item, index) => {
            const parts = item.split('#');
            console.log(`  ${index + 1}. safe: ${parts[0]}, 昵称: ${parts[1]}`);
        });
    }
})();