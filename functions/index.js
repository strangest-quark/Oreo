const functions = require('firebase-functions');
var bodyParser = require('body-parser');
var request = require('request');
var express = require('express');
var app = express();
var utf8 = require('utf8');
var msg="";


app.use(bodyParser.urlencoded({extended: false}));

// Process application/json
app.use(bodyParser.json());

let FACEBOOK_APP_PASSWORD = 'saviouroreo';
let FACEBOOK_PAGE_ACCESS_TOKEN = 'EAAagVKJByR0BANneBzk8JT46aRZAdOYWZASWqmFFPhZBk0Q6mNRwZBzIVLiy50EJHt2wPrENy7OioWJkG36rr8AXQ6OrP0dml7ZCfZBZC6iyteK2F6zrepOl5UmDz7TNAZATSnkX3PdbHzePwGPW9gemNH6MnIBdZCfaUhnj42zoM6EpWunWP2Ucm';

//your routes here
app.get('/', function (req, res) {
  res.send("Wassup Saviour!");
});

// for Facebook verification
app.get('/webhook/', function (req, res) {
  console.log(req.query['hub.verify_token']);
  if (req.query['hub.verify_token'] === FACEBOOK_APP_PASSWORD) {
      res.send(req.query['hub.challenge'])
  }
  res.send('Error, wrong token')
});


app.post('/webhook/', function(req, res) {
    //1
    if (req.body.object === 'page') {
      //2
      if (req.body.entry) {
        //3
        req.body.entry.forEach(function(entry) {
          //4
          if (entry.messaging) {
            //5
            entry.messaging.forEach(function(messagingObject) {
                //6
                var senderId = messagingObject.sender.id;
                //7
                if (messagingObject.message) {
                  //8
                  if (!messagingObject.message.is_echo) {
                    //9
                    var textMessage = messagingObject.message.text;
                    //10
                    showTypingIndicatorToUser(senderId, true);
                    queryDB(senderId, textMessage);
                  }
                }
            });
          } else {
            console.log('Error: No messaging key found');
          }
        });
      } else {
        console.log('Error: No entry key found');
      }
    } else {
      console.log('Error: Not a page object');
    }
    res.sendStatus(200);
  });

  function queryDB(senderID, inMessage){
    var arr = inMessage.split(" ");
    console.log(arr);
    console.log('inside queryDB');
    // At first, use an array, so you can put back the asynchronous results in the correct order
    var msgArray = [];
    // Keep track of the number of asynchronous results you are still waiting for
    var leftOver = arr.length;
    // Use LET to make loop variable block scoped: that way you'll have the same value for
    //   it when the asynchronous callback is called
    for(let i=0; i < arr.length; i++) {
        var x = 'https://oreo-fd681.firebaseio.com/'+(arr[i].toLowerCase())+'.json';
        request({
            url: x,
            method: 'GET'
        }, function(error, response, body) {
            console.log(response.body);
            if (error) {
                console.log('Error making api call ' + error);
            } else if (response.body.error){
                console.log('Error making api call' + response.body.error);
            }
            else {
                // Treat the two cases with the ternary operator
                //  and put the result at the correct index
                if(response.body=='null'){
                  console.log("inside null");
                  msgArray[i]=arr[i];
                }
                else{
                  msgArray[i]=(JSON.parse(response.body)).key;
                }
                console.log(msgArray);
                // Detect when you have collected all results
                leftOver--;
                if (!leftOver) {
                    // Join all the words together into one string and send it
                    sendMessageToUser(senderID, msgArray.join(' '));  
                }
            }
        });
    }
}

function sendMessageToUser(senderId, message) {
    request({
      url: 'https://graph.facebook.com/v2.6/me/messages?access_token=' + FACEBOOK_PAGE_ACCESS_TOKEN,
      method: 'POST',
      json: {
        recipient: {
          id: senderId
        },
        message: {
          text: message
        }
      }
    }, function(error, response, body) {
          if (error) {
            console.log('Error sending message to user: ' + error);
          } else if (response.body.error){
            console.log('Error sending message to user: ' + response.body.error);
          }
    });
    showTypingIndicatorToUser(senderId, false);
  }

  function showTypingIndicatorToUser(senderId, isTyping) {
    var senderAction = isTyping ? 'typing_on' : 'typing_off';
    request({
      url: 'https://graph.facebook.com/v2.6/me/messages?access_token=' + FACEBOOK_PAGE_ACCESS_TOKEN,
      method: 'POST',
      json: {
        recipient: {
          id: senderId
        },
        sender_action: senderAction
      }
    }, function(error, response, body) {
      if (error) {
        console.log('Error sending typing indicator to user: ' + error);
      } else if (response.body.error){
        console.log('Error sending typing indicator to user: ' + response.body.error);
      }
    });
  }

exports.app = functions.https.onRequest(app);
