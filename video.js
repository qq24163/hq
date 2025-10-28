/**
*@file       腾讯视频
*@desp       本脚本仅适用于腾讯视频会员每日签到，仅测试Quantumult X、青龙（只支持单账号）
*@env        txspCookie、isSkipTxspCheckIn
*@updated    2024-7-18
*@version    v1.0.3

🌟 环境变量说明
txspCookie：腾讯视频app的Cookie
isSkipTxspCheckIn：值域[true, false] 默认为false表示正常进行腾讯视频会员签到，用于特殊情况下（账号需要获取短信验证码或者需要过滑块验证码）时开启
❗ 本脚本只能给腾讯视频正常账号签到，如有验证请设置isSkipTxspCheckIn为true，直到手动签到无验证为止
*/

const $ = new Env("腾讯视频");

let txspCookie = ($.isNode() ? process.env.txspCookie : $.getdata('txspCookie')) || "";
let isSkipTxspCheckIn = $.isNode() ? process.env.isSkipTxspCheckIn : (($.getdata('isSkipTxspCheckIn') !== undefined && $.getdata('isSkipTxspCheckIn') !== '') ? JSON.parse($.getdata('isSkipTxspCheckIn')) : false);
let dayOfGetMonthTicket = ($.isNode() ? process.env.dayOfGetMonthTicket : $.getdata('dayOfGetMonthTicket')) || 28;
let dayOfGetMonthTicket1 = ($.isNode() ? process.env.dayOfGetMonthTicket1 : $.getdata('dayOfGetMonthTicket1')) || 18;
let dayOfGetMonthTicket2 = ($.isNode() ? process.env.dayOfGetMonthTicket2 : $.getdata('dayOfGetMonthTicket2')) || 8;
let module_id = ($.isNode() ? process.env.module_id : $.getdata('module_id')) || "p2e26y18i0j2i45eg5fph4fqr5";
let module_id1 = ($.isNode() ? process.env.module_id1 : $.getdata('module_id1')) || "d19z5otu8rqyc68z06p4ok5165";
let module_id2 = ($.isNode() ? process.env.module_id2 : $.getdata('module_id2')) || "xhx9iz36qw48e6ppjho5sk5pql";

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
				
				// 执行签到任务
				if (!isTxspCheckIn && month_received_score !== month_limit) {
					await txspCheckIn();
					await waitRandom(1000, 2000);
				} else if (isTxspCheckIn){
					$.info(`今天已签到, 明日再来吧`);
				} else if (month_received_score === month_limit){
					$.info(`本月活跃任务已满${month_limit}V力值，下个月再来哦`);
				}
				
				// 执行手机看视频任务
				if (watchVideoTask && watchVideoTask.task_status === 0) {
					await completeWatchVideoTask();
					await waitRandom(1000, 2000);
				}
			}
			$.info(`--------- 结束 ---------\n`);
            $.info(`---- 开始 领取28日keep会员月卡 ----`);
			await getDayTicket3();
			await waitRandom(1000, 2000);
			$.info(`--------- 结束 ---------\n`);
            /*$.info(`---- 开始 领取18日keep会员月卡 ----`);
			//await getDayTicket1();
			await waitRandom(1000, 2000);
			$.info(`--------- 结束 ---------\n`);
            $.info(`---- 开始 领取8日keep会员月卡 ----`);
			//await getDayTicket2();
			await waitRandom(1000, 2000);
			$.info(`--------- 结束 ---------\n`);
			$.info(`---- 开始 领取28日keep会员月卡 ----`);
			var today = new Date();
			var date = today.getDate();
			if (date !== dayOfGetMonthTicket){
				$.info(`目标日期：${dayOfGetMonthTicket}号`);
				$.info(`今天是${date}号`);
				$.info(`跳过`);
			} else {
				$.info(`目标日期：${dayOfGetMonthTicket}号`);
				$.info(`今天是${date}号`);
				await getDayTicket();
			}
            $.info(`--------- 结束 ---------\n`);
			$.info(`---- 开始 领取18日keep会员月卡 ----`);
			var today = new Date();
			var date = today.getDate();
			if (date !== dayOfGetMonthTicket1){
				$.info(`目标日期：${dayOfGetMonthTicket1}号`);
				$.info(`今天是${date}号`);
				$.info(`跳过`);
			} else {
				$.info(`目标日期：${dayOfGetMonthTicket1}号`);
				$.info(`今天是${date}号`);
				await getDayTicket1();
			}
            $.info(`--------- 结束 ---------\n`);
			$.info(`---- 开始 领取8日keep会员月卡 ----`);
			var today = new Date();
			var date = today.getDate();
			if (date !== dayOfGetMonthTicket2){
				$.info(`目标日期：${dayOfGetMonthTicket2}号`);
				$.info(`今天是${date}号`);
				$.info(`跳过`);
			} else {
				$.info(`目标日期：${dayOfGetMonthTicket2}号`);
				$.info(`今天是${date}号`);
				await getDayTicket2();
			}
            $.info(`--------- 结束 ---------\n`);*/
		}
		await SendMsg();
	})()
		.catch((e) => $.error(e))
		.finally(() => $.done());
}

/**
 * 领取测试
 * @async
 * @function getDayTicket
 * @returns
 */
async function getDayTicket3() {
	return new Promise((resolve, reject) => {
		let timestamp = Date.now();
		$.info(`   ⏰ 时间戳: ${timestamp}`);
		// 使用你抓包成功的URL格式
		let url = `https://activity.video.qq.com/fcgi-bin/asyn_activity?platform=8002&module_id=p77xaoxh965pic3d2goyhs5cpu&act_id=9y6scr7xd58aq9zsk7oe5gdf8a&type=100250&option=100&otype=xjson&_ts=${timestamp}`;
		let opt = {
			url: url,
			headers: {
				Origin: "https://film.video.qq.com",
				Referer: "https://film.video.qq.com/x/magic-act/9y6scr7xd58aq9zsk7oe5gdf8a/10200",
				Cookie: txspCookie,
			},
		};
		$.get(opt, async (error, resp, data) => {
			try {
				var obj = JSON.parse(data);
				var code = obj.ret;
				if (code === 0) {
					$.info(`领取28日keep会员月卡成功`);
					$.taskInfo += `领取keep会员月卡成功成功\n`;
				} else if (code === -1014) {
					$.info(`物品已领完, 下次再来吧`);
					$.taskInfo += `物品已领完, 下次再来吧\n`;
				} else {
					$.warn(`领取keep会员月卡成功失败，异常详细信息如下\n${data}`);
					$.taskInfo += `领取keep会员月卡成功失败，异常详细信息请查看日志\n`;
				}
			} catch (e) {
				$.error(e);
			} finally {
				resolve();
			}
		});
	});
}

/**
 * 领取28
 * @async
 * @function getDayTicket
 * @returns
 */
async function getDayTicket() {
	return new Promise((resolve, reject) => {
		let timestamp = Date.now();
		$.info(`   ⏰ 时间戳: ${timestamp}`);
		// 使用你抓包成功的URL格式
		let url = `https://activity.video.qq.com/fcgi-bin/asyn_activity?type=100251&option=101&act_id=9y6scr7xd58aq9zsk7oe5gdf8a&module_id=${module_id}&is_prepublish=0&platform=7&otype=xjson&_ts=${timestamp}`;
		let opt = {
			url: url,
			headers: {
				Origin: "https://film.video.qq.com",
				Referer: "https://film.video.qq.com/x/magic-act/9y6scr7xd58aq9zsk7oe5gdf8a/10200",
				Cookie: txspCookie,
			},
		};
		$.get(opt, async (error, resp, data) => {
			try {
				var obj = JSON.parse(data);
				var code = obj.ret;
				if (code === 0) {
					$.info(`领取28日keep会员月卡成功`);
					$.taskInfo += `领取keep会员月卡成功成功\n`;
				} else if (code === -1014) {
					$.info(`物品已领完, 下次再来吧`);
					$.taskInfo += `物品已领完, 下次再来吧\n`;
				} else {
					$.warn(`领取keep会员月卡成功失败，异常详细信息如下\n${data}`);
					$.taskInfo += `领取keep会员月卡成功失败，异常详细信息请查看日志\n`;
				}
			} catch (e) {
				$.error(e);
			} finally {
				resolve();
			}
		});
	});
}
/**
 * 领取18
 * @async
 * @function getDayTicket
 * @returns
 */
async function getDayTicket1() {
	return new Promise((resolve, reject) => {
		let timestamp = Date.now();
		$.info(`   ⏰ 时间戳: ${timestamp}`);
		// 使用你抓包成功的URL格式
		let url = `https://activity.video.qq.com/fcgi-bin/asyn_activity?type=100251&option=101&act_id=9y6scr7xd58aq9zsk7oe5gdf8a&module_id=${module_id1}&is_prepublish=0&platform=7&otype=xjson&_ts=${timestamp}`;
		let opt = {
			url: url,
			headers: {
				Origin: "https://film.video.qq.com",
				Referer: "https://film.video.qq.com/x/magic-act/9y6scr7xd58aq9zsk7oe5gdf8a/10200",
				Cookie: txspCookie,
			},
		};
		$.get(opt, async (error, resp, data) => {
			try {
				var obj = JSON.parse(data);
				var code = obj.ret;
				if (code === 0) {
					$.info(`领取18日keep会员月卡成功`);
					$.taskInfo += `领取keep会员月卡成功成功\n`;
				} else if (code === -1014) {
					$.info(`物品已领完, 下次再来吧`);
					$.taskInfo += `物品已领完, 下次再来吧\n`;
				} else {
					$.warn(`领取keep会员月卡成功失败，异常详细信息如下\n${data}`);
					$.taskInfo += `领取keep会员月卡成功失败，异常详细信息请查看日志\n`;
				}
			} catch (e) {
				$.error(e);
			} finally {
				resolve();
			}
		});
	});
}
/**
 * 领取8
 * @async
 * @function getDayTicket
 * @returns
 */
async function getDayTicket2() {
	return new Promise((resolve, reject) => {
		let timestamp = Date.now();
		$.info(`   ⏰ 时间戳: ${timestamp}`);
		// 使用你抓包成功的URL格式
		let url = `https://activity.video.qq.com/fcgi-bin/asyn_activity?type=100251&option=101&act_id=9y6scr7xd58aq9zsk7oe5gdf8a&module_id=${module_id2}&is_prepublish=0&platform=7&otype=xjson&_ts=${timestamp}`;
		let opt = {
			url: url,
			headers: {
				Origin: "https://film.video.qq.com",
				Referer: "https://film.video.qq.com/x/magic-act/9y6scr7xd58aq9zsk7oe5gdf8a/10200",
				Cookie: txspCookie,
			},
		};
		$.get(opt, async (error, resp, data) => {
			try {
				var obj = JSON.parse(data);
				var code = obj.ret;
				if (code === 0) {
					$.info(`领取8日keep会员月卡成功`);
					$.taskInfo += `领取keep会员月卡成功成功\n`;
				} else if (code === -1014) {
					$.info(`物品已领完, 下次再来吧`);
					$.taskInfo += `物品已领完, 下次再来吧\n`;
				} else {
					$.warn(`领取keep会员月卡成功失败，异常详细信息如下\n${data}`);
					$.taskInfo += `领取keep会员月卡成功失败，异常详细信息请查看日志\n`;
				}
			} catch (e) {
				$.error(e);
			} finally {
				resolve();
			}
		});
	});
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
				'Referer': 'https://film.video.qq.com/x/grade/?ovscroll=0&hidetitlebar=1&ptag=channel.rightmodule&jump_task=1&aid=V0',
				'Origin': 'https://film.video.qq.com'
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
						// 获取限制信息
						month_received_score = obj.limit_info?.month_received_score || "0";
						month_limit = obj.limit_info?.month_limit || "0";
						
						let taskList = obj.task_list || [];
						$.info(`获取到${taskList.length}个任务`);
						
						if (taskList && taskList.length > 0) {
							// 查找签到任务
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
							
							// 查找手机看视频任务
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
				'Referer': 'https://film.video.qq.com/x/grade/?ovscroll=0&hidetitlebar=1&ptag=channel.rightmodule&jump_task=1&aid=V0',
				'Origin': 'https://film.video.qq.com'
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
		// 手机看视频任务的完成接口
		let url = `https://vip.video.qq.com/rpc/trpc.new_task_system.task_system.TaskSystem/CompleteTask?rpc_data=%7B%22task_id%22:215%7D`;
		
		let opt = {
			url: url,
			headers: {
				'Cookie': txspCookie,
				'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1',
				'Referer': 'https://film.video.qq.com/x/grade/?ovscroll=0&hidetitlebar=1&ptag=channel.rightmodule&jump_task=1&aid=V0',
				'Origin': 'https://film.video.qq.com'
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
