require('dotenv').config();
const axios = require("axios");
const cheerio = require("cheerio");
const crypto = require('crypto');
const fs = require('fs')
const TelegramBot = require('node-telegram-bot-api');

// init telegram
const token = process.env.TOKEN;
const bot = new TelegramBot(token, { polling: true });
let GroupID = process.env.GROUPID;
let sites = ["https://www.esgct.eu/News-and-Events/News.aspx", "https://www.esgct.eu/Networking-and-community/Latest-news.aspx"]


/*    TELEGRAM     */

// setup telegram
bot.on("polling_error", console.log);

// start message (setup)
bot.onText(/\/start/, (msg, match) => {
    setup();
})

async function setup() {
    // create object with hash (empty)
    let obj = { hash: [] }
    for (let i = 0; i < sites.length; i++) {
        let tmphash = await scrapeData(sites[i]);
        obj.hash.push(tmphash);
    }
    // write in database
    writeData(obj);

    /* 
        To find your chat id decomment the following lines and send /start
    */
    // GroupID = msg.chat.id;
    // bot.sendMessage(GroupID, "Il tuo id è: "+GroupID);
    bot.sendMessage(GroupID, "Bot initializated");
}

function scrivi(string){
    bot.sendMessage(GroupID, string);
}


/*------------------------------------------------------------------*/

/*    SCRAPING     */

// scraping function
async function scrapeData(url) {
    try {
        // retrive html data from the sites
        let { data } = await axios.get(url);
        const $ = cheerio.load(data)
        let lista = "";
        // find the element called "menu" and add each element in a list to compute the hash
        $('.menu').find('li').each((i, elem) => {
            try {
                // add the element that you want to check
                // in this case the title, the description and the link
                // but you can add more 
                lista += $(elem).find('h4').text();
                lista += $(elem).find('p').text();
                lista += $(elem).find('a').attr('href');
            }
            catch (err) {
                console.log(err);
            }

        });

        // create hash for store in an easy way the data (less space than all the html)
        let hash = crypto.createHash('sha256').update(lista).digest('hex');
        return hash;

    } catch (err) {
        console.log(err)
        return -1;
    }
}

/*------------------------------------------------------------------*/

/*    DATABASE HASH     */

function readData() {
    const data = fs.readFileSync('db.json', 'utf8');
    return JSON.parse(data);
}

function writeData(obj) {
    if (!obj) {
        return;
    }
    try {
        fs.writeFileSync('db.json', JSON.stringify(obj));
        console.log("overwrite")
    }
    catch (err) {
        console.log("errore", err);
    }
}


/*------------------------------------------------------------------*/

/*    EXECUTION     */

// this funcion check every x seconds if there are updates
setInterval(async ()=>{
    if(!fs.existsSync("db.json")){
        writeData({hash:[]});
    }
    let obj;
    try {
        obj = readData();
    } catch (err) {
        writeData({hash:[]});
        obj = readData();
    }
    const hash_db = obj.hash;
    let someUpdate = false;

    for(let i in sites){
        let hash = await scrapeData(sites[i]);
        if(hash != hash_db[i]){
            obj.hash[i]=hash;
            scrivi("update "+sites[i]);
            someUpdate = true;
        }
    }
    // only if there are updates write in the database
    if (someUpdate){
        writeData(obj)
    }
},5_000);