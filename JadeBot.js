 //retrieves all the libraries and files we need
var Discord = require("discord.js");
var smitePlugin = require("./auth.json");
var request = require(`request`);
var md5 = require(`md5`);
var moment = require(`moment`);

//generates the timestamp of when the program executes
var timestamp = calcTime(0);

//gets and formats the timestamp
function calcTime(offset) {
  var d = new Date();
  var utc = d.getTime() + (d.getTimezoneOffset() * 60000);
  var nd = new Date(utc + (3600000*offset));

  var year = nd.getFullYear();
  //the getMonth() function returns the months as a number from 0-11, so we add 1
  //this section isn't my code, but there was an issue with it i had to fix
  var month = (nd.getMonth() < 9) ? '0' + (nd.getMonth() + 1) : ("" + (nd.getMonth() + 1));
  var day =  (nd.getDate() < 10) ? "0" + nd.getDate() : nd.getDate();
  var hours = (nd.getHours() < 10) ? "0" + nd.getHours() : nd.getHours();
  var minutes = (nd.getMinutes() < 10) ? "0" + nd.getMinutes() : nd.getMinutes();
  var seconds = (nd.getSeconds() < 10) ? "0"  + nd.getSeconds() : nd.getSeconds();
  var timeResult = (year + month + day + hours + minutes + seconds);

  return timeResult;
}
//retrieves the authentication key and developer id from the authentication file
//you can simply replace these with the de keys
var auth_key = smitePlugin.smite_auth_key;
var dev_id = smitePlugin.smite_dev_id;

var url = `http://api.smitegame.com/smiteapi.svc`;
//declares variables
var sessionID;
var responseFormat = 'Json';

var signature;
var sessionUrl;

var getPlayerStats;
var getGodStats;
var getMatchHistory;
var getMatchDetails;
var getGods;
var getPlayerStatus;
var getMotd;

//creates the initial session
establishSession();
//creates a new session every 14 minutes and 30 seconds
setInterval(establishSession, 870000);
//creates a new session
function establishSession(){

    timestamp = calcTime(0);
    signature = md5(dev_id + "createsession" + auth_key + timestamp);
    sessionUrl = `http://api.smitegame.com/smiteapi.svc/createsessionJson/${dev_id}/${signature}/${timestamp}`;
    //calls the sessionUrl and retrieves the response, body, and errors
    request(sessionUrl, function(error, response, body) {
     if (!error && response.statusCode == 200) {
      //if there is no error, parse the json to jsonReturned and set sessionID to the jsonReturned session_id element, then log the new session information
      var jsonReturned = JSON.parse(body);
      sessionID = jsonReturned.session_id;
      console.log(`New session created: \nSession ID: ${sessionID}\nTimestamp: ${timestamp}`);

    }
  });
}
//generic function to make an api call using the request library
function makeCall(method, para1){
  //generates a new call signature and call url depending on the method and paramaters
  timestamp = calcTime(0);
  var callSig = md5(dev_id + method + auth_key + timestamp);
  var callURL = (para1 !== undefined) ? `${url}/${method}${responseFormat}/${dev_id}/${callSig}/${sessionID}/${timestamp}/${para1}` : `${url}/${method}${responseFormat}/${dev_id}/${callSig}/${sessionID}/${timestamp}`;
  console.log(callURL);
  //sends the new request
  request(callURL, function(error, response, body) {
   if (!error && response.statusCode == 200)
    {
     //sets the appropriate variable to the returned body depending on what the method was
     getPlayerStats = (method === 'getplayer') ? JSON.parse(body) : getPlayerStats;
     getGodStats = (method === 'getgodranks') ? JSON.parse(body) : getGodStats;
     getMatchHistory = (method === 'getmatchhistory') ? JSON.parse(body) : getMatchHistory;
     getMatchDetails = (method === 'getmatchdetails') ? JSON.parse(body) : getMatchDetails;
     getGods = (method === 'getgods') ? JSON.parse(body) : getGods;
     getPlayerStatus = (method === 'getplayerstatus') ? JSON.parse(body) : getPlayerStatus;
     getMotd = (method === 'getmotd') ? JSON.parse(body) : getMotd;
}
//if there is an error, log the status code and error
    else
      {
      console.log(response.statusCode);
      console.log(error);
      }
  });
}
//converts tier number to tier rank Ex: 14 to Gold 2
function tierToRank(number)
  {
    let tier;
    tier = (number < 1) ? 'Unranked' : tier;
    tier = (number >= 1 && number <= 5) ? 'Bronze ' + (6 - number) : tier;
    tier = (number >= 6 && number <= 10) ? 'Silver ' + (11 - number) : tier;
    tier = (number >= 11 && number <= 15) ? 'Gold ' + (16 - number) : tier;
    tier = (number >= 16 && number <= 20) ? 'Platinum ' + (21 - number) : tier;
    tier = (number >= 21 && number <= 25) ? 'Diamond ' + (26 - number) : tier;
    tier = (number > 25) ? 'Masters ' + (27 - number) : tier;
    return tier;
  }
//declares bot as a discord client
var bot = new Discord.Client();
//declares the prefix
var prefix = "!";
//triggers a function on a new message
bot.on("message", function(msg)
{
  //ignores any message not starting with the prefix or that another bot posted
	if(!msg.content.startsWith(prefix)) return;
	if(msg.author.bot) return;
  //triggers the following if a message starts with the prefix and smite
	if(msg.content.startsWith(prefix + "smite"))
	{
    //splits the message into an array of all the strings in between a space
		let args = msg.content.split(" ").slice(1);
    //if the first word is profile
    if(args[0].toLowerCase() === "profile"){
    //call the following functions with the Player name as the argument
    makeCall('getplayer', args[1]);
    makeCall('getgodranks', args[1]);
    makeCall('getplayerstatus', args[1]);
    //after two seconds, execcute the following
    setTimeout(function(){

      //if proper values are returned
      if(getPlayerStats !== undefined && getPlayerStats[0] !== undefined && getGodStats !== undefined && getGodStats[0] !== undefined){

      let result =
      `\n${getPlayerStats[0].Name}
      \n*${getPlayerStats[0].Personal_Status_Message}*
      Status: ${getPlayerStatus[0].status_string}
      Account Level: ${getPlayerStats[0].Level}
      Mastery Level: ${getPlayerStats[0].MasteryLevel}
      Wins: ${getPlayerStats[0].Wins}
      Losses: ${getPlayerStats[0].Losses}
      Leaves: ${getPlayerStats[0].Leaves}
      \nMost Played God: ${getGodStats[0].god}, Rank ${getGodStats[0].Rank} at ${getGodStats[0].Worshippers} Worhshippers
      \n__Ranked Joust:__
        Tier: ${tierToRank(getPlayerStats[0].RankedJoust.Tier)}
        Points: ${getPlayerStats[0].RankedJoust.Points}
        Wins: ${getPlayerStats[0].RankedJoust.Wins}
        Losses: ${getPlayerStats[0].RankedJoust.Losses}
      \n__Ranked Conquest:__
        Tier: ${tierToRank(getPlayerStats[0].RankedConquest.Tier)}
        Points: ${getPlayerStats[0].RankedConquest.Points}
        Wins: ${getPlayerStats[0].RankedConquest.Wins}
        Losses: ${getPlayerStats[0].RankedConquest.Losses}
      \n__Ranked Duel:__
        Tier: ${tierToRank(getPlayerStats[0].RankedDuel.Tier)}
        Points: ${getPlayerStats[0].RankedDuel.Points}
        Wins: ${getPlayerStats[0].RankedDuel.Wins}
        Losses: ${getPlayerStats[0].RankedDuel.Losses}`;
        console.log(result);
        msg.channel.sendMessage(result);
      }
      //if invalid data is returned
      else{
        let result = 'Unable to process your request';
        console.log(result);
        msg.channel.sendMessage(result);
      }
    }, 2000);
}
  if(args[0].toLowerCase() === "godstats"){
        makeCall('getgodranks', args[1]);
        var godName;
        //sets godName to be a single string consisting of 1, 2, or 3 words depending on the god name called
        godName = `${args[2]}`;
        godName = (args[3] !== undefined) ? `${args[2]} ${args[3]}` : godName;
        godName = (args[4] !== undefined) ? `${args[2]} ${args[3]} ${args[4]}` : godName;

        setTimeout(function(){
          //search the getGodStats array until it finds the index with the same name as godName
          var j = 0;
          while(j < getGodStats.length && getGodStats[j].god !== godName){
            j++;
          }
          if(getGodStats[j] !== undefined)
          {
          let result = `__${args[1]}'s ${getGodStats[j].god}__\nRank: ${getGodStats[j].Rank}\nWorshippers: ${getGodStats[j].Worshippers}\nWins: ${getGodStats[j].Wins} Losses: ${getGodStats[j].Losses}\nKills: ${getGodStats[j].Kills} Deaths: ${getGodStats[j].Deaths} Assists: ${getGodStats[j].Assists}`;
          console.log(result);
          msg.channel.sendMessage(result);
        }
        else{
          let result = 'Unable to process your request';
          console.log(result);
          msg.channel.sendMessage(result);
        }
        }, 2000);
  }
  if(args[0].toLowerCase() === 'match'){
    args[2] = (args[2] === undefined) ? 0 : args[2];
    makeCall('getmatchhistory', args[1]);
      setTimeout(function(){
        if(getMatchHistory[args[2]] !== undefined)
        {
    makeCall('getmatchdetails', getMatchHistory[args[2]].Match);


    setTimeout(function(){
      if(getMatchDetails !== undefined){
    var matchPlayer = []
    for (i = 0; i < getMatchDetails.length; i++){
      let winStatus = (getMatchDetails[i].Win_Status === 'Winner') ? '**' : '~~';
      console.log(winStatus);
      matchPlayer[i] =
      `\n\n${winStatus}${getMatchDetails[i].Final_Match_Level}${winStatus} __${getMatchDetails[i].Reference_Name}__         ${getMatchDetails[i].playerName}\nKills: ${getMatchDetails[i].Kills_Player} Deaths: ${getMatchDetails[i].Deaths} Assists: ${getMatchDetails[i].Assists}`
    }
    let result =
    `\nMatch ID: ${getMatchHistory[args[2]].Match} ${getMatchDetails[0].name}\n${getMatchDetails[0].Entry_Datetime}        Length: ${getMatchDetails[0].Minutes} Minutes
    ${matchPlayer}
    \nhttp://smite.guru/match/hr/${getMatchHistory[args[2]].Match}`;

    console.log(result);
    msg.channel.sendMessage(result);
}
else {
  let result = 'Unable to process your request';
  console.log(result);
  msg.channel.sendMessage(result);
}
}, 1000);
}
}, 1000);
  }

  if(args[0].toLowerCase() === 'randomgod'){
    makeCall('getgods', 1);
    setTimeout(function(){
      if(getGods !== undefined){
      //console.log(getGods);
      let godNumber = Math.floor(Math.random() * getGods.length);
      let result = getGods[godNumber].Name;
      console.log(result);
      msg.channel.sendMessage(result);
      }
      else {
        let result = 'Unable to process your request';
        console.log(result);
        msg.channel.sendMessage(result);
      }


    }, 2000);

  }
  if(args[0].toLowerCase() === 'help'){
    let result =
    `__!smite profile [Player Name]__\n*Fetch a player's SMITE profile*
    \n__!smite godstats [Player Name] [God]__\n*Fetch statistics for a player's god*
    \n__!smite match [Player Name] (Number of Match)__\n*Fetch basic information on the player's most recent match*
    \n__!smite randomgod__\n*Picks a random god*
    \n__!smite motd (Number)__\n*Returns the name, start date, and description for the specified motd*`

    console.log(result);
    msg.channel.sendMessage(result);
  }
  if(args[0].toLowerCase() === 'motd'){
    makeCall('getmotd')
    args[1] = (args[1] === undefined) ? 0 : args[1];
    setTimeout(function(){
      if(getMotd !== undefined){
      let result =
      `${getMotd[args[1]].startDateTime}
      \n${getMotd[args[1]].name}
      \n${getMotd[args[1]].description}`;
      console.log(result);
      msg.channel.sendMessage(result);
    }
    else{
      let result = 'Unable to process your request';
      console.log(result);
      msg.channel.sendMessage(result);
    }
    }, 2000);
}
}
});


bot.login(bot string goes here);
