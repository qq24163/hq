/*
[MITM]
hostname = dt.yuanhukj.com

[rewrite_local]
# 林泽园用户信息捕获
^https:\/\/dt\.yuanhukj\.com\/api\/mobile\/account\/user\/overview_my\?.* url script-response-body https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/lzy.js
*/
// lzy-debug.js - 调试版本
(function() {
    'use strict';
    
    const STORAGE_KEY = 'lzy';
    const TARGET_URL = 'https://dt.yuanhukj.com/api/mobile/account/user/overview_my';
    
    console.log('[LZY-DEBUG] 脚本开始执行');
    console.log('[LZY-DEBUG] 请求URL: ' + ($request ? $request.url : '无$request'));
    
    if (!$request) {
        console.log('[LZY-DEBUG] $request不存在');
        $done({});
        return;
    }
    
    if ($request.url.indexOf(TARGET_URL) === -1) {
        console.log('[LZY-DEBUG] URL不匹配: ' + $request.url);
        $done({});
        return;
    }
    
    console.log('[LZY-DEBUG] URL匹配成功');
    
    try {
        // 获取请求头
        const headers = $request.headers;
        console.log('[LZY-DEBUG] 请求头: ' + JSON.stringify(headers));
        
        // 获取Authorization
        let authorization = headers['Authorization'] || headers['authorization'];
        if (!authorization) {
            console.log('[LZY-DEBUG] 未找到Authorization');
            $done({});
            return;
        }
        console.log('[LZY-DEBUG] Authorization: ' + authorization.substring(0, 50));
        
        // 去掉Bearer
        let cleanAuth = authorization;
        if (authorization.startsWith('Bearer ')) {
            cleanAuth = authorization.substring(7);
            console.log('[LZY-DEBUG] 去掉Bearer后: ' + cleanAuth.substring(0, 50));
        }
        
        // 获取app-sign
        let appSign = headers['app-sign'] || '';
        console.log('[LZY-DEBUG] app-sign: ' + (appSign ? appSign.substring(0, 30) : '未找到'));
        
        // 获取响应体
        const responseBody = $response.body;
        if (!responseBody) {
            console.log('[LZY-DEBUG] 响应体为空');
            $done({});
            return;
        }
        console.log('[LZY-DEBUG] 响应体: ' + responseBody.substring(0, 200));
        
        // 解析JSON
        let jsonData = JSON.parse(responseBody);
        console.log('[LZY-DEBUG] 解析成功, code: ' + jsonData.code);
        
        if (jsonData.code !== 0) {
            console.log('[LZY-DEBUG] 响应失败, 跳过');
            $done({});
            return;
        }
        
        const userId = jsonData.data?.user_id;
        if (!userId) {
            console.log('[LZY-DEBUG] 未找到user_id');
            $done({});
            return;
        }
        
        console.log('[LZY-DEBUG] user_id: ' + userId);
        
        // 读取存储
        let storedData = $prefs.valueForKey(STORAGE_KEY) || '';
        console.log('[LZY-DEBUG] 存储原始数据: ' + storedData);
        
        // 简单处理：直接覆盖保存（测试用）
        const newData = `${userId}#${cleanAuth}#${appSign}`;
        $prefs.setValueForKey(newData, STORAGE_KEY);
        
        console.log('[LZY-DEBUG] 已保存: ' + newData.substring(0, 80));
        
        $notify("LZY调试", "已保存", `user_id: ${userId}`);
        
    } catch (error) {
        console.log('[LZY-DEBUG] 错误: ' + error);
    }
    
    $done({});
})();