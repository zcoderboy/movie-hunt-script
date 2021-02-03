require('dotenv').config()
const supabaseClient = require('./supabaseClient')
const fetch = require('node-fetch')
const cheerio = require('cheerio')
const Nightmare = require('nightmare')

function getData(html) {
  let url = "";
  const $ = cheerio.load(html);
  if($('#kp-wp-tab-overview').find($('a.hide-focus-ring')).length){
    url = $('#kp-wp-tab-overview').find($('a.hide-focus-ring')).attr('href')
  }
  return url;
}

async function getUrl(searchUrl){
  const nightmare = Nightmare({show: true})
  return nightmare
  .goto(searchUrl)
  .wait('body')
  .evaluate(() => {
    return document.querySelector('body').innerHTML
  })
  .end()
}

async function getMediaInfos(type,mediaId){
  return new Promise(async (resolve,reject) => {
    try{
      const response = await fetch(`https://api.themoviedb.org/3/${type}/${mediaId}`,{
        method: "GET",
        headers: {
          'Authorization': `Bearer ${process.env.IMDB_TOKEN}`,
        },
      })
      const data = await response.json()
      resolve(data)
    }catch(error){
      reject(error)
    }
  })
}

async function saveMedia(data,table,mediaType = "movie"){
  for(let i = 0; i < data.results.length ; i++){
    show = data.results[i]
    const searchValue = show.name ? show.name : show.title
    try{
      const response  = await getUrl(`https://www.google.com/search?q=${searchValue}`)
      const url = getData(response)
      if(url && (url.includes("netflix") || url.includes("primevideo"))){
        let network = url.includes("netflix") ? "NETFLIX" : "AMAZON PRIME VIDEO"
        let infos = mediaType ? await getMediaInfos(mediaType,show.id) : await getMediaInfos(show.media_type,show.id)
        await supabaseClient
        .from(table)
        .insert([
          { data: infos, provider: network, providerUrl: url },
        ])
      }
    }catch(error){
      console.log(error)
    }
  }
}

async function loadTrending(){
  const response = await fetch('https://api.themoviedb.org/3/trending/all/week?page=3',{
    method: "GET",
    headers: {
      'Authorization': `Bearer ${process.env.IMDB_TOKEN}`,
    },
  })
  const data = await response.json()
  saveMedia(data,'trending')
}

async function getMediaByGenre(media,page,year){
  const response = await fetch(`https://api.themoviedb.org/3/discover/${media}?year=${year}&page=${page}`,{
    method: "GET",
    headers: {
      'Authorization': `Bearer ${process.env.IMDB_TOKEN}`,
    },
  })
  return response.json()
}

async function test(){
  let numPages = 20
  for(let i = 1; i <= numPages; i++){
    let data = await getMediaByGenre('movie',i,2020)
    console.log(data)
    await saveMedia(data,"movies","movie")
  }
}

test()