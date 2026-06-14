/*
-------------- Quantumult X 配置 --------------

[MITM]
hostname = lm.api.sujh.net

[rewrite_local]
# 多应用 Authorization 捕获（合并版）
^https:\/\/lm\.api\.sujh\.net\/app\/score\/index\?platform=1 url script-request-header https://raw.githubusercontent.com/qq24163/hq/refs/heads/main/app_auth.js
*/
// app_auth.js - 捕获多个应用的 Authorization（根据 Appid 自动分类存储）
(function() {
    'use strict';
    
    var TARGET_URL = 'https://lm.api.sujh.net/app/score/index?platform=1';
    
    // 应用配置映射表：Appid -> 存储键名
    var APP_CONFIG = {
        'buxiaopai': {
            storageKey: 'BXP',
            appName: 'buxiaopai'
        },
        'lvyanzi': {
            storageKey: 'lvyz',
            appName: 'lvyanzi'
        }
    };
    
    // 检查是否是目标URL
    if (!$request) {
        $done({});
        return;
    }
    
    if ($request.url.indexOf(TARGET_URL) === -1) {
        $done({});
        return;
    }
    
    try {
        // 获取请求头中的 Appid 和 Authorization
        var appid = $request.headers['Appid'] || $request.headers['appid'] || 
                    $request.headers['AppId'] || $request.headers['appId'];
        var authorization = $request.headers['Authorization'] || $request.headers['authorization'];
        
        console.log('[APP_AUTH] 捕获到 Appid: ' + appid);
        
        // 检查 appid 是否存在
        if (!appid) {
            console.log('[APP_AUTH] Appid 为空，跳过');
            $done({});
            return;
        }
        
        // 转换为小写进行比较
        var lowerAppid = appid.toLowerCase();
        var config = null;
        
        if (lowerAppid === 'buxiaopai') {
            config = APP_CONFIG['buxiaopai'];
        } else if (lowerAppid === 'lvyanzi') {
            config = APP_CONFIG['lvyanzi'];
        }
        
        if (!config) {
            console.log('[APP_AUTH] Appid "' + appid + '" 不在配置列表中，跳过');
            $done({});
            return;
        }
        
        if (!authorization) {
            console.log('[APP_AUTH] 未找到 Authorization');
            $done({});
            return;
        }
        
        console.log('[APP_AUTH] 捕获到 ' + config.appName + ' Authorization: ' + authorization.substring(0, 30) + '...');
        
        // 管理多账号
        var storageKey = config.storageKey;
        var appName = config.appName;
        var newAuthorization = authorization;
        
        var storedData = $prefs.valueForKey(storageKey) || '';
        var tokensArray = storedData ? storedData.split('&').filter(function(t) { return t.trim() !== ''; }) : [];
        
        // 检查是否已存在相同 Authorization
        var isNewToken = true;
        var accountNumber = tokensArray.length + 1;
        
        for (var i = 0; i < tokensArray.length; i++) {
            if (tokensArray[i] === newAuthorization) {
                isNewToken = false;
                accountNumber = i + 1;
                break;
            }
        }
        
        if (isNewToken) {
            tokensArray.push(newAuthorization);
            $prefs.setValueForKey(tokensArray.join('&'), storageKey);
        }
        
        // 发送通知
        var title = isNewToken ? '✅ ' + appName + ' Authorization已添加' : '🔄 ' + appName + ' Authorization已存在';
        var subtitle = '账号' + accountNumber;
        var message = 'Authorization: ' + newAuthorization.substring(0, 25) + '...';
        
        $notify(title, subtitle, message);
        
        // 自动复制
        if (typeof $tool !== 'undefined' && $tool.copy) {
            $tool.copy(newAuthorization);
            console.log('[APP_AUTH] ' + appName + ' Authorization已复制到剪贴板');
        }
        
        console.log('[APP_AUTH] ' + appName + ' 当前共存储 ' + tokensArray.length + ' 个账号');
        
    } catch (error) {
        console.log('[APP_AUTH] 错误: ' + error);
    }
    
    $done({});
})();