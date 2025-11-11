// ==================== 从Boxjs读取配置 ====================
function getQLConfigFromBoxjs() {
    const config = {
        url: $prefs.valueForKey('ql_url') || $prefs.valueForKey('qinglong_url') || 'http://127.0.0.1:5700',
        clientId: $prefs.valueForKey('ql_client_id') || $prefs.valueForKey('ql_clientid') || 'tr8-rzVyCi6e',
        clientSecret: $prefs.valueForKey('ql_client_secret') || $prefs.valueForKey('ql_clientsecret') || '1Qyiq_BC0jhPDh_QM4OI5wrz'
    };
    
    console.log('📋 从Boxjs读取配置:');
    console.log(`   地址: ${config.url}`);
    console.log(`   Client ID: ${config.clientId}`);
    console.log(`   Client Secret: ${config.clientSecret.substring(0, 10)}...`);
    
    return config;
}

// ==================== 配置区域 ====================
const QL_CONFIG = getQLConfigFromBoxjs();

// 需要同步的Token映射配置 - 根据你的Boxjs数据调整
const TOKEN_CONFIG = [
    {
        boxjsKey: 'aliyunWeb_data',
        qlEnvName: 'aliyunWeb_data',
        remarks: '阿里云数据从Boxjs同步',
        required: false
    },
    {
        boxjsKey: 'IQOO', 
        qlEnvName: 'IQOO',
        remarks: 'IQOO Token从Boxjs同步',
        required: false
    },
    {
        boxjsKey: 'RedBull',
        qlEnvName: 'REDBULL', 
        remarks: '红牛数据从Boxjs同步',
        required: false
    }
    // 可以继续添加其他需要同步的Token
];

// ==================== 配置检查函数 ====================
function checkQLConfig() {
    console.log('🔧 检查青龙面板配置...');
    
    const missingConfigs = [];
    
    if (!$prefs.valueForKey('ql_url') && !$prefs.valueForKey('qinglong_url')) {
        missingConfigs.push('ql_url 或 qinglong_url');
    }
    if (!$prefs.valueForKey('ql_client_id') && !$prefs.valueForKey('ql_clientid')) {
        missingConfigs.push('ql_client_id 或 ql_clientid');
    }
    if (!$prefs.valueForKey('ql_client_secret') && !$prefs.valueForKey('ql_clientsecret')) {
        missingConfigs.push('ql_client_secret 或 ql_clientsecret');
    }
    
    if (missingConfigs.length > 0) {
        console.log('❌ 缺少以下Boxjs配置:');
        missingConfigs.forEach(config => {
            console.log(`   - ${config}`);
        });
        return false;
    }
    
    console.log('✅ 青龙面板配置完整');
    return true;
}

// ==================== QX专用HTTP请求函数 ====================
function qxHttpRequest(options) {
    return new Promise((resolve, reject) => {
        const method = options.method || 'GET';
        const headers = options.headers || {};
        const body = options.body || null;
        
        $task.fetch({
            url: options.url,
            method: method,
            headers: headers,
            body: body
        }).then(response => {
            try {
                const data = JSON.parse(response.body);
                resolve({
                    data: data,
                    status: response.statusCode
                });
            } catch (e) {
                resolve({
                    data: response.body,
                    status: response.statusCode
                });
            }
        }, reason => {
            reject(new Error(reason.error || '网络请求失败'));
        });
    });
}

// ==================== 核心同步函数 ====================
async function syncToQL(envName, envValue, remarks = '从Boxjs同步') {
    try {
        console.log(`🔄 开始同步环境变量: ${envName}`);
        
        // 检查配置是否完整
        if (!QL_CONFIG.url || !QL_CONFIG.clientId || !QL_CONFIG.clientSecret) {
            throw new Error('青龙面板配置不完整，请在Boxjs中设置ql_url、ql_client_id、ql_client_secret');
        }
        
        // 1. 获取访问令牌
        const tokenResp = await qxHttpRequest({
            url: `${QL_CONFIG.url}/open/auth/token`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                client_id: QL_CONFIG.clientId,
                client_secret: QL_CONFIG.clientSecret
            })
        });
        
        if (tokenResp.data.code !== 200) {
            throw new Error(`获取token失败: ${tokenResp.data.message}`);
        }
        
        const token = tokenResp.data.data.token;
        console.log(`✅ 获取青龙API令牌成功`);
        
        // 2. 获取现有环境变量列表
        const envsResp = await qxHttpRequest({
            url: `${QL_CONFIG.url}/open/envs`,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (envsResp.data.code !== 200) {
            throw new Error(`获取环境变量列表失败: ${envsResp.data.message}`);
        }
        
        // 3. 查找是否已存在该变量
        const existingEnv = envsResp.data.data.find(env => env.name === envName);
        let result;
        
        if (existingEnv) {
            // 更新现有变量
            console.log(`📝 更新现有变量: ${envName}`);
            console.log(`   旧值: ${existingEnv.value ? existingEnv.value.substring(0, 30) + '...' : '空值'}`);
            console.log(`   新值: ${envValue.substring(0, 30)}...`);
            
            result = await qxHttpRequest({
                url: `${QL_CONFIG.url}/open/envs`,
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: envName,
                    value: envValue,
                    _id: existingEnv._id,
                    remarks: remarks
                })
            });
        } else {
            // 创建新变量
            console.log(`🆕 创建新变量: ${envName}`);
            console.log(`   值: ${envValue.substring(0, 30)}...`);
            
            result = await qxHttpRequest({
                url: `${QL_CONFIG.url}/open/envs`,
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify([{
                    name: envName,
                    value: envValue,
                    remarks: remarks
                }])
            });
        }
        
        if (result.data.code === 200) {
            console.log(`✅ 环境变量 ${envName} 同步成功`);
            return {
                success: true,
                action: existingEnv ? 'updated' : 'created',
                envName: envName
            };
        } else {
            throw new Error(`API返回错误: ${result.data.message}`);
        }
        
    } catch (error) {
        console.log(`❌ 同步 ${envName} 失败: ${error}`);
        return {
            success: false,
            envName: envName,
            error: error.message
        };
    }
}

// ==================== Boxjs数据检查 ====================
function checkBoxjsData() {
    console.log('🔍 检查Boxjs中的数据...');
    console.log('='.repeat(50));
    
    const results = [];
    
    TOKEN_CONFIG.forEach(config => {
        const value = $prefs.valueForKey(config.boxjsKey);
        const exists = !!value;
        const status = exists ? '✅ 有数据' : '❌ 无数据';
        
        console.log(`${config.qlEnvName} (${config.boxjsKey}): ${status}`);
        if (exists) {
            console.log(`   值: ${value.substring(0, 50)}...`);
        }
        
        results.push({
            config: config,
            exists: exists,
            value: value
        });
    });
    
    console.log('='.repeat(50));
    return results;
}

// ==================== 批量同步主函数 ====================
async function batchSyncFromBoxjs() {
    console.log('🚀 开始从Boxjs批量同步Token到青龙面板');
    
    // 检查配置
    if (!checkQLConfig()) {
        const message = '请在Boxjs中设置ql_url、ql_client_id、ql_client_secret';
        console.log(`❌ ${message}`);
        $notification.post('配置错误', '缺少青龙面板配置', message);
        return {
            total: 0,
            success: 0,
            skipped: 0,
            error: 0,
            details: [],
            configError: true
        };
    }
    
    // 重新从Boxjs读取配置（确保使用最新值）
    const currentConfig = getQLConfigFromBoxjs();
    Object.assign(QL_CONFIG, currentConfig);
    
    console.log('📋 使用配置:');
    console.log(`   地址: ${QL_CONFIG.url}`);
    console.log('⏰ 开始时间:', new Date().toLocaleString());
    console.log('='.repeat(60));
    
    // 1. 检查Boxjs数据
    const boxjsData = checkBoxjsData();
    
    // 2. 统计信息
    let totalCount = 0;
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    
    const results = [];
    
    // 3. 逐个同步
    for (const item of boxjsData) {
        totalCount++;
        const { config, exists, value } = item;
        
        if (!exists) {
            if (config.required) {
                console.log(`❌ 跳过 ${config.qlEnvName}: Boxjs中未找到必需的数据`);
                errorCount++;
                results.push({
                    envName: config.qlEnvName,
                    status: 'error',
                    message: 'Boxjs中未找到必需的数据'
                });
            } else {
                console.log(`⏭️ 跳过 ${config.qlEnvName}: Boxjs中未找到数据(非必需)`);
                skipCount++;
                results.push({
                    envName: config.qlEnvName,
                    status: 'skipped',
                    message: 'Boxjs中未找到数据(非必需)'
                });
            }
            continue;
        }
        
        console.log(`\n📦 同步 ${config.qlEnvName}...`);
        console.log(`   来源: ${config.boxjsKey}`);
        console.log(`   长度: ${value.length} 字符`);
        
        // 执行同步
        const syncResult = await syncToQL(config.qlEnvName, value, config.remarks);
        
        if (syncResult.success) {
            successCount++;
            results.push({
                envName: config.qlEnvName,
                status: 'success',
                action: syncResult.action,
                message: `${syncResult.action === 'updated' ? '更新' : '创建'}成功`
            });
            console.log(`✅ ${config.qlEnvName} 同步成功`);
        } else {
            errorCount++;
            results.push({
                envName: config.qlEnvName,
                status: 'error',
                message: syncResult.error
            });
            console.log(`❌ ${config.qlEnvName} 同步失败`);
        }
        
        // 延迟1秒，避免请求过于频繁
        if (totalCount < boxjsData.length) {
            console.log('⏳ 等待1秒...');
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }
    
    // 4. 输出汇总报告
    console.log('\n' + '='.repeat(60));
    console.log('📊 同步完成报告');
    console.log('='.repeat(60));
    console.log(`总处理: ${totalCount} 个`);
    console.log(`✅ 成功: ${successCount} 个`);
    console.log(`⏭️ 跳过: ${skipCount} 个`);
    console.log(`❌ 失败: ${errorCount} 个`);
    console.log('⏰ 结束时间:', new Date().toLocaleString());
    
    // 5. 发送通知
    let notificationMessage = '';
    if (successCount > 0) {
        notificationMessage += `成功: ${successCount}个`;
    }
    if (errorCount > 0) {
        notificationMessage += notificationMessage ? `, 失败: ${errorCount}个` : `失败: ${errorCount}个`;
    }
    if (skipCount > 0) {
        notificationMessage += notificationMessage ? `, 跳过: ${skipCount}个` : `跳过: ${skipCount}个`;
    }
    
    $notification.post(
        'Boxjs同步青龙面板', 
        notificationMessage || '同步完成',
        `青龙面板: ${QL_CONFIG.url.replace('http://', '')}`
    );
    
    // 6. 返回详细结果
    return {
        total: totalCount,
        success: successCount,
        skipped: skipCount,
        error: errorCount,
        details: results,
        configError: false
    };
}

// ==================== 执行函数 ====================
async function main() {
    try {
        // 显示当前配置状态
        console.log('🔍 当前配置状态:');
        const configCheck = checkQLConfig();
        
        if (!configCheck) {
            console.log('❌ 配置不完整，无法执行同步');
            return;
        }
        
        // 执行同步
        const result = await batchSyncFromBoxjs();
        
        // 如果有失败的情况，建议重试
        if (result.error > 0 && !result.configError) {
            console.log('\n💡 提示: 有同步失败的变量，建议检查:');
            console.log('1. 青龙面板地址是否正确');
            console.log('2. Client ID和Secret是否正确');
            console.log('3. 网络是否连通');
            console.log('4. 青龙面板是否正常运行');
        }
        
    } catch (error) {
        console.log('❌ 脚本执行异常:', error);
        $notification.post('Boxjs同步失败', '脚本执行异常', error.message);
    }
}

// ==================== 启动脚本 ====================
// 立即执行主函数
main();

console.log('📦 Boxjs到青龙面板同步脚本已加载（QX专用版）');
console.log('✅ 脚本启动成功，开始同步流程...');
