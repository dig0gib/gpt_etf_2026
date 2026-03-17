
export function calcPortfolio(trades){

const map={}

trades.sort((a,b)=>new Date(a.date)-new Date(b.date))

for(const t of trades){

if(!map[t.etf]) map[t.etf]={qty:0,totalCost:0,realized:0}

const p=map[t.etf]

if(t.type==="buy"){

p.totalCost+=t.qty*t.price
p.qty+=t.qty

}else if(t.type==="sell"){

const avg=p.totalCost/p.qty
p.realized+=(t.price-avg)*t.qty
p.totalCost-=avg*t.qty
p.qty-=t.qty

}

}

return map

}
