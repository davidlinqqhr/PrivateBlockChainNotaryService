const axios = require('axios');
const bitcoin = require('bitcoinjs-lib');
const bitcoinMessage = require('bitcoinjs-message');

var uri = 'http://localhost:8000/'

var keyPair = bitcoin.ECPair.makeRandom();
var addr = keyPair.getAddress();
var privateKey = keyPair.d.toBuffer();

async function allowRequest(){
    try{
        //uncomment the code below to have the address change for each iteration
        // keyPair = bitcoin.ECPair.makeRandom();
        // privateKey = keyPair.d.toBuffer();
        // addr = keyPair.getAddress();  
        
        response = await axios.post(uri, {address: addr});
        console.log(response.data);
        return verifyMsg(response.data.message);
    }catch(error){
        console.log(error);
    }
}

async function verifyMsg(message){
    try{
        var sig = bitcoinMessage.sign(message, privateKey, keyPair.compressed).toString('base64'); 
        console.log('sig:' + sig);
        response = await axios.post(uri + 'message-signature/validate', {
            address: addr,
            signature: sig
        });
        console.log(response.data);
        if(response.status == 200){
            requestValidation();
        }
    }catch(error){
        console.log(error);
    }
}

async function requestValidation(){
    try{
        response = await axios.post(uri + 'requestValidation', {address: addr});
        console.log(response.data);
        if(response.status == 200){
            register();
        }
    }catch(err){
        console.log(err);
    }
}

async function register(){
    try{
        response = await axios.post(uri + 'block', {
            address: addr,
            star: {
              dec: "-26° 29' 24.9",
              ra: "16h 29m 1.0s",
              story: "Found star using https://www.google.com/sky/"
            }
        });
        console.log(response.data);

        if(response.status == 200){
            console.log('decoded story:' + Buffer.from(response.data.body.star.story, 'hex').toString('ascii'));
            console.log('hash:' + response.data.hash);
            queryByHeight(response.data);
        }
    }catch(err){
        console.log(err);
    }
}

async function queryByHeight(block){
    try{
        response = await axios.get(uri + 'block/' + block.height);
        console.log(response.data);
        if(response.status == 200){
            queryByAddress(block);
        }
    }catch(err){
        console.log(err);
    }
}

async function queryByAddress(block){
    try{
        response = await axios.get(uri + 'stars/address:' + block.body.address);
        console.log(response.data);
        if(response.status == 200){
            queryByHash(block);
        }
    }catch(err){
        console.log(err);
    }
}

async function queryByHash(block){
    try{
        response = await axios.get(uri + 'stars/hash:'+ block.hash);
        console.log(response.data);
        if(response.status == 200){
            if(++i <= 10){
                console.log('iteration:' + i + '.....\n\n\n');
                allowRequest();
            }
        }
    }catch(err){
        console.log(err);
    }
}

var i = 0;
allowRequest();




