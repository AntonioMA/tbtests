# tbtests
## Simple node server and app to play around with the TB node and JS APIs

I'm not using express or anything like that for the server mostly
cause I don't feel like it.

The toys in this repo uses redis to store whatever persistence they
need *and* they expect the API secret and API key to be stored in
redis *before* trying to run anything here. If you haven't done so
already, just run:

```
redis-cli set tb_api_key yourkeyhere
redis-cli set tb_api_secret yoursecrethere
```

(replace the obvious parts with your actual values).

Also the code uses some of Harmony new features (concretely arrow
functions)... so you'll need a recent version of node.

## Prerequisites:
NodeJS >= 0.12 (>=4.0 recommended)
Redis

## Installation

```
npm install
```

Sorry about that :P

## Running

```
node --harmony server.js [[listening port] [static files directory]]
```

or

```
node server.js [[listening port] [static files directory]]
```

if you're running NodeJS>=4.0 (I wasn't kidding about using a recent version of Node ;))

By default it listens on the port 8123 and serves the static file from original_ui (which is the same ui from the Opentok presence kit)

