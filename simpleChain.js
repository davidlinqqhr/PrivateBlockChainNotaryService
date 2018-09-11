/* ===== SHA256 with Crypto-js ===============================
|  Learn more: Crypto-js: https://github.com/brix/crypto-js  |
|  =========================================================*/

const SHA256 = require('crypto-js/sha256');
const level = require('level');
const chainDB = './chaindata';
const db = level(chainDB);

var blkCount = undefined;

/* ===== Block Class ==============================
|  Class with a constructor for block 			   |
|  ===============================================*/

class Block{
	constructor(data){
     this.hash = "",
     this.height = 0,
     this.body = data,
     this.time = 0,
     this.previousBlockHash = ""
    }
}

/* ===== Blockchain Class ==========================
|  Class with a constructor for new blockchain 		|
|  ================================================*/

class BlockChain{
  constructor(){}

  init(){
    if(blkCount == undefined){
      return this.getLevelDBData('BlockHeight')
      .then(height =>{
        blkCount = Number(height) + 1;
        return new Promise(function(resolve,reject){
          resolve();
        })
      })
      .catch(err=>{
        console.log("Initializing blockchain and adding Genesis Block...");
        blkCount = 0;
        return this.addFirstBlock();
      })
    }else{
      return this.addFirstBlock();
    } 
  }

  addLevelDBData(key,value){
    return db.put(key, value);
  }
  
  getLevelDBData(key){
    return db.get(key);
  }

  addFirstBlock(){
    if(this.getBlockHeight() < 0){
      return this.addBlock(new Block("First block in the chain - Genesis block"));
    }else{
      return new Promise(function(resolve, reject){
        resolve();
      })
    }
  }

  getBlockHeight(){
    return blkCount - 1;
  }

  getBlock(blockHeight){
    return this.getValue(blockHeight);
  }

  getHeightsByAddress(address){
    return this.getValue(address);
  }

  getHeightByHash(hash){
    return this.getValue(hash);
  }

  getValue(key){
    return this.getLevelDBData(key)
    .then(val =>{
      return new Promise((resolve, reject) =>{
        resolve(val);
      });
    })
    .catch(err=>{
      console.log(err);
    });
  }

  // Add new block
  addBlock(newBlock){
    // Block height
    newBlock.height = blkCount;
    // UTC timestamp
    newBlock.time = new Date().getTime().toString().slice(0,-3);
    // previous block hash
    if(blkCount > 0){
      return this.getLevelDBData(blkCount - 1).then(result =>{          
          newBlock.previousBlockHash = JSON.parse(result).hash;
          // Block hash with SHA256 using newBlock and converting to a string
          newBlock.hash = SHA256(JSON.stringify(newBlock)).toString();
          // Adding block object to chain
          return this.addLevelDBData(newBlock.height, JSON.stringify(newBlock));
        }).then(()=>{
          return this.addLevelDBData('BlockHeight', newBlock.height);
        }).then(()=>{
          blkCount++;
          return new Promise((resolve,reject)=>{
            resolve();
          })
        })
        .catch(err=>{
          console.log(err);
        });
    }else{
      // Block hash with SHA256 using newBlock and converting to a string
      newBlock.hash = SHA256(JSON.stringify(newBlock)).toString();
      // Adding block object to chain
      return this.addLevelDBData(newBlock.height, JSON.stringify(newBlock)).then(result =>{
        return this.addLevelDBData('BlockHeight', newBlock.height);
      }).then(()=>{
        blkCount++;
        return new Promise((resolve,reject)=>{
          resolve();
        })
      }).catch(err=>{
        console.log(err);
      });
    }
  }

  addHash(hash, height){
    return this.addLevelDBData(hash, height)
    .then(() => {
      return new Promise((resolve, reject) => {
        resolve();
      })
    })
    .catch(err =>{
      console.log(err);
    })
  }

  addAddress(address, height){
    return this.getHeightsByAddress(address)
    .then((heights)=>{
      if(heights){
        return heights + ',' + height;
      }else{
        return height;
      }
    })
    .then((heights)=>{
      return this.addLevelDBData(address, heights);
    })
    .then(()=>{
      return new Promise((resolve, reject)=>{
        resolve();
      })
    })
    .catch((err)=>{
      console.log(err);
    })
  }

  // validate block
  validateBlock(blockHeight){
    // get block object
    return this.getLevelDBData(blockHeight).then(data =>{
      let block = JSON.parse(data);
      // get block hash
      let blockHash = block.hash;
      // remove block hash to test block integrity
      block.hash = '';
      // generate block hash
      let validBlockHash = SHA256(JSON.stringify(block)).toString();
      // Compare
      if (blockHash===validBlockHash) {
        return [true, blockHeight];
      } else {
        console.log('Block #'+blockHeight+' invalid hash:\n'+blockHash+'<>'+validBlockHash);
        return [false, blockHeight];
      }
    });
  }

   // Validate blockchain
  validateChain(){
    let errorLog = [];
    for (var i = 0; i < blkCount; i++) {
      // validate block
      this.validateBlock(i).then(res =>{
        if(!res[0]){
          errorLog.push(res[1]);
        }
        if(res[1] < blkCount - 1){
          // compare blocks hash link
          var blockHash, previousHash;
          this.getLevelDBData(res[1])
          .then(blk =>{
            blockHash = JSON.parse(blk).hash;
            return this.getLevelDBData(res[1] + 1)
          })
          .then(nextBlk=>{
            previousHash = JSON.parse(nextBlk).previousBlockHash;
            if (blockHash!==previousHash) {
              errorLog.push(res[1]);
            }; 
          });
        }else{
          if (errorLog.length>0) {
            console.log('Block errors = ' + errorLog.length);
            console.log('Blocks: '+errorLog);
          } else {
            console.log('No errors detected');
          }
        }
      })
    }
  }
}

module.exports = {
  Block,
  BlockChain
};


