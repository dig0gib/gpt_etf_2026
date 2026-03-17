
const ETF_LIST=[
{ id:'sp500', name:'KODEX 미국S&P500', code:'379800'},
{ id:'nasdaq', name:'KODEX 미국나스닥100', code:'379810'},
{ id:'semi', name:'TIGER 반도체TOP10', code:'396500'},
{ id:'defense', name:'KODEX 방산TOP10', code:'0080G0'},
{ id:'value', name:'ACE 코리아밸류업', code:'496120'}
]

async function fetchPrices(){

const codes=ETF_LIST.map(e=>e.code).join(",")

const r=await fetch(`/api/price?codes=${codes}`)
const data=await r.json()

let html=""

ETF_LIST.forEach(e=>{

html+=`<div>${e.name} : ${data[e.code]||"N/A"}</div>`

})

document.getElementById("prices").innerHTML=html

}

async function loadRadar(){

const r=await fetch("/api/radar")
const data=await r.json()

let html=""

data.forEach(e=>{

html+=`<div>${e.symbol} 상승률 ${e.momentum}%</div>`

})

document.getElementById("radar").innerHTML=html

}

async function generateReport(){

const el=document.getElementById("report")
el.innerText="생성중..."

const r=await fetch("/api/claude",{
method:"POST",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify({
model:"claude-3-sonnet-20240229",
max_tokens:1000,
messages:[{role:"user",content:"한국 ETF 투자 보고서를 작성해줘"}]
})
})

const j=await r.json()

el.innerText=JSON.stringify(j,null,2)

}

function saveTg(){

localStorage.setItem("tgToken",document.getElementById("tgToken").value)
localStorage.setItem("tgChat",document.getElementById("tgChat").value)

alert("저장 완료")

}
