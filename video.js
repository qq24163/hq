/**
*@file       腾讯视频
*@desp       本脚本仅适用于腾讯视频会员每日签到，仅测试Quantumult X、青龙（只支持单账号）
*@env        txspCookie、isSkipTxspCheckIn
*@updated    2024-7-18
*@version    v1.0.4

🌟 环境变量说明
txspCookie：腾讯视频app的Cookie
isSkipTxspCheckIn：值域[true, false] 默认为false表示正常进行腾讯视频会员签到，用于特殊情况下（账号需要获取短信验证码或者需要过滑块验证码）时开启
❗ 本脚本只能给腾讯视频正常账号签到，如有验证请设置isSkipTxspCheckIn为true，直到手动签到无验证为止
*/

const $ = new Env("腾讯视频");

let txspCookie = ($.isNode() ? process.env.txspCookie : $.getdata('txspCookie')) || "";
let isSkipTxspCheckIn = $.isNode() ? process.env.isSkipTxspCheckIn : (($.getdata('isSkipTxspCheckIn') !== undefined && $.getdata('isSkipTxspCheckIn') !== '') ? JSON.parse($.getdata('isSkipTxspCheckIn')) : false);

const Notify = 1;
const notify = $.isNode() ? require("./sendNotify") : "";

let isTxspVip = false, isTxspSvip = false;
let endTime = "", svipEndTime = "";
let level = "";
let score = "";
let month_received_score = "", month_limit = "";
let isTxspCheckIn = false;
let watchVideoTask = null;

let originalInfo = $.info;
let originalWarn = $.warn;
let originalError = $.error;
$.desc = "", $.taskInfo = "";
$.info=function(message){originalInfo.call($,message);$.desc+=message+"\n"};
$.warn=function(message){originalWarn.call($,message);$.desc+=message+"\n"};
$.error=function(message){originalError.call($,message);$.desc+=message+"\n"};

if ((isGetCookie = typeof $request !== `undefined`)) {
	getCookie();
	$.done();
} else if (!$.isNode() && !txspCookie){
	$.msg($.name, "您未获取腾讯视频Cookie", "点击此条跳转到腾讯视频获取Cookie", { 'open-url': 'tenvideo://' });
	$.done();
} else {
	!(async () => {
		if(!txspCookie){
			$.warn(`未填写txspCookie环境变量`);
			return;
		}
		
		await getVipInfo();
		if (isTxspVip){
			$.info(`---- 腾讯视频VIP信息 ----`);
			if (isTxspSvip){
				$.info(`当前是腾讯视频SVIP`);
			} else {
				$.info(`当前是腾讯视频VIP`);
			}
			$.info(`当前等级：${level}`);
			$.info(`当前成长：${score}`);
			if (isTxspSvip){
				$.info(`SVIP到期时间：${svipEndTime}`);
			}
			$.info(`VIP到期时间：${endTime}`);
			$.info(`--------- 结束 ---------\n`);
		} else {
			$.warn(`当前账号不是腾讯视频VIP，跳过签到`);
			await SendMsg();
			return;
		}
		
		if (isTxspVip){
			$.info(`---- 开始 腾讯视频任务 ----`);
			if (isSkipTxspCheckIn){
				$.info(`当前设置为不进行腾讯视频签到，跳过`);
			} else {
				await readTxspTaskList();
				await waitRandom(1000, 2000);
				
				if (!isTxspCheckIn && month_received_score !== month_limit) {
					await txspCheckIn();
					await waitRandom(1000, 2000);
				} else if (isTxspCheckIn){
					$.info(`今天已签到, 明日再来吧`);
				} else if (month_received_score === month_limit){
					$.info(`本月活跃任务已满${month_limit}V力值，下个月再来哦`);
				}
				
				if (watchVideoTask && watchVideoTask.task_status === 0) {
					await completeWatchVideoTask();
					await waitRandom(1000, 2000);
				}
			}
			$.info(`--------- 结束 ---------\n`);

			// 使用完整版Keep月卡兑换
			await completeKeepExchange();
			// 可选：测试所有模块（调试用）
			//await testAllKeepModules();

			
			$.info(`--------- 结束 ---------\n`);
		}
		await SendMsg();
	})()
		.catch((e) => $.error(e))
		.finally(() => $.done());
}

/**
 * 完整版Keep月卡兑换脚本（包含完整错误处理）
 * @async
 * @function completeKeepExchange
 * @returns
 */
async function completeKeepExchange() {
    $.info(`🎯 开始Keep月卡兑换流程`);
    
    // 步骤1: 检查VIP状态
    if (!isTxspVip) {
        $.warn(`❌ 非VIP用户，无法参与活动`);
        return;
    }
    
    // 步骤2: 根据日期确定目标模块
    const targetModule = getTodayModule();
    if (!targetModule) {
        $.info(`📅 今天不是特殊日期(8/18/28)，跳过Keep月卡领取`);
        return;
    }
    
    $.info(`🎁 目标: ${targetModule.name}`);
    $.info(`🔧 模块ID: ${targetModule.id}`);
    
    // 步骤3: 尝试领取Keep月卡
    const result = await receiveKeepPrizeAdvanced(targetModule.id, targetModule.name);
    
    // 步骤4: 显示最终结果
    if (result.success) {
        $.info(`🎉 恭喜！Keep月卡领取成功！`);
        $.info(`🔑 兑换码: ${result.cdkey}`);
        $.info(`🌐 兑换地址: ${result.url}`);
        $.info(`💡 请复制兑换码到Keep App中兑换使用`);
        
        $.taskInfo += `Keep月卡领取成功！兑换码: ${result.cdkey}\n`;
    } else {
        $.warn(`😞 领取失败: ${result.error}`);
        $.taskInfo += `Keep月卡领取失败: ${result.error}\n`;
    }
}

/**
 * 高级版Keep奖品领取（包含完整错误处理）
 * @async
 * @function receiveKeepPrizeAdvanced
 * @param {string} moduleId 
 * @param {string} moduleName 
 * @returns {Promise<Object>}
 */
async function receiveKeepPrizeAdvanced(moduleId, moduleName) {
    return new Promise((resolve) => {
        let timestamp = Date.now();
        let url = `https://activity.video.qq.com/fcgi-bin/asyn_activity?platform=7&type=100251&option=100&act_id=9y6scr7xd58aq9zsk7oe5gdf8a&module_id=${moduleId}&ptag=channel.rightmodule&is_prepublish=&aid=V0$$2:7$8:2003$3:9.02.20$34:1&otype=xjson&_ts=${timestamp}`;
        
        let opt = {
            url: url,
            headers: {
                Origin: "https://film.video.qq.com",
                Referer: "https://film.video.qq.com/x/magic-act/9y6scr7xd58aq9zsk7oe5gdf8a/10200",
                Cookie: txspCookie,
                'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
                'Accept': 'application/json'
            },
            timeout: 15000
        };
        
        $.get(opt, async (error, resp, data) => {
            try {
                // 网络错误处理
                if (error) {
                    let errorResult = {
                        success: false,
                        error: `网络错误: ${error}`,
                        errorCode: -9999
                    };
                    resolve(errorResult);
                    return;
                }
                
                // 空数据检查
                if (!data) {
                    let errorResult = {
                        success: false,
                        error: "服务器返回空数据",
                        errorCode: -9998
                    };
                    resolve(errorResult);
                    return;
                }
                
                var obj = JSON.parse(data);
                
                // 成功情况
                if (obj.ret === 0 && obj.receive_result === 1 && obj.receive_list && obj.receive_list.length > 0) {
                    let receiveItem = obj.receive_list[0];
                    let cdkey = receiveItem.ext_params?.cdkey_res || receiveItem.cdkey;
                    
                    let successResult = {
                        success: true,
                        cdkey: cdkey,
                        url: receiveItem.receive_url_h5,
                        propertyId: receiveItem.receive_propertyId,
                        name: receiveItem.receive_name,
                        errorCode: 0
                    };
                    resolve(successResult);
                    
                } else {
                    // 根据错误码提供详细错误信息
                    let errorInfo = getDetailedErrorInfo(obj.ret);
                    let errorResult = {
                        success: false,
                        error: errorInfo.message,
                        errorCode: obj.ret,
                        suggestion: errorInfo.suggestion
                    };
                    resolve(errorResult);
                }
                
            } catch (e) {
                // JSON解析错误
                let errorResult = {
                    success: false,
                    error: `数据解析失败: ${e.message}`,
                    errorCode: -9997
                };
                resolve(errorResult);
            }
        });
    });
}

/**
 * 获取详细的错误信息（基于您提供的错误码列表）
 * @function getDetailedErrorInfo
 * @param {number} errorCode 
 * @returns {Object}
 */
function getDetailedErrorInfo(errorCode) {
    const errorMap = {
        '0': { 
            message: '成功', 
            suggestion: '领取成功' 
        },
        '-904': { 
            message: '您还没有抽奖资格，谢谢参与。', 
            suggestion: '请检查是否是VIP用户或活动参与条件' 
        },
        '-906': { 
            message: '免费试用领取成功', 
            suggestion: '已成功领取试用版' 
        },
        '-1002': { 
            message: '请重新登录', 
            suggestion: 'Cookie可能失效，请重新获取' 
        },
        '-901': { 
            message: '活动还没开始', 
            suggestion: '请等活动开始时间' 
        },
        '-900': { 
            message: '活动已结束', 
            suggestion: '活动已结束，请关注下次活动' 
        },
        '-1012': { 
            message: '限QQ用户参加', 
            suggestion: '该活动仅限QQ用户参与' 
        },
        '-1010': { 
            message: '系统繁忙，请稍候重试', 
            suggestion: '请稍后重试' 
        },
        '-903': { 
            message: '您的抽奖资格已用完，谢谢参与。', 
            suggestion: '本月资格已用完，下月再来' 
        },
        '-100': { 
            message: '很抱歉，没有中奖，谢谢参与！', 
            suggestion: '本次未中奖，下次再试' 
        },
        '-102': { 
            message: '未登录', 
            suggestion: '请检查Cookie是否有效' 
        },
        '-1014': { 
            message: '来晚了一步，已经没有奖品了', 
            suggestion: '奖品已被领完，下次请早' 
        },
        '-1013': { 
            message: '秒杀还没开始', 
            suggestion: '请等待秒杀开始时间' 
        },
        '-1019': { 
            message: '用户访问过多，请稍候重试', 
            suggestion: '访问过于频繁，请稍后重试' 
        },
        '-905': { 
            message: '未通过安全策略校验', 
            suggestion: '可能触发风控，请稍后重试' 
        },
        '-907': { 
            message: '开通无资格抽中奖', 
            suggestion: '不符合参与资格' 
        },
        '-100104': { 
            message: '单设备开通数量到达上限', 
            suggestion: '设备参与次数已达上限' 
        },
        '-1052': { 
            message: '已开通无资格', 
            suggestion: '已开通服务，无重复参与资格' 
        },
        '-910': { 
            message: '奖品已全部领完', 
            suggestion: '所有奖品已被领完' 
        },
        '-911': { 
            message: '当月奖品已领完', 
            suggestion: '本月奖品已领完，下月再来' 
        },
        '-912': { 
            message: '当周奖品已领完', 
            suggestion: '本周奖品已领完，下周再来' 
        },
        '-913': { 
            message: '当日奖品已领完', 
            suggestion: '今日奖品已领完，明天再来' 
        },
        '-914': { 
            message: '奖品已领取', 
            suggestion: '您已经领取过该奖品' 
        },
        '-915': { 
            message: '当月奖品已领取', 
            suggestion: '本月已领取过该奖品' 
        },
        '-916': { 
            message: '当周奖品已领取', 
            suggestion: '本周已领取过该奖品' 
        },
        '-917': { 
            message: '当日奖品已领取', 
            suggestion: '今日已领取过该奖品' 
        },
        '-2021': { 
            message: '已领取过该奖品', 
            suggestion: '不能重复领取' 
        },
        '-100015': { 
            message: '权限不足', 
            suggestion: '请检查VIP状态和Cookie' 
        },
        '-888888': { 
            message: '系统繁忙，请稍候重试', 
            suggestion: '系统临时故障，请稍后重试' 
        }
    };
    
    return errorMap[errorCode.toString()] || { 
        message: `未知错误 (${errorCode})`, 
        suggestion: '请查看日志获取详细信息' 
    };
}

/**
 * 检查当前日期对应的模块
 * @function getTodayModule
 * @returns {Object|null}
 */
function getTodayModule() {
    var today = new Date();
    var date = today.getDate();
    
    const dateModules = {
        28: { id: "p2e26y18i0j2i45eg5fph4fqr5", name: "28日Keep月卡" },
        18: { id: "d19z5otu8rqyc68z06p4ok5165", name: "18日Keep月卡" },
        8: { id: "xhx9iz36qw48e6ppjho5sk5pql", name: "8日Keep月卡" }
    };
    
    return dateModules[date] || null;
}

/**
 * 批量测试所有模块（用于调试）
 * @async
 * @function testAllKeepModules
 * @returns
 */
async function testAllKeepModules() {
    $.info(`🧪 测试所有Keep月卡模块`);
    
    const allModules = [
        { id: "p2e26y18i0j2i45eg5fph4fqr5", name: "28日Keep月卡" },
        { id: "d19z5otu8rqyc68z06p4ok5165", name: "18日Keep月卡" },
        { id: "xhx9iz36qw48e6ppjho5sk5pql", name: "8日Keep月卡" }
    ];
    
    let results = [];
    
    for (let module of allModules) {
        $.info(`测试: ${module.name}`);
        let result = await receiveKeepPrizeAdvanced(module.id, module.name);
        results.push({
            module: module.name,
            ...result
        });
        await waitRandom(3000, 5000);
    }
    
    // 显示测试结果
    $.info(`📊 测试结果汇总:`);
    for (let result of results) {
        if (result.success) {
            $.info(`✅ ${result.module}: 成功 - 兑换码: ${result.cdkey}`);
        } else {
            $.info(`❌ ${result.module}: 失败 - ${result.error}`);
        }
    }
}


async function getVipInfo() {
    return new Promise((resolve, reject) => {
			let opt = {
				url: `https://vip.video.qq.com/rpc/trpc.query_vipinfo.vipinfo.QueryVipInfo/GetVipUserInfoH5`,
				headers: {
					cookie: txspCookie,
					'Content-Type': 'application/json',
					'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
					'Referer': 'https://vip.video.qq.com/'
				},
				body: JSON.stringify({"geticon":1,"viptype":"svip|sports|nfl","platform":5})
			};
			$.post(opt, async (error, resp, data) => {
				try {
					if (error) {
						$.error(`获取VIP信息网络错误: ${error}`);
						reject(error);
						return;
					}
					
					if (data && data.length > 0) {
						var obj = JSON.parse(data);
						if (obj.ret === 0 || obj.servicetype) {
							if (obj.vip === 1){
								isTxspVip = true;
								endTime = obj.endTime || "未知";
								level = obj.level || "未知";
								score = obj.score || "未知";
							}
							if (obj.svip_info && obj.svip_info.vip === 1){
								isTxspSvip = true;
								svipEndTime = obj.svip_info.endTime || "未知";
							}
							$.info(`获取VIP信息成功`);
						} else {
							$.warn(`获取VIP信息失败: ${obj.msg || '未知错误'}`);
						}
					} else {
						$.error(`获取VIP信息返回空数据，请检查Cookie是否有效`);
					}
					resolve();
				} catch (e) {
					$.error(`解析VIP信息失败: ${e}`);
					reject(e);
				}
            }        
        )
    })
}

async function readTxspTaskList() {
	return new Promise((resolve) => {
		let url = `https://vip.video.qq.com/rpc/trpc.new_task_system.task_system.TaskSystem/ReadTaskList?rpc_data=%7B%22business_id%22:%221%22,%22platform%22:5%7D`;
		
		let opt = {
			url: url,
			headers: {
				'Cookie': txspCookie,
				'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
				'Referer': 'https://film.video.qq.com/x/grade/',
				'Origin': 'https://film.video.qq.com',
				'Accept': 'application/json',
				'Accept-Language': 'zh-CN,zh;q=0.9',
				'X-Requested-With': 'XMLHttpRequest'
			},
		};
		$.get(opt, async (error, resp, data) => {
			try {
				if (error) {
					$.error(`获取任务列表网络错误: ${error}`);
					resolve();
					return;
				}
				
				if (data && data.length > 0) {
					var obj = JSON.parse(data);
					
					if (obj.ret === 0) {
						month_received_score = obj.limit_info?.month_received_score || "0";
						month_limit = obj.limit_info?.month_limit || "0";
						
						let taskList = obj.task_list || [];
						$.info(`获取到${taskList.length}个任务`);
						
						if (taskList && taskList.length > 0) {
							let txspCheckInTask = taskList.find(task => 
								task.task_id === 101 || 
								task.task_maintitle === "VIP会员每日签到"
							);
							
							if (txspCheckInTask) {
								isTxspCheckIn = txspCheckInTask.task_status === 1;
								$.info(`找到签到任务: ${txspCheckInTask.task_maintitle}`);
								$.info(`任务ID: ${txspCheckInTask.task_id}`);
								$.info(`签到状态: ${isTxspCheckIn ? '已签到' : '未签到'}`);
							} else {
								$.warn(`未找到签到任务`);
								isTxspCheckIn = false;
							}
							
							watchVideoTask = taskList.find(task => 
								task.task_id === 215 || 
								task.task_maintitle === "手机看视频" ||
								task.title === "手机看视频"
							);
							
							if (watchVideoTask) {
								$.info(`找到手机看视频任务: ${watchVideoTask.task_maintitle}`);
								$.info(`任务ID: ${watchVideoTask.task_id}`);
								$.info(`任务状态: ${watchVideoTask.task_status === 1 ? '已完成' : '未完成'}`);
							} else {
								$.warn(`未找到手机看视频任务`);
							}
							
							$.info(`本月已获得: ${month_received_score}V力值，限制: ${month_limit}V力值`);
						} else {
							$.warn(`任务列表为空`);
							isTxspCheckIn = false;
						}
					} else {
						$.warn(`获取任务列表失败: ret=${obj.ret}, msg=${obj.msg || obj.err_msg || '未知错误'}`);
						isTxspCheckIn = false;
					}
				} else {
					$.error(`获取任务列表返回空数据`);
					isTxspCheckIn = false;
				}
				resolve();
			} catch (e) {
				$.error(`解析任务列表失败: ${e}`);
				isTxspCheckIn = false;
				resolve();
			}
		});
	});
}

async function txspCheckIn() {
	return new Promise((resolve, reject) => {
		let url = `https://vip.video.qq.com/rpc/trpc.new_task_system.task_system.TaskSystem/CheckIn?rpc_data=%7B%7D`;
		
		let opt = {
			url: url,
			headers: {
				'Cookie': txspCookie,
				'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
				'Referer': 'https://film.video.qq.com/x/grade/',
				'Origin': 'https://film.video.qq.com',
				'Accept': 'application/json',
				'Accept-Language': 'zh-CN,zh;q=0.9',
				'X-Requested-With': 'XMLHttpRequest'
			},
		};
		$.get(opt, async (error, resp, data) => {
			try {
				if (error) {
					$.error(`签到网络错误: ${error}`);
					$.taskInfo = `签到失败: 网络错误\n`;
					resolve();
					return;
				}
				
				if (data && data.length > 0) {
					var obj = JSON.parse(data);
					
					if (obj.ret === 0 && obj.check_in_score != undefined) {
						$.info(`签到成功：获得${obj.check_in_score}V力值`);
						$.taskInfo = `签到成功：获得${obj.check_in_score}V力值\n`;
					} else if (obj.ret === -2002) {
						$.info(`今天已签到, 明日再来吧`);
						$.taskInfo = `今天已签到, 明日再来吧\n`;
					} else if (obj.ret === 0 && obj.score != undefined) {
						$.info(`签到成功：获得${obj.score}V力值`);
						$.taskInfo = `签到成功：获得${obj.score}V力值\n`;
					} else if (obj.ret === 0) {
						$.info(`签到成功`);
						$.taskInfo = `签到成功\n`;
					} else {
						$.warn(`签到失败，错误码: ${obj.ret}, 错误信息: ${obj.msg || obj.err_msg || '未知错误'}`);
						$.taskInfo = `签到失败, 错误码: ${obj.ret}\n`;
					}
				} else {
					$.error(`签到返回空数据，请检查Cookie是否有效`);
					$.taskInfo = `签到失败: 返回数据为空\n`;
				}
				resolve();
			} catch (e) {
				$.error(`解析签到结果失败: ${e}`);
				$.taskInfo = `签到失败: 解析错误\n`;
				resolve();
			}
		});
	});
}

async function completeWatchVideoTask() {
	return new Promise((resolve, reject) => {
		let url = `https://vip.video.qq.com/rpc/trpc.new_task_system.task_system.TaskSystem/CompleteTask?rpc_data=%7B%22task_id%22:215%7D`;
		
		let opt = {
			url: url,
			headers: {
				'Cookie': txspCookie,
				'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
				'Referer': 'https://film.video.qq.com/x/grade/',
				'Origin': 'https://film.video.qq.com',
				'Accept': 'application/json',
				'Accept-Language': 'zh-CN,zh;q=0.9',
				'X-Requested-With': 'XMLHttpRequest'
			},
		};
		$.get(opt, async (error, resp, data) => {
			try {
				if (error) {
					$.error(`完成手机看视频任务网络错误: ${error}`);
					resolve();
					return;
				}
				
				if (data && data.length > 0) {
					var obj = JSON.parse(data);
					
					if (obj.ret === 0) {
						$.info(`手机看视频任务完成成功`);
						$.taskInfo += `手机看视频任务完成成功\n`;
					} else if (obj.ret === -2002) {
						$.info(`手机看视频任务今天已完成`);
						$.taskInfo += `手机看视频任务今天已完成\n`;
					} else {
						$.warn(`手机看视频任务完成失败，错误码: ${obj.ret}, 错误信息: ${obj.msg || obj.err_msg || '未知错误'}`);
						$.taskInfo += `手机看视频任务完成失败, 错误码: ${obj.ret}\n`;
					}
				} else {
					$.error(`手机看视频任务返回空数据`);
					$.taskInfo += `手机看视频任务返回空数据\n`;
				}
				resolve();
			} catch (e) {
				$.error(`解析手机看视频任务结果失败: ${e}`);
				$.taskInfo += `手机看视频任务解析错误\n`;
				resolve();
			}
		});
	});
}

function getCookie() {
	if($request && $request.method !=`OPTIONS` && $request.url.match(/\/rpc\/trpc\.new_task_system\.task_system\.TaskSystem\/ReadTaskList/)){
		let txsp = $request.headers["Cookie"] || $request.headers["cookie"];
		if (txsp) {
			if (typeof txspCookie === "undefined" || (txspCookie && txspCookie.length === 0)) {
				$.setdata(txsp, "txspCookie");
				$.msg($.name, "🎉 Cookie写入成功", "不用请自行关闭重写!");
			} else if (txsp !== txspCookie) {
				$.setdata(txsp, "txspCookie");
				$.msg($.name, "🎉 Cookie更新成功", "不用请自行关闭重写!");
			} else {
				$.msg($.name, "⚠️ Cookie未变动 跳过更新", "不用请自行关闭重写!");
			}
		}
	}
}

async function SendMsg() {
	if (Notify > 0) {
		if ($.isNode()) {
			await notify.sendNotify($.name, `${$.desc}`);
		} else {
			$.msg($.name, "", `${$.desc}`);
		}
	} else {
		$.log($.desc);
	}
}

async function waitRandom(min, max) {
	var time = getRandomInt(min, max);
	await $.wait(time);
}

function getRandomInt(min, max) {
	min = Math.ceil(min);
	max = Math.floor(max);
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

// 精简版 Env 函数
function Env(name, opts) {
    class Http {
        constructor(env) { this.env = env }
        send(opts, method = 'GET') {
            opts = typeof opts === 'string' ? { url: opts } : opts
            let sender = method === 'POST' ? this.post : this.get
            return new Promise((resolve, reject) => {
                sender.call(this, opts, (err, resp, body) => {
                    if (err) reject(err)
                    else resolve(resp)
                })
            })
        }
        get(opts) { return this.send.call(this.env, opts) }
        post(opts) { return this.send.call(this.env, opts, 'POST') }
    }
    
    return new (class {
        constructor(name, opts) {
            this.name = name
            this.http = new Http(this)
            this.data = null
            this.dataFile = 'box.dat'
            this.logs = []
            this.isMute = false
            this.startTime = new Date().getTime()
            Object.assign(this, opts)
            this.log('', `🔔${this.name}, 开始!`)
        }
        
        getEnv() {
            if (typeof $environment !== "undefined" && $environment['surge-version']) return 'Surge'
            if (typeof module !== "undefined" && module.exports) return 'Node.js'
            if (typeof $task !== "undefined") return 'Quantumult X'
            if (typeof $loon !== "undefined") return 'Loon'
            return 'Unknown'
        }
        
        isNode() { return this.getEnv() === 'Node.js' }
        isQuanX() { return this.getEnv() === 'Quantumult X' }
        isSurge() { return this.getEnv() === 'Surge' }
        isLoon() { return this.getEnv() === 'Loon' }
        
        toObj(str, defaultValue = null) {
            try { return JSON.parse(str) } catch { return defaultValue }
        }
        
        getdata(key) {
            let val = this.getval(key)
            if (/^@/.test(key)) {
                const [, objkey, paths] = /^@(.*?)\.(.*?)$/.exec(key)
                const objval = objkey ? this.getval(objkey) : ''
                if (objval) {
                    try {
                        const objedval = JSON.parse(objval)
                        val = objedval ? this.lodash_get(objedval, paths, '') : val
                    } catch (e) { val = '' }
                }
            }
            return val
        }
        
        setdata(val, key) {
            let issuc = false
            if (/^@/.test(key)) {
                const [, objkey, paths] = /^@(.*?)\.(.*?)$/.exec(key)
                const objdat = this.getval(objkey)
                const objval = objkey ? (objdat === 'null' ? null : objdat || '{}') : '{}'
                try {
                    const objedval = JSON.parse(objval)
                    this.lodash_set(objedval, paths, val)
                    issuc = this.setval(JSON.stringify(objedval), objkey)
                } catch (e) {
                    const objedval = {}
                    this.lodash_set(objedval, paths, val)
                    issuc = this.setval(JSON.stringify(objedval), objkey)
                }
            } else {
                issuc = this.setval(val, key)
            }
            return issuc
        }
        
        getval(key) {
            switch (this.getEnv()) {
                case 'Surge': case 'Loon': return $persistentStore.read(key)
                case 'Quantumult X': return $prefs.valueForKey(key)
                case 'Node.js': 
                    this.data = this.loaddata()
                    return this.data[key]
                default: return (this.data && this.data[key]) || null
            }
        }
        
        setval(val, key) {
            switch (this.getEnv()) {
                case 'Surge': case 'Loon': return $persistentStore.write(val, key)
                case 'Quantumult X': return $prefs.setValueForKey(val, key)
                case 'Node.js': 
                    this.data = this.loaddata()
                    this.data[key] = val
                    this.writedata()
                    return true
                default: return (this.data && this.data[key]) || null
            }
        }
        
        loaddata() {
            if (this.isNode()) {
                this.fs = this.fs || require('fs')
                this.path = this.path || require('path')
                const curDirDataPath = this.path.resolve(this.dataFile)
                const rootDirDataPath = this.path.resolve(process.cwd(), this.dataFile)
                const isCurDirDataPath = this.fs.existsSync(curDirDataPath)
                const isRootDirDataPath = !isCurDirDataPath && this.fs.existsSync(rootDirDataPath)
                if (isCurDirDataPath || isRootDirDataPath) {
                    const datPath = isCurDirDataPath ? curDirDataPath : rootDirDataPath
                    try { return JSON.parse(this.fs.readFileSync(datPath)) } catch (e) { return {} }
                } else return {}
            } else return {}
        }
        
        writedata() {
            if (this.isNode()) {
                this.fs = this.fs || require('fs')
                this.path = this.path || require('path')
                const curDirDataPath = this.path.resolve(this.dataFile)
                const rootDirDataPath = this.path.resolve(process.cwd(), this.dataFile)
                const isCurDirDataPath = this.fs.existsSync(curDirDataPath)
                const isRootDirDataPath = !isCurDirDataPath && this.fs.existsSync(rootDirDataPath)
                const jsondata = JSON.stringify(this.data)
                if (isCurDirDataPath) {
                    this.fs.writeFileSync(curDirDataPath, jsondata)
                } else if (isRootDirDataPath) {
                    this.fs.writeFileSync(rootDirDataPath, jsondata)
                } else {
                    this.fs.writeFileSync(curDirDataPath, jsondata)
                }
            }
        }
        
        lodash_get(source, path, defaultValue = undefined) {
            const paths = path.replace(/\[(\d+)\]/g, '.$1').split('.')
            let result = source
            for (const p of paths) {
                result = Object(result)[p]
                if (result === undefined) return defaultValue
            }
            return result
        }
        
        lodash_set(obj, path, value) {
            if (Object(obj) !== obj) return obj
            if (!Array.isArray(path)) path = path.toString().match(/[^.[\]]+/g) || []
            path.slice(0, -1).reduce((a, c, i) => 
                (Object(a[c]) === a[c] ? a[c] : (a[c] = Math.abs(path[i + 1]) >> 0 === +path[i + 1] ? [] : {})), obj)
            [path[path.length - 1]] = value
            return obj
        }
        
        get(opts, callback = () => {}) {
            if (this.isSurge() || this.isLoon()) {
                $httpClient.get(opts, (err, resp, body) => {
                    if (!err && resp) {
                        resp.body = body
                        resp.statusCode = resp.status
                    }
                    callback(err, resp, body)
                })
            } else if (this.isQuanX()) {
                $task.fetch(opts).then(
                    (resp) => {
                        const { statusCode: status, statusCode, headers, body } = resp
                        callback(null, { status, statusCode, headers, body }, body)
                    },
                    (err) => callback(err)
                )
            } else if (this.isNode()) {
                this.initGotEnv(opts)
                this.got(opts).then(
                    (resp) => {
                        const { statusCode: status, statusCode, headers, body } = resp
                        callback(null, { status, statusCode, headers, body }, body)
                    },
                    (err) => {
                        const { message: error, response: resp } = err
                        callback(error, resp, resp && resp.body)
                    }
                )
            }
        }
        
        post(opts, callback = () => {}) {
            const method = opts.method ? opts.method.toLocaleLowerCase() : 'post'
            if (this.isSurge() || this.isLoon()) {
                $httpClient[method](opts, (err, resp, body) => {
                    if (!err && resp) {
                        resp.body = body
                        resp.statusCode = resp.status
                    }
                    callback(err, resp, body)
                })
            } else if (this.isQuanX()) {
                opts.method = method
                $task.fetch(opts).then(
                    (resp) => {
                        const { statusCode: status, statusCode, headers, body } = resp
                        callback(null, { status, statusCode, headers, body }, body)
                    },
                    (err) => callback(err)
                )
            } else if (this.isNode()) {
                this.initGotEnv(opts)
                const { url, ..._opts } = opts
                this.got[method](url, _opts).then(
                    (resp) => {
                        const { statusCode: status, statusCode, headers, body } = resp
                        callback(null, { status, statusCode, headers, body }, body)
                    },
                    (err) => {
                        const { message: error, response: resp } = err
                        callback(error, resp, resp && resp.body)
                    }
                )
            }
        }
        
        initGotEnv(opts) {
            this.got = this.got || require('got')
            this.cktough = this.cktough || require('tough-cookie')
            this.ckjar = this.ckjar || new this.cktough.CookieJar()
            if (opts) {
                opts.headers = opts.headers || {}
                if (undefined === opts.headers.Cookie && undefined === opts.headers.cookie && undefined === opts.cookieJar) {
                    opts.cookieJar = this.ckjar
                }
            }
        }
        
        msg(title = this.name, subt = '', desc = '', opts = {}) {
            const toEnvOpts = (rawopts) => {
                if (!rawopts) return rawopts
                if (this.isSurge() || this.isLoon()) {
                    return {
                        url: rawopts.url || rawopts.openUrl || rawopts['open-url']
                    }
                } else if (this.isQuanX()) {
                    return {
                        'open-url': rawopts['open-url'] || rawopts.url || rawopts.openUrl
                    }
                }
            }
            
            if (!this.isMute) {
                if (this.isSurge() || this.isLoon()) {
                    $notification.post(title, subt, desc, toEnvOpts(opts))
                } else if (this.isQuanX()) {
                    $notify(title, subt, desc, toEnvOpts(opts))
                }
            }
            
            if (!this.isMuteLog) {
                let logs = [`[${this.name}]`, title]
                subt && logs.push(subt)
                desc && logs.push(desc)
                console.log(logs.join('\n'))
                this.logs = this.logs.concat(logs)
            }
        }
        
        log(...msg) {
            if (msg.length > 0) {
                this.logs = [...this.logs, ...msg]
                console.log(msg.map(m => typeof m === 'object' ? JSON.stringify(m) : m).join(' '))
            }
        }
        
        info(...msg) { this.log(...msg) }
        warn(...msg) { this.log(...msg) }
        error(...msg) { this.log(...msg) }
        
        wait(time) {
            return new Promise((resolve) => setTimeout(resolve, time))
        }
        
        done(val = {}) {
            const endTime = new Date().getTime()
            const costTime = (endTime - this.startTime) / 1000
            this.log('', `🔔${this.name}, 结束! 🕛 ${costTime} 秒`)
            if (this.isSurge() || this.isLoon()) {
                $done(val)
            } else if (this.isQuanX()) {
                $done(val)
            }
        }
    })(name, opts)
}
