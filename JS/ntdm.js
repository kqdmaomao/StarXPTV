const cheerio = createCheerio()
// 导入必要的库
// import * as cheerio from 'cheerio'; // 用于解析HTML
// import $fetch from 'axios' // 用于发送HTTP请求
//
// function jsonify(s){
//
//     return JSON.stringify(s)
// }
// function argsify(s){
//
//     return JSON.parse(s)
// }


const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36"
const headers = {
    'User-Agent': UA,
}

const appConfig = {
    ver: 1,
    title: "NT动漫",
    site: "https://www.ntdm8.com",
    tabs: [{
        name: '日漫',
        ext: {
            url: 'https://www.ntdm8.com/type/riben-{page}.html'
        },
    },{
        name: '国漫',
        ext: {
            url: 'https://www.ntdm8.com/type/zhongguo-{page}.html'
        },
    },{
        name: '欧美',
        ext: {
            url: 'https://www.ntdm8.com/type/omei-{page}.html'
        },
    }
    ]
}

async function getConfig() {
    return jsonify(appConfig)
}

async function getCards(ext) {


    ext = argsify(ext)
    let cards = []
    let url = ext.url
    let page = ext.page || 1
    url = url.replace('{page}', page)

    const { data } = await $fetch.get(url, {
        headers
    })

    const $ = cheerio.load(data)
    $("div.cell").each((_, each) => {
        cards.push({
            vod_id: $(each).children("a").first().attr("href").match(/\/(\d+)\./)[1].toString(),
            vod_name: $(each).children("a").first().find("img").attr('alt'),
            vod_pic: $(each).children("a").first().find("img").attr('src'),
            vod_remarks: $(each).children("a").first().find("span").text(),
            ext: {
                url: appConfig.site +$(each).children("a").first().attr('href'),
            },
        })

    })

    return jsonify({
        list: cards,
    });
}

async function getTracks(ext) {
    ext = argsify(ext)
    let groups = []
    let url = ext.url

    const { data } = await $fetch.get(url, {
        headers
    })

    const $ = cheerio.load(data)
    let gn = []
    $("#menu0 li").each((_, each) => {
        gn.push($(each).text())
    })

    $(".movurl").each((i, each) => {
        let group = {
            title: gn[i],
            tracks: [],
        }
        $(each).find('li').each((_, item) => {
            group.tracks.push({
                name: $(item).find('a').text(),
                pan: '',
                ext: {
                    url: appConfig.site + $(item).find('a').attr('href')
                }
            })
        })
        groups.push(group)
    })

    return jsonify({ list: groups })
}

async function getPlayinfo(ext) {
    ext = argsify(ext)
    let url = ext.url
    const { data } = await $fetch.get(`http://89.58.6.122:8000/getplayurl?url=${url}`, {
        headers
    })
    let playurl=argsify(data).result[0].url
    $print(playurl)

    return jsonify({ 'urls': [playurl] })
}


async function search(ext) {
    ext = argsify(ext)
    let cards = [];

    let text = encodeURIComponent(ext.text)
    let page = ext.page || 1

    const url = appConfig.site + `/search/${text}----------${page}---.html`
    const { data } = await $fetch.get(url, {
        headers
    })

    const $ = cheerio.load(data)
    $("div.cell").each((_, each) => {
        cards.push({
            vod_id: $(each).children("a").first().attr("href").match(/\/(\d+)\./)[1].toString(),
            vod_name: $(each).children("a").first().find("img").attr('alt'),
            vod_pic: $(each).children("a").first().find("img").attr('src'),
            vod_remarks: $(each).children("a").first().find("span").text(),
            ext: {
                url: appConfig.site +$(each).children("a").first().attr('href'),
            },
        })

    })

    return jsonify({
        list: cards,
    })
}



/***
 以下为测试代码
 */

// 测试搜索功能
/*search("首尔").then(list => {
    console.log(list)
})*/

// getPlayinfo("6").then(list=>{
//
//     console.log()
// })
// //
//  getConfig().then(list => {
//     list = JSON.parse(list)
//
//     for (const listElement of list.tabs) {
//         getCards(JSON.stringify(listElement.ext)).then(entity => {
//             //console.log(entity);
//             // entity = JSON.parse(entity)
//             // for (const entityElement of entity.list) {
//             //     getTracks(JSON.stringify(entityElement.ext)).then(vod => {
//             //         console.log(vod);
//             //     })
//             // }
//             entity = JSON.parse(entity)
//             for (const entityElement of entity.list) {
//                 getTracks(JSON.stringify(entityElement.ext)).then(vod => {
//                     console.log(vod);
//                 })
//             }
//
//         })
//     }
// }).catch(error => {
//     console.error('Error fetching tabs:', error);
// });