
export default async function handler(req,res){

const symbols=[
"379800.KS",
"379810.KS",
"396500.KS",
"069500.KS"
]

const result=[]

for(const s of symbols){

try{

const r=await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${s}?interval=1d&range=1mo`)
const j=await r.json()

const prices=j.chart.result[0].indicators.quote[0].close

const first=prices[0]
const last=prices[prices.length-1]

const momentum=((last-first)/first*100).toFixed(2)

result.push({symbol:s,momentum})

}catch(e){}

}

result.sort((a,b)=>b.momentum-a.momentum)

res.json(result)

}
