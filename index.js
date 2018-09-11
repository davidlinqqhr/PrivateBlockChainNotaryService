const Hapi = require('hapi')
const sc = require('./simpleChain')
const bitcoin = require('bitcoinjs-lib');
const bitcoinMessage = require('bitcoinjs-message');
const server = Hapi.server({
    port: 8000,
    host: 'localhost'
});
var RequestStatus= {
    Unrequested : 0,
    Requested : 1,
    Verified: 2,
    Validated: 3
}
class RequestInfo{
    constructor(address){
        this.address = address;
        this.message = '';
        this.requestTimeStamp = this.getCurrentTime();
        this.validationWindow = 300;
        this.requestStatus = RequestStatus.Unrequested;
    }
    allowRequest(){
        this.validationWindow -= (Number(this.getCurrentTime()) - Number(this.requestTimeStamp));
        if(this.validationWindow <= 0){
            return false;
        }else{
            this.message = this.address + ':' + this.requestTimeStamp + ':starRegistry';
            this.requestStatus = RequestStatus.Requested;
            return true;
        }
    }
    getInfoSlim(){
        return {
            address: this.address,
            requestTimeStamp: this.requestTimeStamp,
            message: this.message,
            validationWindow: this.validationWindow
        };
    }
    getValidationResponse(signature){
        if(this.requestStatus === RequestStatus.Requested){
            var res = bitcoinMessage.verify(this.message, this.address, signature);
            this.validationWindow -= (Number(this.getCurrentTime()) - Number(this.requestTimeStamp));
            if(this.validationWindow > 0){
                this.requestStatus = res ? RequestStatus.Verified : this.requestStatus;
                return {
                    registerStar: res,
                    status: {
                        address: this.address,
                        requestTimeStamp: this.requestTimeStamp,
                        message: this.message,
                        validationWindow: this.validationWindow,
                        messageSignature: 'valid',
                    }
                };
            }else{
                return undefined;
            }
        }else{
            return undefined;
        }
    }
    getReqValResp(){
        if(this.requestStatus === RequestStatus.Verified){
            this.validationWindow -= (Number(this.getCurrentTime()) - Number(this.requestTimeStamp));
            if(this.validationWindow <= 0){
                return undefined;
            }else{
                this.requestStatus = RequestStatus.Validated;
                return {
                    address: this.address,
                    requestTimeStamp: this.requestTimeStamp,
                    message: this.message,
                    validationWindow: this.validationWindow
                };
            }
        }else{
            return undefined;
        }
    }
    getCurrentTime(){
        return new Date().getTime().toString().slice(0,-3);
    }
    validated(){
        return this.requestStatus === RequestStatus.Validated;
    }
}

requestInfoDict = {};
requestInfo = new RequestInfo();

server.route({
    method: 'GET',
    path: '/block/{HEIGHT}',
    handler: async (request, h) => {
        bc = new sc.BlockChain();
        await bc.init();
        return h.response(await bc.getBlock(request.params.HEIGHT)).header('Content-Type', 'application/json').code(200);
    }
})

server.route({
    method: 'GET',
    path: '/stars/address:{address}',
    handler: async (request, h) => {
        console.log(request.params.address);
        bc = new sc.BlockChain();
        await bc.init();
        arryStr = await bc.getHeightsByAddress(request.params.address);
        heights = arryStr.split(',');
        var blocks = [];
        for(i = 0; i < heights.length; i++){
            blocks.push(JSON.parse(await bc.getBlock(Number(heights[i]))));
        }
        return h.response(blocks).header('Content-Type', 'application/json').code(200);
    }
})

server.route({
    method: 'GET',
    path: '/stars/hash:{HASH}',
    handler: async (request, h) => {
        console.log(request.params.HASH);
        bc = new sc.BlockChain();
        await bc.init();
        blockHeight = await bc.getHeightByHash(request.params.HASH);
        return h.response(await bc.getBlock(blockHeight)).header('Content-Type', 'application/json').code(200);
    }
})
server.route({
    method: 'POST',
    path: '/',
    handler: (request, h) => {
        try{
            addr = request.payload.address;
            if(!requestInfoDict[addr]){
                requestInfoDict[addr] = new RequestInfo(addr);
            }
            if(requestInfoDict[addr].allowRequest()){
                return h.response(requestInfoDict[addr].getInfoSlim()).header('Content-Type', 'application/json').code(200);
            }else{
                delete requestInfoDict[addr];
                return h.response('validation window time out!').code(500);
            }
        }catch(err){
            return h.response(err).code(500);
        }
    }
});

server.route({
    method: 'POST',
    path: '/message-signature/validate',
    handler: (request, h) => {
        try{
            addr = request.payload.address;
            if(requestInfoDict[addr]){
                resp = requestInfoDict[addr].getValidationResponse(request.payload.signature);
                if(!resp){
                    delete requestInfoDict[addr];
                    return h.response('validation window time out!').code(500);
                }else if(resp.registerStar){
                    return h.response(resp).header('Content-Type', 'application/json').code(200);
                }else{
                    return h.response('signature validation failed').code(500);
                }
            }else{
                return h.response('address not found in lookup table').code(500);
            }
        }catch(err){
            return h.response(err).code(500);
        }
    }
});
server.route({
    method: 'POST',
    path: '/requestValidation',
    handler: (request, h) => {
        try{
            addr = request.payload.address;
            if(requestInfoDict[addr]){
                resp = requestInfoDict[addr].getReqValResp();
                if(!resp){
                    delete requestInfoDict[addr];
                    return h.response('Request Validation failed!').code(500);
                }else{
                    return h.response(resp).header('Content-Type', 'application/json').code(200);
                }
            }else{
                return h.response('address not found in lookup table').code(500);
            }
        }catch(err){
            return h.response(err).code(500);
        }
    }
})
server.route({
    method: 'POST',
    path: '/block',
    handler: async (request, h) => {
        addr = request.payload.address;
        if(requestInfoDict[addr]){
            if(requestInfoDict[addr].validated()){
                body = {
                    address: addr,
                    star: request.payload.star
                };
                if(body.star.story.length <= 250){
                    body.star.story = Buffer.from(body.star.story, 'ascii').toString('hex');
                    body.star.storyDecoded = Buffer.from(body.star.story, 'hex').toString('ascii');
                    bc = new sc.BlockChain(); 
                    await bc.init();
                    await bc.addBlock(new sc.Block(body));
                    blockJson = await bc.getBlock(bc.getBlockHeight());
                    block = JSON.parse(blockJson);
                    await bc.addHash(block.hash, block.height);
                    await bc.addAddress(block.body.address, block.height);
                    delete requestInfoDict[addr];
                    delete block.body.star.storyDecoded;
                    return h.response(block).header('Content-Type', 'application/json').code(200);
                }else{
                    return h.response('story length = ' + body.star.story.length + 'is over the limit of 250 chars').code(500);
                }
            }else{

            }
        }else{
            return h.response('address not found in lookup table').code(500);
        }
    }
})

const init = async () => {
    await server.register({
        plugin: require('hapi-pino'),
        options: {
            prettyPrint: false,
            logEvents: ['response']
        }
    })

    await server.start();
    console.log(`Server running at: ${server.info.uri}`);
};

process.on('unhandledRejection', (err) => {
    console.log(err);
    process.exit(1);
});

init();