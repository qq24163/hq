/*
-------------- Quantumult X 配置 --------------

[MITM]
hostname = feima.zhisongshu.cn

[rewrite_local]
# 袋鼠平台 token 和手机号捕获
^https:\/\/feima\.zhisongshu\.cn\/api\/5dca57afa379e\?m=getUserInfo url script-response-body https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/daishu.js
*/
// daishu.js - 捕获袋鼠平台的 access-token、user-token 和手机号
(function() {
    'use strict';
    
    function manageDaishuData(accessToken, userToken, phone) {
        const STORAGE_KEY = 'daishu';
        const storedData = $prefs.valueForKey(STORAGE_KEY) || '';
        let recordsArray = storedData ? storedData.split('&').filter(r => r.trim() !== '') : [];
        
        // 新记录格式: phone#access-token#user-token
        const newRecord = `${phone}#${accessToken}#${userToken}`;
        
        // 检查是否已存在相同phone的记录
        let isNewRecord = true;
        let accountNumber = recordsArray.length + 1;
        
        for (let i = 0; i < recordsArray.length; i++) {
            const existingPhone = recordsArray[i].split('#')[0];
            if (existingPhone === phone) {
                isNewRecord = false;
                accountNumber = i + 1;
                // 更新为最新记录
                recordsArray[i] = newRecord;
                break;
            }
        }
        
        if (isNewRecord) {
            recordsArray.push(newRecord);
        }
        
        // 保存到BoxJS
        $prefs.setValueForKey(recordsArray.join('&'), STORAGE_KEY);
        
        // 发送通知
        const action = isNewRecord ? "已添加" : "已更新";
        const title = `✅ 袋鼠平台账号${action}`;
        const subtitle = `账号${accountNumber} (手机: ${phone})`;
        const message = `access-token: ${accessToken.substring(0, 20)}...\nuser-token: ${userToken.substring(0, 20)}...`;
        
        $notify(title, subtitle, message);
        
        console.log(`[DAISHU] 保存记录: ${newRecord}`);
        console.log(`[DAISHU] 当前共存储 ${recordsArray.length} 个账号`);
    }
    
    try {
        // 方法1：尝试从 $response 获取原始请求头
        let accessToken = null;
        let userToken = null;
        
        // 打印调试信息
        console.log('[DAISHU] 脚本开始执行');
        console.log('[DAISHU] $response 类型: ' + typeof $response);
        
        // 尝试多种方式获取请求头
        if ($response && $response.request) {
            console.log('[DAISHU] $response.request 存在');
            accessToken = $response.request.headers['access-token'] || $response.request.headers['Access-Token'];
            userToken = $response.request.headers['user-token'] || $response.request.headers['User-Token'];
        }
        
        if (!accessToken && $request) {
            console.log('[DAISHU] 尝试从 $request 获取');
            accessToken = $request.headers['access-token'] || $request.headers['Access-Token'];
            userToken = $request.headers['user-token'] || $request.headers['User-Token'];
        }
        
        if (!accessToken) {
            console.log('[DAISHU] 无法获取 access-token，放弃执行');
            $done({});
            return;
        }
        
        // 解析响应体
        let body = null;
        if ($response && $response.body) {
            body = $response.body;
        } else if ($request && $request.body) {
            // 如果是从请求中获取
            body = $request.body;
        }
        
        if (!body) {
            console.log('[DAISHU] 响应体为空');
            $done({});
            return;
        }
        
        console.log('[DAISHU] 响应体原始内容: ' + body.substring(0, 200));
        
        const responseData = JSON.parse(body);
        
        if (responseData.code !== 1 || !responseData.data || !responseData.data.phone) {
            console.log('[DAISHU] 响应体中没有手机号或code不为1');
            $done({});
            return;
        }
        
        const phone = responseData.data.phone;
        
        console.log(`[DAISHU] 捕获到 access-token: ${accessToken.substring(0, 30)}...`);
        console.log(`[DAISHU] 捕获到 user-token: ${userToken.substring(0, 30)}...`);
        console.log(`[DAISHU] 捕获到手机号: ${phone}`);
        
        manageDaishuData(accessToken, userToken, phone);
        
    } catch (error) {
        console.log(`[DAISHU] 错误: ${error}`);
        console.log(`[DAISHU] 错误详情: ${error.stack}`);
    }
    
    $done({});
})();