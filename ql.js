/**
 * Boxjs到青龙面板批量同步脚本
 * 使用删除重建方案，避免更新API的验证问题
 */

// 配置
const QL_CONFIG = {
    url: $prefs.valueForKey('ql_url') || 'http://127.0.0.1:5700',
    clientId: $prefs.valueForKey('ql_client_id') || 'tr8-rzVyCi6e',
    clientSecret: $prefs.valueForKey('ql_client_secret') || 'nREGQStWzf0W7mlrL_lOcnCX'
};

const TOKEN_CONFIG = [
    { boxjsKey: 'aliyunWeb_data', qlEnvName: 'aliyunWeb_data', remarks: '阿里云数据从Boxjs同步' },
    { boxjsKey: 'IQOO', qlEnvName: 'IQOO', remarks: 'IQOO从Boxjs同步' },
    { boxjsKey: 'JYXR', qlEnvName: 'wqwl_jyxe', remarks: '旧衣小二从Boxjs同步' },
    { boxjsKey: 'RedBull', qlEnvName: 'RedBull', remarks: '红牛会员俱乐部从Boxjs同步' }
];

// HTTP请求函数
function qxHttpRequest(options) {
    return new Promise((resolve, reject) => {
        $task.fetch(options).then(response => {
            resolve({
                status: response.statusCode,
                body: response.body
            });
        }, reason => {
            reject(new Error(reason.error || '网络请求失败'));
        });
    });
}

// 获取青龙面板Token
async function getQLToken() {
    const tokenUrl = `${QL_CONFIG.url}/open/auth/token?client_id=${QL_CONFIG.clientId}&client_secret=${QL_CONFIG.clientSecret}`;
    const tokenResp = await qxHttpRequest({
        url: tokenUrl,
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
    });
    const responseData = JSON.parse(tokenResp.body);
    if (responseData.code === 200) {
        return responseData.data.token;
    } else {
        throw new Error(`令牌获取失败: ${responseData.message}`);
    }
}

// 删除环境变量
async function deleteQLEnv(token, envId) {
    const deleteResp = await qxHttpRequest({
        url: `${QL_CONFIG.url}/open/envs`,
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify([envId])
    });
    const deleteData = JSON.parse(deleteResp.body);
    if (deleteData.code !== 200) {
        throw new Error(`删除失败: ${deleteData.message}`);
    }
}

// 创建环境变量
async function createQLEnv(token, envName, envValue, remarks) {
    const createResp = await qxHttpRequest({
        url: `${QL_CONFIG.url}/open/envs`,
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify([{ name: envName, value: envValue, remarks: remarks }])
    });
    const createData = JSON.parse(createResp.body);
    if (createData.code !== 200) {
        throw new Error(`创建失败: ${createData.message}`);
    }
}

// 同步单个环境变量
async function syncToQL(envName, envValue, remarks = '从Boxjs同步') {
    try {
        console.log(`🔄 同步: ${envName}`);
        
        const token = await getQLToken();
        
        // 获取现有环境变量列表
        const envsResp = await qxHttpRequest({
            url: `${QL_CONFIG.url}/open/envs`,
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
        });
        
        const envsData = JSON.parse(envsResp.body);
        const existingEnv = envsData.data.find(env => env.name === envName);
        
        if (existingEnv) {
            console.log(`   📝 删除并重新创建`);
            await deleteQLEnv(token, existingEnv.id);
            // 短暂延迟
            await new Promise(resolve => setTimeout(resolve, 300));
        } else {
            console.log(`   🆕 创建新变量`);
        }
        
        await createQLEnv(token, envName, envValue, remarks);
        console.log(`   ✅ 同步成功`);
        
        return { success: true, envName: envName };
    } catch (error) {
        console.log(`   ❌ 失败: ${error.message}`);
        return { success: false, envName: envName, error: error.message };
    }
}

// 主执行函数
async function runSync() {
    console.log('🚀 Boxjs到青龙面板同步开始\n');
    
    const results = [];
    
    for (const config of TOKEN_CONFIG) {
        const value = $prefs.valueForKey(config.boxjsKey);
        if (value) {
            console.log(`📦 ${config.qlEnvName} (${value.length}字符)`);
            
            const result = await syncToQL(config.qlEnvName, value, config.remarks);
            results.push(result);
            
            // 延迟1秒（除了最后一个）
            if (results.length < TOKEN_CONFIG.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        } else {
            console.log(`⏭️ 跳过 ${config.qlEnvName}: Boxjs中无数据`);
            results.push({ success: false, envName: config.qlEnvName, error: 'Boxjs中无数据', skipped: true });
        }
    }
    
    return results;
}

// 启动脚本
runSync().then(results => {
    // 输出汇总报告
    console.log(`\n📊 同步完成报告`);
    
    const successResults = results.filter(r => r.success);
    const errorResults = results.filter(r => !r.success && !r.skipped);
    const skipResults = results.filter(r => r.skipped);
    
    console.log(`总处理: ${results.length} 个`);
    console.log(`✅ 成功: ${successResults.length} 个`);
    console.log(`⏭️ 跳过: ${skipResults.length} 个`);
    console.log(`❌ 失败: ${errorResults.length} 个`);
    
    // 构建详细结果消息
    let successList = [];
    let errorList = [];
    
    results.forEach(result => {
        if (result.success) {
            successList.push(`${result.envName} ✅`);
        } else if (result.skipped) {
            successList.push(`${result.envName} ⏭️`);
        } else {
            errorList.push(`${result.envName} ❌`);
        }
    });
    
    // 单条精简通知 - 显示每个变量的结果
    const title = errorList.length === 0 ? "✅ Boxjs同步完成" : "⚠️ Boxjs同步完成";
    const subtitle = `成功:${successList.length} 失败:${errorList.length}`;
    const body = successList.join('\n') + (errorList.length > 0 ? '\n' + errorList.join('\n') : '');
    
    $notify(title, subtitle, body);
    
    console.log('🎉 脚本执行完成！');
    
}).catch(error => {
    console.log('❌ 脚本执行异常:', error);
    // 错误时精简通知
    $notify(
        "❌ Boxjs同步失败",
        "执行异常",
        error.message
    );
    
}).finally(() => {
    // 确保脚本结束
    setTimeout(() => {
        $done();
    }, 1000);
});
