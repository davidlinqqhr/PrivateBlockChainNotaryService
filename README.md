#Private Blockchain Notary Service
a Star Registry that allows users to claim ownership of their favorite star in the night sky.


## API Reference
    "axios": "^0.18.0",
    "bitcoinjs-lib": "^3.3.2",
    "bitcoinjs-message": "^2.0.0",
    "crypto-js": "^3.1.9-1",
    "hapi": "^17.5.4",
    "hapi-pino": "^5.0.1",
    "level": "^4.0.0"

## Tests
run client.js to test the whole process, change the value of i to change iterations.

## How to use?
### 1 Blockchain ID validation routine
1.1 make User Request

    curl -X "POST" "http://localhost:8000/" \
        -H 'Content-Type: application/json; charset=utf-8' \
        -d $'{ "address": "142BDCeSGbXjWKaAnYXbMpZ6sbrSAo3DpZ",}'

1.2	User Message signature validation

    curl -X "POST" "http://localhost:8000/message-signature/validate" \
        -H 'Content-Type: application/json; charset=utf-8' \
        -d $'{
            "address": "142BDCeSGbXjWKaAnYXbMpZ6sbrSAo3DpZ",
            "signature": "H6ZrGrF0Y4rMGBMRT2+hHWGbThTIyhBS0dNKQRov9Yg6GgXcHxtO9GJN4nwD2yNXpnXHTWU9i+qdw5vpsooryLU="
        }'

1.3 Validate User Request

    curl -X "POST" "http://localhost:8000/requestValidation" \
     -H 'Content-Type: application/json; charset=utf-8' \
     -d $'{
        "address": "142BDCeSGbXjWKaAnYXbMpZ6sbrSAo3DpZ"
    }'

### 2 Star Registration

    curl -X "POST" "http://localhost:8000/block" \
        -H 'Content-Type: application/json; charset=utf-8' \
        -d $'{
    "address": "142BDCeSGbXjWKaAnYXbMpZ6sbrSAo3DpZ",
    "star": {
        "dec": "-26° 29' 24.9",
        "ra": "16h 29m 1.0s",
        "story": "Found star using https://www.google.com/sky/"
    }
    }'


### 3 Star Lookup
3.1 get block(s) by wallet address

    curl "http://localhost:8000/stars/address:142BDCeSGbXjWKaAnYXbMpZ6sbrSAo3DpZ"

3.2 get block by block hash

    curl "http://localhost:8000/stars/hash:a59e9e399bc17c2db32a7a87379a8012f2c8e08dd661d7c0a6a4845d4f3ffb9f"

3.3 get block by block height

    curl "http://localhost:8000/block/1"

## License
MIT



