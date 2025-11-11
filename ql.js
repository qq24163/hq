const QL_CONFIG = {
    url: $prefs.valueForKey('ql_url') || 'http://127.0.0.1:5700',
    clientId: $prefs.valueForKey('ql_client_id') || 'tr8-rzVyCi6e',
    clientSecret: $prefs.valueForKey('ql_client_secret') || 'nREGQStWzf0W7mlrL_lOcnCX'
};

const TOKEN_CONFIG = [
    { boxjsKey: 'aliyunWeb_data', qlEnvName: 'aliyunWeb_data', remarks: '阿里云数据从Boxjs同步' },
    { boxjsKey: 'IQOO', qlEnvName: 'IQOO', remarks: 'IQOO Token从Boxjs同步' },
    { boxjsKey: 'BDDTTOKEN', qlEnvName: 'BDDT', remarks: 'BDDT Token从Boxjs同步' },
    { boxjsKey: 'RedBull', qlEnvName: 'RedBull', remarks: '红牛数据从Boxjs同步' }
];

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

async function getQLToken() {
    const tokenUrl = `${QL_CONFIG.url}/open/auth/token?client_id=${QL_CONFIG.clientId}&client_secret=${QL_CONFIG.clientSecret}`;
    const tokenResp = await qxHttpRequest({
        url: tokenUrl,
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000
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
            await new Promise(resolve => setTimeout(resolve, 500));
        } else {
            console.log(`   🆕 创建新变量`);
        }
        
        await createQLEnv(token, envName, envValue, remarks);
        console.log(`   ✅ 同步成功`);
        
        return true;
    } catch (error) {
        console.log(`   ❌ 失败: ${error.message}`);
        return false;
    }
}

// 发送推送通知
function sendNotification(title, subtitle, body) {
    $notification.post(title, subtitle, body);
}

// 主函数
async function main() {
    console.log('🚀 Boxjs到青龙面板同步开始\n');
    
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    let totalCount = 0;
    
    for (const config of TOKEN_CONFIG) {
        const value = $prefs.valueForKey(config.boxjsKey);
        if (value) {
            totalCount++;
            console.log(`📦 ${config.qlEnvName} (${value.length}字符)`);
            
            const success = await syncToQL(config.qlEnvName, value, config.remarks);
            if (success) {
                successCount++;
            } else {
                errorCount++;
            }
            
            if (totalCount < TOKEN_CONFIG.length) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        } else {
            skipCount++;
            console.log(`⏭️ 跳过 ${config.qlEnvName}: Boxjs中无数据`);
        }
    }
    
    // 输出汇总报告
    console.log(`\n📊 同步完成报告`);
    console.log(`总处理: ${totalCount} 个`);
    console.log(`✅ 成功: ${successCount} 个`);
    console.log(`⏭️ 跳过: ${skipCount} 个`);
    console.log(`❌ 失败: ${errorCount} 个`);
    console.log('✅ 脚本执行完毕');
    
    // 发送推送通知
    const notificationTitle = 'Boxjs同步完成';
    const notificationSubtitle = `成功: ${successCount}个, 失败: ${errorCount}个`;
    const notificationBody = `总处理: ${totalCount}个, 跳过: ${skipCount}个`;
    
    sendNotification(notificationTitle, notificationSubtitle, notificationBody);
}

// 执行
main().catch(console.error);
