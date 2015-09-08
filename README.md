# tbtests
## Simple node server and app to play around with the TB node and JS APIs

I'm not using express or anything like that for the server mostly
cause I don't feel like it.

The toys in this repo uses redis to store whatever persistence they need *and* they expect the API secret and API key to be stored in redis *before* trying to run anything here. If you haven't done so already, just run 

```
redis-cli set tb_api_key yourkeyhere
redis-cli set tb_api_secret yoursecrethere
```

(replace the obvious parts with your actual values).


## Installation

```
npm install
```

Sorry about that :P

## Running

```
node server.js [listening port]
```


