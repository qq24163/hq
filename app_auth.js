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
    
    const TARGET_URL = 'https://lm.api.sujh.net/app/score/index?platform=1';
    
    // 应用配置映射表：Appid -> 存储键名
    const APP_CONFIG = {
        'buxiaopai': {
            storageKey: 'BXP',
            appName: 'buxiaopai'
        },
        'lvyanzi': {
            storageKey: 'lvyz',
            appName: 'lvyanzi'
        }
        // 后续需要添加新应用，只需在这里增加配置即可
        // 'newapp': {
        //     storageKey: 'NEWAPP',
        //     appName: '新应用'
        // }
    };
    
    // 检查是否是目标URL
    if (!$request || $request.url.indexOf(TARGET_URL) === -1) {
        $done({});
        return;
    }
    
    try {
        // 获取请求头中的 Appid 和 Authorization
        const appid = $request.headers['Appid'] || $request.headers['appid'] || 
                      $request.headers['AppId'] || $request.headers['appId'];
        const authorization = $request.headers['Authorization'] || $request.headers['authorization'];
        
        console.log(`[APP_AUTH] 捕获到 Appid: ${appid}`);
        
        // 检查是否在配置中
        const config = APP_CONFIG[appid?.toLowerCase()];
        if (!config) {
            console.log(`[APP_AUTH] Appid "${appid}" 不在配置列表中，跳过`);
            $done({});
            return;
        }
        
        if (!authorization) {
            console.log(`[APP_AUTH] 未找到 Authorization`);
            $done({});
            return;
        }
        
        console.log(`[APP_AUTH] 捕获到 ${config.appName} Authorization: ${authorization.substring(0, 30)}...`);
        
        // 管理多账号（通用函数）
        function manageToken(storageKey, appName, newAuthorization) {
            const storedData = $prefs.valueForKey(storageKey) || '';
            let tokensArray = storedData ? storedData.split('&').filter(t => t.trim() !== '') : [];
            
            // 检查是否已存在相同 Authorization
            let isNewToken = true;
            let accountNumber = tokensArray.length + 1;
            
            for (let i = 0; i < tokensArray.length; i++) {
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
            const title = isNewToken ? `✅ ${appName} Authorization已添加` : `🔄 ${appName} Authorization已存在`;
            const subtitle = `账号${accountNumber}`;
            const message = `Authorization: ${newAuthorization.substring(0, 25)}...`;
            
            $notify(title, subtitle, message);
            
            // 自动复制当前 Authorization
            if (typeof $tool !== 'undefined' && $tool.copy) {
                $tool.copy(newAuthorization);
                console.log(`[APP_AUTH] ${appName} Authorization已复制到剪贴板`);
            }
            
            console.log(`[APP_AUTH] ${appName} 当前共存储 ${tokensArray.length} 个账号`);
        }
        
        manageToken(config.storageKey, config.appName, authorization);
        
    } catch (error) {
        console.log(`[APP_AUTH] 错误: ${error}`);
    }
    
    $done({})；
})();