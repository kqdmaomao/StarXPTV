// =====================
// B站 xptv 插件 (v4.1 最终稳定版)
// =====================

const $config = argsify($config_str)
// 请用您刚复制的完整、新鲜的 Cookie 字符串替换下面这个值
const BILI_COOKIE = $config.cookie
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"

// 配置
async function getConfig() {
    // 启动检查：确保关键令牌存在
    if (!BILI_COOKIE || !BILI_COOKIE.includes("SESSDATA") || !BILI_COOKIE.includes("bili_jct")) {
        $utils.toastError("BILI_COOKIE 缺失 SESSDATA 或 bili_jct，请重新登录并复制完整 Cookie");
        return jsonify({ ver: 4, title: "哔哩哔哩 (Cookie失效)", site: "https://www.bilibili.com/", tabs: [] })
    }
    
    $utils.toastInfo("加载 Bilibili v4.1 配置...")
    
    const appConfig = {
        ver: 4,
        title: "哔哩哔哩 (稳定版)",
        site: "https://www.bilibili.com/",
        tabs: [
            // === 核心推荐 ===
            { name: "个性推荐", ext: { id: "recommend" } },
            { name: "全站热门", ext: { id: "hot" } },
            
            // === 影视分区 (最新/热门) ===
            { name: "电视剧(最新)", ext: { id: "category", rid: 11, type: "new" } },
            { name: "电视剧(热门)", ext: { id: "category", rid: 11, type: "rank" } },
            { name: "电影(最新)", ext: { id: "category", rid: 23, type: "new" } },
            { name: "电影(热门)", ext: { id: "category", rid: 23, type: "rank" } },
            { name: "番剧(最新)", ext: { id: "category", rid: 13, type: "new" } },
            { name: "纪录片(最新)", ext: { id: "category", rid: 177, type: "new" } },
            
            // === 热门分区 ===
            { name: "综艺", ext: { id: "category", rid: 5, type: "rank" } },
            { name: "动画", ext: { id: "category", rid: 1, type: "rank" } },
            { name: "国创", ext: { id: "category", rid: 168, type: "rank" } },
            { name: "音乐", ext: { id: "category", rid: 3, type: "rank" } },
            { name: "舞蹈", ext: { id: "category", rid: 129, type: "rank" } },
            { name: "游戏", ext: { id: "category", rid: 4, type: "rank" } },
            { name: "知识", ext: { id: "category", rid: 36, type: "rank" } },
            { name: "科技", ext: { id: "category", rid: 188, type: "rank" } },
            { name: "体育", ext: { id: "category", rid: 234, type: "rank" } },
            { name: "汽车", ext: { id: "category", rid: 223, type: "rank" } },
            { name: "生活", ext: { id: "category", rid: 160, type: "rank" } },
            { name: "美食", ext: { id: "category", rid: 211, type: "rank" } },
            { name: "鬼畜", ext: { id: "category", rid: 119, type: "rank" } },
            { name: "时尚", ext: { id: "category", rid: 155, type: "rank" } },
            { name: "动物圈", ext: { id: "category", rid: 217, type: "rank" } }
        ]
    }

    return jsonify(appConfig)
}

// 获取卡片列表
async function getCards(ext) {
    ext = argsify(ext)
    const { page = 1, id, rid, type = "rank", wd = "" } = ext
    let cards = []

    try {
        let apiUrl = ""
        let sortText = ""

        if (id === "recommend") {
            apiUrl = `https://api.bilibili.com/x/web-interface/index/top/feed/rcmd?ps=20&fresh_idx=${page}&feed_version=V1`
            sortText = "个性推荐"
        } else if (id === "hot") {
            apiUrl = `https://api.bilibili.com/x/web-interface/popular?pn=${page}&ps=20`
            sortText = "全站热门"
        } else if (id === "category") {
            sortText = type === "new" ? "最新发布" : "热门排行"
            if (type === "new") {
                apiUrl = `https://api.bilibili.com/x/web-interface/dynamic/region?rid=${rid}&pn=${page}&ps=20`
            } else {
                apiUrl = `https://api.bilibili.com/x/web-interface/ranking/v2?rid=${rid}&type=all&pn=${page}&ps=20`
            }
        }

        if (apiUrl) {
            $utils.toastInfo(`加载: ${sortText} (第${page}页)`)
            
            const { data } = await $fetch.get(apiUrl, {
                headers: { "User-Agent": UA, "Cookie": BILI_COOKIE, "Referer": "https://www.bilibili.com/" }
            })
            const json = argsify(data)
            
            // API 错误码检查
            if (json.code !== 0) {
                const errMsg = json.msg || json.message || "未知错误";
                $print(`BiliBili API Error Code: ${json.code}, Message: ${errMsg}`);
                
                let userTip = `数据获取失败 (Code: ${json.code})`
                if (json.code === -101 || json.code === -400) {
                    userTip = "登录信息过期或缺失，请更新 BILI_COOKIE"; // 重点提示
                }
                
                $utils.toastError(userTip);
                return jsonify({ list: [] });
            }
            
            const dataContainer = json.data || {}; 
            
            const listData = dataContainer.item || dataContainer.items || dataContainer.list || dataContainer.archives || dataContainer.result || []
            
            cards = listData.map(v => {
                const vodId = v.bvid || v.aid || v.id || ""
                if (!vodId) return null
                
                return {
                    vod_id: vodId,
                    vod_name: (v.title || v.name || "未知标题").replace(/<[^>]+>/g, ""),
                    vod_pic: (v.pic || v.cover || "").replace(/@\d+w_\d+h.*$/, ""),
                    vod_remarks: formatDate(v.pubdate || v.ctime || v.created || v.publish_time), 
                    vod_sub: formatVideoSubtitle(v),
                    ext: { 
                        bvid: v.bvid || v.id || "", 
                        cid: v.cid || 0, 
                        season_id: v.season_id || 0,
                        aid: v.aid || 0
                    }
                }
            }).filter(c => c && c.vod_id)
        }

        if (cards.length === 0) {
             $utils.toastInfo(`该页数据为空`)
        }

        if (wd) {
            cards = cards.filter(c => c.vod_name.toLowerCase().includes(wd.toLowerCase()))
        }

    } catch (e) {
        $print(`getCards error: ${e}`)
        $utils.toastError(`加载失败: ${e.message}`)
    }

    return jsonify({ list: cards })
}

// 播放地址入口 (无变化)
async function getTracks(ext) {
    ext = argsify(ext)
    const { bvid, cid, vod_name, season_id, aid } = ext 
    
    if (season_id) {
        return await handleSeasonVideo(season_id, bvid, cid, vod_name)
    } else {
        return await handleSingleVideo(bvid, cid, vod_name, aid)
    }
}

// ... (以下函数均无逻辑变化，为保持代码完整性保留)

// 处理剧集视频
async function handleSeasonVideo(season_id, bvid, cid, vod_name) {
    $utils.toastInfo(`加载剧集列表...`)
    try {
        const seasonApi = `https://api.bilibili.com/pgc/view/web/season?season_id=${season_id}`
        const { data } = await $fetch.get(seasonApi, {
            headers: { "User-Agent": UA, "Referer": "https://www.bilibili.com", "Cookie": BILI_COOKIE }
        })
        const json = argsify(data)
        const episodes = json.result?.episodes || []
        
        const trackGroups = []
        for (const ep of episodes) {
            const episodeTracks = await getEpisodeTracks(ep)
            if (episodeTracks.length > 0) {
                trackGroups.push({
                    title: ep.title || `第${ep.index}话`,
                    tracks: episodeTracks,
                    defaultQuality: "1080P"
                })
            }
        }
        if (trackGroups.length > 0) return jsonify({ list: trackGroups })
        if (bvid && cid) return await handleSingleVideo(bvid, cid, vod_name)
    } catch (e) {}
    return createEmptyTrackGroup(vod_name)
}

// 获取剧集单集
async function getEpisodeTracks(episode) {
    const { bvid, cid, id: ep_id } = episode
    const tracks = []
    const qualityLevels = getQualityLevels()
    
    for (const { qn, n } of qualityLevels) {
        const url = await tryPgcPlayUrl(ep_id, cid, qn, bvid)
        if (url) {
            tracks.push({ name: n, ext: { url } })
            if (qn >= 80) break
        }
    }
    return tracks
}

// 处理单视频
async function handleSingleVideo(bvid, cid, vod_name) {
    if (!bvid) return createEmptyTrackGroup(vod_name)
    
    let effectiveCid = cid
    if (!effectiveCid) {
        const info = await getVideoInfo(bvid)
        if (info) {
            effectiveCid = info.cid
            if (!vod_name) vod_name = info.title
        }
    }
    if (!effectiveCid) return createEmptyTrackGroup(vod_name)
    
    const tracks = []
    const qualityLevels = getQualityLevels()
    
    for (const { qn, n } of qualityLevels) {
        let url = await tryStandardPlayUrl(bvid, effectiveCid, qn)
        if (!url) url = await tryPgcPlayUrl(0, effectiveCid, qn, bvid)
        
        if (url) {
            tracks.push({ name: n, ext: { url } })
            if (qn >= 80) break 
        }
    }
    
    if (tracks.length === 0) {
        $utils.toastError(`无可用源，可能需要大会员或地区限制`)
        return createEmptyTrackGroup(vod_name)
    }
    
    return jsonify({ 
        list: [{ title: vod_name || "视频", tracks, defaultQuality: "1080P" }] 
    })
}

// 接口：PGC (影视)
async function tryPgcPlayUrl(ep_id, cid, qn, bvid = "") {
    try {
        let apiUrl = `https://api.bilibili.com/pgc/player/web/playurl?cid=${cid}&qn=${qn}&fnval=1&fnver=0&otype=json&fourk=1`
        if (ep_id) apiUrl += `&ep_id=${ep_id}`
        if (bvid) apiUrl += `&bvid=${bvid}`
        
        const { data } = await $fetch.get(apiUrl, {
            headers: { "User-Agent": UA, "Referer": "https://www.bilibili.com", "Cookie": BILI_COOKIE }
        })
        const json = argsify(data)
        if (json.code === 0 && json.result?.durl?.[0]?.url) return json.result.durl[0].url
    } catch (e) {}
    return null
}

// 接口：UGC (普通视频)
async function tryStandardPlayUrl(bvid, cid, qn) {
    try {
        const flvUrl = `https://api.bilibili.com/x/player/playurl?bvid=${bvid}&cid=${cid}&qn=${qn}&fnval=1&fnver=0&otype=json&fourk=1`
        const { data } = await $fetch.get(flvUrl, {
            headers: { "User-Agent": UA, "Referer": "https://www.bilibili.com", "Cookie": BILI_COOKIE }
        })
        const json = argsify(data)
        if (json.code === 0 && json.data?.durl?.[0]?.url) return json.data.durl[0].url
    } catch (e) {}
    return null
}

// 辅助函数
function getQualityLevels() {
    return BILI_COOKIE.includes("SESSDATA") ? 
        [{qn:112,n:"1080P+"},{qn:80,n:"1080P"},{qn:64,n:"720P"},{qn:32,n:"480P"}] : 
        [{qn:64,n:"480P"},{qn:16,n:"360P"}]
}

function createEmptyTrackGroup(title) {
    return jsonify({ 
        list: [{ title: title || "错误", tracks: [{ name: "无法播放", ext: { url: "" } }] }] 
    })
}

// 播放信息头
async function getPlayinfo(ext) {
    ext = argsify(ext)
    return jsonify({
        urls: [ext.url],
        headers: [{ "User-Agent": UA, "Referer": "https://www.bilibili.com", "Origin": "https://www.bilibili.com" }]
    })
}

// 搜索 (无变化)
async function search(ext) {
    ext = argsify(ext)
    let cards = []
    let text = encodeURIComponent(ext.text || ext.wd || "")
    let page = ext.page || 1

    if (!text) return jsonify({ list: [] })

    const apiUrl = `https://api.bilibili.com/x/web-interface/search/type?search_type=video&keyword=${text}&page=${page}&page_size=20&order=totalrank`
    
    try {
        const { data } = await $fetch.get(apiUrl, {
            headers: { "User-Agent": UA, "Cookie": BILI_COOKIE, "Referer": "https://search.bilibili.com/" }
        })
        const json = argsify(data)
        if (json.code === 0 && json.data.result) {
            cards = json.data.result.map(v => ({
                vod_id: v.bvid,
                vod_name: v.title.replace(/<[^>]+>/g, ""),
                vod_pic: (v.pic.startsWith("http") ? v.pic : `https:${v.pic}`).replace(/@\d+w_\d+h.*$/, ""),
                vod_remarks: formatDate(v.pubdate),
                vod_sub: formatVideoSubtitle({author: v.author, play: v.play}),
                ext: { bvid: v.bvid, cid: v.cid || 0, season_id: v.season_id || 0 }
            }))
        }
    } catch (e) {
        $print(`Search error: ${e}`)
    }
    return jsonify({ list: cards })
}

// 视频详情获取
async function getVideoInfo(bvid) {
    try {
        const { data } = await $fetch.get(`https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`, {
            headers: { "User-Agent": UA, "Cookie": BILI_COOKIE }
        })
        const json = argsify(data)
        return (json.code === 0 && json.data) ? json.data : null
    } catch (e) { return null }
}

function formatDate(timestamp) {
    if (!timestamp) return ""
    const date = new Date(timestamp * 1000)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function formatNumber(num) {
    return num >= 10000 ? (num / 10000).toFixed(1) + '万' : num
}

function formatVideoSubtitle(video) {
    const owner = video.owner?.name || video.author || video.up || '未知UP主'
    const play = video.stat?.view || video.play || 0
    return `${owner} | ${formatNumber(play)}`
}
