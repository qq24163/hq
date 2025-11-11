// ==================== 从Boxjs读取配置 ====================
function getQLConfigFromBoxjs() {
    const config = {
        url: $prefs.valueForKey('ql_url') || $prefs.valueForKey('qinglong_url') || 'http://127.0.0.1:5700',
        clientId: $prefs.valueForKey('ql_client_id') || $prefs.valueForKey('ql_clientid') || 'tr8-rzVyCi6e',
        clientSecret: $prefs.valueForKey('ql_client_secret') || $prefs.valueForKey('ql_clientsecret') || 'nREGQStWzf0W7mlrL_lOcnCX'
    };
    
    console.log('📋 从Boxjs读取配置:');
    console.log(`   地址: ${config.url}`);
    console.log(`   Client ID: ${config.clientId}`);
    console.log(`   Client Secret: ${config.clientSecret.substring(0, 10)}...`);
    
    return config;
}

// ==================== 配置区域 ====================
const QL_CONFIG = getQLConfigFromBoxjs();

// 需要同步的Token映射配置
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
        boxjsKey: 'BDDTTOKEN', 
        qlEnvName: 'BDDT',
        remarks: 'BDDTToken从Boxjs同步',
        required: false
    },
    {
        boxjsKey: 'RedBull',
        qlEnvName: 'RedBull', 
        remarks: '红牛会员俱乐部从Boxjs同步',
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
        $task.fetch(options).then(response => {
            resolve({
                status: response.statusCode,
                headers: response.headers,
                body: response.body
            });
        }, reason => {
            reject(new Error(reason.error || '网络请求失败'));
        });
    });
}

// ==================== 获取青龙面板Token ====================
async function getQLToken() {
    try {
        console.log('🔑 获取青龙面板访问令牌...');
        
        const tokenUrl = `${QL_CONFIG.url}/open/auth/token?client_id=${QL_CONFIG.clientId}&client_secret=${QL_CONFIG.clientSecret}`;
        
        const tokenResp = await qxHttpRequest({
            url: tokenUrl,
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'QuantumultX'
            },
            timeout: 10000
        });
        
        let responseData;
        try {
            responseData = JSON.parse(tokenResp.body);
        } catch (e) {
            throw new Error('令牌响应解析失败: ' + e.message);
        }
        
        if (responseData && responseData.code === 200) {
            console.log('✅ 令牌获取成功');
            return responseData.data.token;
        } else {
            throw new Error(`令牌获取失败: ${responseData ? responseData.message : '未知错误'}`);
        }
        
    } catch (error) {
        throw new Error(`获取令牌失败: ${error.message}`);
    }
}

// ==================== 删除环境变量 ====================
async function deleteQLEnv(token, envId) {
    try {
        const deleteResp = await qxHttpRequest({
            url: `${QL_CONFIG.url}/open/envs`,
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'User-Agent': 'QuantumultX'
            },
            body: JSON.stringify([envId]),
            timeout: 10000
        });
        
        let deleteData;
        try {
            deleteData = JSON.parse(deleteResp.body);
        } catch (e) {
            throw new Error('删除响应解析失败');
        }
        
        if (deleteData.code === 200) {
            return true;
        } else {
            throw new Error(`删除失败: ${deleteData.message}`);
        }
        
    } catch (error) {
        throw new Error(`删除环境变量失败: ${error.message}`);
    }
}

// ==================== 创建环境变量 ====================
async function createQLEnv(token, envName, envValue, remarks) {
    try {
        const createResp = await qxHttpRequest({
            url: `${QL_CONFIG.url}/open/envs`,
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'User-Agent': 'QuantumultX'
            },
            body: JSON.stringify([{
                name: envName,
                value: envValue,
                remarks: remarks
            }]),
            timeout: 10000
        });
        
        let createData;
        try {
            createData = JSON.parse(createResp.body);
        } catch (e) {
            throw new Error('创建响应解析失败');
        }
        
        if (createData.code === 200) {
            return true;
        } else {
            throw new Error(`创建失败: ${createData.message}`);
        }
        
    } catch (error) {
        throw new Error(`创建环境变量失败: ${error.message}`);
    }
}

// ==================== 核心同步函数（删除重建方案） ====================
async function syncToQL(envName, envValue, remarks = '从Boxjs同步') {
    try {
        console.log(`🔄 开始同步环境变量: ${envName}`);
        
        // 检查配置是否完整
        if (!QL_CONFIG.url || !QL_CONFIG.clientId || !QL_CONFIG.clientSecret) {
            throw new Error('青龙面板配置不完整');
        }
        
        // 1. 获取访问令牌
        const token = await getQLToken();
        
        // 2. 获取现有环境变量列表
        const envsResp = await qxHttpRequest({
            url: `${QL_CONFIG.url}/open/envs`,
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'User-Agent': 'QuantumultX'
            },
            timeout: 10000
        });
        
        let envsData;
        try {
            envsData = JSON.parse(envsResp.body);
        } catch (e) {
            throw new Error('环境变量列表响应解析失败');
        }
        
        if (envsData.code !== 200) {
            throw new Error(`获取环境变量列表失败: ${envsData.message}`);
        }
        
        // 3. 查找是否已存在该变量
        const existingEnv = envsData.data.find(env => env.name === envName);
        
        if (existingEnv) {
            // 删除并重新创建（避免更新API的验证问题）
            console.log(`📝 删除并重新创建: ${envName}`);
            console.log(`   旧值: ${existingEnv.value ? existingEnv.value.substring(0, 30) + '...' : '空值'}`);
            console.log(`   新值: ${envValue.substring(0, 30)}...`);
            
            // 删除现有变量
            await deleteQLEnv(token, existingEnv.id);
            console.log('   ✅ 删除成功');
            
            // 等待一下再创建
            await new Promise(resolve => setTimeout(resolve, 500));
        } else {
            console.log(`🆕 创建新变量: ${envName}`);
            console.log(`   值: ${envValue.substring(0, 30)}...`);
        }
        
        // 4. 创建新变量
        await createQLEnv(token, envName, envValue, remarks);
        console.log(`✅ 环境变量 ${envName} 同步成功`);
        
        return {
            success: true,
            action: existingEnv ? 'updated' : 'created',
            envName: envName
        };
        
    } catch (error) {
        console.log(`❌ 同步 ${envName} 失败: ${error.message}`);
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
    console.log('💡 使用删除重建方案避免更新API问题\n');
    
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
        console.log('📦 Boxjs到青龙面板同步脚本启动（最终工作版）...');
        
        // 显示当前配置状态
        console.log('🔍 当前配置状态:');
        const configCheck = checkQLConfig();
        
        if (!configCheck) {
            console.log('❌ 配置不完整，无法执行同步');
            $notification.post('配置错误', '缺少青龙面板配置', '请在Boxjs中设置相关变量');
            return;
        }
        
        // 执行同步
        const result = await batchSyncFromBoxjs();
        
        if (result.success > 0) {
            console.log('\n🎉 同步成功！数据已更新到青龙面板');
        }
        
    } catch (error) {
        console.log('❌ 脚本执行异常:', error);
        $notification.post('Boxjs同步失败', '脚本执行异常', error.message);
    }
}

// ==================== 启动脚本 ====================
// 立即执行主函数
main();
