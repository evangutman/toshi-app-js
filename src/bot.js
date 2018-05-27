const Bot = require('./lib/Bot')
const SOFA = require('sofa-js')
const Fiat = require('./lib/Fiat')

//********** Added Dependencies **********
const https = require('https')
const fs = require('fs')


let bot = new Bot()

// ROUTING

bot.onEvent = function(session, message) {
  switch (message.type) {
    case 'Init':
      let start_folio = []
      session.set('blockfolio', JSON.stringify(start_folio));
      welcome(session)
      break
    case 'Message':
      onMessage(session, message)
      break
    case 'Command':
      onCommand(session, message)
      break
    case 'Payment':
      onPayment(session, message)
      break
    case 'PaymentRequest':
      welcome(session)
      break
  }
}

function onMessage(session, message) {
  var resp = "";
  var temp_message = message['body'].toUpperCase();
  console.log(temp_message);
  var cur_message = temp_message.split(" ");

  if(cur_message[0] == "ADD" && cur_message.length == 3) {

    let holdings = cur_message[2] + " >>";
    var block = {'coin': cur_message[1], 'holdings': holdings, 'price': ''};
    setPrice(session, cur_message[1], block);

    var resp = cur_message[1] + " was added to your Blockfolio!"
    sendMessage(session, resp);

  } else if (cur_message[0] == "DELETE" && cur_message.length == 2) {

    var folio = JSON.parse(session.get('blockfolio'));
    for(var i = 0; i < folio.length; i++){
      if(folio[i]['coin'] == cur_message[1]){
        folio.splice(i, 1);
        break;
      }
    }

    var temp_folio = JSON.stringify(folio);
    session.set('blockfolio', temp_folio);

    resp = cur_message[1] + " was deleted from your Blockfolio!"
    sendMessage(session, resp);

  } else if (cur_message[0] == "EDIT" && cur_message.length == 3) {

    var folio = JSON.parse(session.get('blockfolio'));

    for(var i = 0; i < folio.length; i++){
      if(folio[i]['coin'] == cur_message[1]){
        var holdings = folio[i]['holdings'].split(" ");
        holdings[0] = cur_message[2];
        var price = parseFloat(folio[i]['price']);
        var quant = parseFloat(holdings[0]);
        var value = quant * price;
        holdings[2] = value.toFixed(2);

        folio[i]['holdings'] = holdings.join(" ");
        break;
      }
    }

    var temp_folio = JSON.stringify(folio);
    session.set('blockfolio', temp_folio);

    resp = "An edit was made to " + cur_message[1] + " in your Blockfolio!"
    sendMessage(session, resp);

  } else if (cur_message[0] == "PRICE" && cur_message.length == 2) {

    printPrice(session, cur_message[1]);

  } else {
    resp = "Please enter a valid comand or hit \'Edit\' to see a list of possible commands :)"
    sendMessage(session, resp);
  }

}

function onCommand(session, command) {
  switch (command.content.value) {
    case 'blockfolio':
      blockfolio(session)
      break
    case 'edit':
      edit(session)
      break
    case 'donate':
      donate(session)
      break
    }
}

function onPayment(session, message) {
  if (message.fromAddress == session.config.paymentAddress) {
    // handle payments sent by the bot
    if (message.status == 'confirmed') {
      // perform special action once the payment has been confirmed
      // on the network
    } else if (message.status == 'error') {
      // oops, something went wrong with a payment we tried to send!
    }
  } else {
    // handle payments sent to the bot
    if (message.status == 'unconfirmed') {
      // payment has been sent to the ethereum network, but is not yet confirmed
      sendMessage(session, `Thanks for the payment! 🙏`);
    } else if (message.status == 'confirmed') {
      // handle when the payment is actually confirmed!
    } else if (message.status == 'error') {
      sendMessage(session, `There was an error with your payment!🚫`);
    }
  }
}

// STATES

function welcome(session) {
  sendMessage(session, `Hello there! Welcome to your personal Blockfolio!`)
}

function pong(session) {
  sendMessage(session, `Pong\nMy Name is Evan!`)
}

// example of how to store state on each user
function count(session) {
  let count = (session.get('count') || 0) + 1
  session.set('count', count)
  sendMessage(session, `${count}`)
}

function edit_message(session, format_data) {

    var message = "SYMBOL\t\t\tNAME\n"


    for(var key in format_data){
      let temp = key + "\t\t\t" + format_data[key] + "\n";
      message += temp;
    }

    message += "\nPlease enter one of the following commands to alter your Blockfolio:\n\nadd <SYMBOL> <(%)quantity>\ndelete <SYMBOL>\nedit <SYMBOL> <(%)quantity>\nprice <SYMBOL>"

    console.log(message);

    session.set('edit_message', message)
    sendMessage(session, message);

}

function edit(session) {

            /*  if (session.get('edit_message') != undefined) {
                var edit_message = session.get('edit_message');
                sendMessage(session, edit_message);

              } else { */

                var options = {
                  "method": "GET",
                  "hostname": "rest.coinapi.io",
                  "path": "/v1/assets",
                  "headers": {'X-CoinAPI-Key': '6F899D1B-AF69-4BAB-AF4B-C30D0BF0D7F6'}
                };

                var request = https.request(options, function(response){
                        var raw_data = '';
                        var format_data = {};

                        response.on("data", function(chunk){
                                raw_data += chunk;
                        });

                        response.on("end", function() {

                                var obj = JSON.parse(raw_data);
                                for(var i = 0; i < obj.length; i++){
                                        //var temp = obj[i]["asset_id"] + "," + obj[i]["name"];
                                        format_data[obj[i]["asset_id"]] = obj[i]["name"];
                                }
                                console.log(format_data);

                                edit_message(session, format_data);


                        });

                });

                request.end();

}


function blockfolio(session) {
  var folio = JSON.parse(session.get('blockfolio'));
  var message = 'COIN\tHOLDINGS\tPRICE($)\n';

  if (folio.length == 0) {

    sendMessage(session, "You're Blockfolio is empty! Add a cryptocurrency to your Blockfolio!");

  } else {

    //meant to update prices every 5 minutes
    /*var cur_time = new Date().getTime();
    if(session.get('access_time') == undefined || (cur_time - session.get('access_time')) > 300) {
      //update prices
      session.set('access_time', cur_time)
    } */

      for(var i = 0; i < folio.length; i++){
        var temp_block = folio[i]['coin'] + "\t" + folio[i]['holdings'] + "\t" + folio[i]['price'] + "\n";
        message += temp_block;
      }

      sendMessage(session, message);

  }
}


function setPrice(session, coin, block){
  console.log(coin);
  var path = "/v1/exchangerate/" + coin + "/USD"
  var options = {
    "method": "GET",
    "hostname": "rest.coinapi.io",
    "path": path,
    "headers": {'X-CoinAPI-Key': '6F899D1B-AF69-4BAB-AF4B-C30D0BF0D7F6'}
  };

  var request = https.request(options, function(response){
          var price = '';

          response.on("data", function(raw_data){
                  price += raw_data;
          });

          response.on("end", function() {
            //set price inside of the object
            var folio = JSON.parse(session.get('blockfolio'));
            var holdings = block['holdings'].split(" ");

            var data = JSON.parse(price);
            var round_price = parseFloat(data['rate']).toFixed(2);
            var quant = parseFloat(holdings[0])
            var value = quant * round_price;
            console.log(value);


            holdings.push(value.toFixed(2));
            block['holdings'] = holdings.join(" ");
            block['price'] = round_price;
            console.log(block);
            //add to session data
            var folio = JSON.parse(session.get('blockfolio'));
            folio.push(block);
            var temp_folio = JSON.stringify(folio);
            session.set('blockfolio', temp_folio);
          });

      });

      request.end();
}

function printPrice(session, coin){
  var path = "/v1/exchangerate/" + coin + "/USD";
  var options = {
    "method": "GET",
    "hostname": "rest.coinapi.io",
    "path": path,
    "headers": {'X-CoinAPI-Key': '6F899D1B-AF69-4BAB-AF4B-C30D0BF0D7F6'}
  };

  var request = https.request(options, function(response){
    var price = '';

    response.on("data", function(raw_data) {
            price += raw_data;
    });

    response.on("end", function() {

      var data = JSON.parse(price);
      var round_price = parseFloat(data['rate']).toFixed(2);
      var resp = "The price of " + coin +  " is " + round_price;
      sendMessage(session, resp);
    });

  });

  request.end();
}


function donate(session) {
  // request $1 USD at current exchange rates
  Fiat.fetch().then((toEth) => {
    session.requestEth(toEth.USD(1))
  })
}

// HELPERS

function sendMessage(session, message) {
  let controls = [
    {type: 'button', label: 'Blockfolio', value: 'blockfolio'},
    {type: 'button', label: 'Edit', value: 'edit'},
    {type: 'button', label: 'Donate', value: 'donate'}
  ]
  session.reply(SOFA.Message({
    body: message,
    controls: controls,
    showKeyboard: false,
  }))
}
