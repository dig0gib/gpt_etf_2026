
export function parseTimings(text){

const start=text.indexOf("[매매타이밍]")
const end=text.indexOf("[/매매타이밍]")

if(start===-1) return null

const block=text.slice(start,end)

const lines=block.split("\n")

const result={}

lines.forEach(l=>{

if(!l.includes("|")) return

const p=l.split("|")

result[p[0].trim()]={
buy:p[2],
sell:p[5]
}

})

return result

}
