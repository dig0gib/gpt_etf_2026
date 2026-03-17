
export default async function handler(req,res){

const {codes}=req.query

const result={}

for(const code of codes.split(",")){

try{

const r=await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${code}.KS?interval=1d&range=5d`)

const j=await r.json()

const price=j.chart.result[0].meta.regularMarketPrice

result[code]=price

}catch(e){

result[code]=null

}

}

res.status(200).json(result)

}
