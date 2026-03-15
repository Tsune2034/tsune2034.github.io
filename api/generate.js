export default async function handler(req, res) {

const prompt = req.body.prompt;

const response = await fetch(
"https://api.openai.com/v1/images/generations",
{
method:"POST",
headers:{
"Content-Type":"application/json",
"Authorization":`Bearer ${process.env.OPENAI_API_KEY}`
},
body:JSON.stringify({
model:"gpt-image-1",
prompt:prompt,
size:"512x512"
})
});

const data = await response.json();

res.status(200).json(data);

}
