
export default async function handler(req,res){

try{

const r=await fetch("https://api.anthropic.com/v1/messages",{
method:"POST",
headers:{
"x-api-key":process.env.CLAUDE_API_KEY,
"anthropic-version":"2023-06-01",
"content-type":"application/json"
},
body:JSON.stringify(req.body)
})

const j=await r.json()

res.json(j)

}catch(e){

res.status(500).json({error:e.toString()})

}

}
