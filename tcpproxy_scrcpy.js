var WebSocketServer = require('ws').Server
    , http = require('http')
    , path = require('path')
    , net = require('net')
    , exec = require('child_process').exec

process.on("uncaughtException", function(error) {
    console.error(error);
});

if (process.argv.length != 8) {
    console.log("usage: %s <localport> <remotehost> <remoteport> <control_port> <serial> <cmd>", process.argv[1]);
    process.exit();
}

const  CONTROL_MSG_TYPE_INJECT_KEYCODE  = 0
const  CONTROL_MSG_TYPE_INJECT_TEXT = 1
    const  CONTROL_MSG_TYPE_INJECT_TOUCH_EVENT = 2
const  CONTROL_MSG_TYPE_INJECT_SCROLL_EVENT = 3
const  CONTROL_MSG_TYPE_BACK_OR_SCREEN_ON = 4
const  CONTROL_MSG_TYPE_EXPAND_NOTIFICATION_PANEL = 5
const  CONTROL_MSG_TYPE_COLLAPSE_NOTIFICATION_PANEL = 6
const  CONTROL_MSG_TYPE_GET_CLIPBOARD = 7
const  CONTROL_MSG_TYPE_SET_CLIPBOARD = 8
const  CONTROL_MSG_TYPE_SET_SCREEN_POWER_MODE = 9
const  CONTROL_MSG_TYPE_ROTATE_DEVICE = 10
const keyCodeToAndroid = {
    "Digit0": 7,
    "Digit1": 8,
    "Digit2": 9,
    "Digit3": 10,
    "Digit4": 11,
    "Digit5": 12,
    "Digit6": 13,
    "Digit7": 14,
    "Digit8": 15,
    "Digit9": 16,
    "Numpad0": 7,
    "Numpad1": 8,
    "Numpad2": 9,
    "Numpad3": 10,
    "Numpad4": 11,
    "Numpad5": 12,
    "Numpad6": 13,
    "Numpad7": 14,
    "Numpad8": 15,
    "Numpad9": 16,
    "Star": 17,
    "Pound": 18,
    "__VolumeUp": 24,
    "__VolumeDown": 25,
    "__Power": 26,
    "KeyA": 29,
    "KeyB": 30,
    "KeyC": 31,
    "KeyD": 32,
    "KeyE": 33,
    "KeyF": 34,
    "KeyG": 35,
    "KeyH": 36,
    "KeyI": 37,
    "KeyJ": 38,
    "KeyK": 39,
    "KeyL": 40,
    "KeyM": 41,
    "KeyN": 42,
    "KeyO": 43,
    "KeyP": 44,
    "KeyQ": 45,
    "KeyR": 46,
    "KeyS": 47,
    "KeyT": 48,
    "KeyU": 49,
    "KeyV": 50,
    "KeyW": 51,
    "KeyX": 52,
    "KeyY": 53,
    "KeyZ": 54,
    "Comma": 55,
    "Period": 56,
    "AltLeft": 57,
    "AltRight": 58,
    "ShiftLeft": 59,
    "ShiftRight": 60,
    "Tab": 61,
    "Space": 62,
    "Enter": 66,
    "Delete": 67,
    "Minus": 69,
    "Equal": 70,
    "BracketLeft": 71,
    "BracketRight": 72,
    "Backslash": 73,
    "Semicolon": 74,
    "Quote": 75,
    "Slash": 76,
    "Backspace":67,
    "ArrowUp": 19,
    "ArrowDown": 20,
    "ArrowLeft": 21,
    "ArrowRight": 22,
    "Back": 4,
    "Home": 3,
    "Menu": 82,
    "App_Switch": 187,
    "WakeUp": 224,
}

//host local for provider
var localport = process.argv[2];

//port redirect to device
var remotehost = process.argv[3];
var remoteport = process.argv[4];
var controlport = process.argv[5];
var serial = process.argv[6]
var cmd = process.argv[7]


var stream, controlStream
var readBannerBytes = 0
var bannerLength = 2
var readFrameBytes = 0
var frameBodyLength = 0
var frameBody = Buffer.alloc(0)
var banner = {
    version: 0
    , length: 0
    , pid: 0
    , realWidth: 0
    , realHeight: 0
    , virtualWidth: 0
    , virtualHeight: 0
    , orientation: 0
    , quirks: 0
}
var server = http.createServer()
var capsocket = new WebSocketServer({ server: server })
var execcmd = 'adb -s ' + serial + ' shell ' + cmd
var canRead = false;
var canWrite = false;
var imageSocket = null;

var adb = exec(execcmd, function (error, stdout, stderr) {
    if (error) {
        console.log(error.stack);
        console.log('Error code: '+error.code);
        console.log('Signal received: '+error.signal);
    }
    console.log('Child Process STDOUT: '+stdout);
    console.log('Child Process STDERR: '+stderr);
});
adb.on('exit', function (code) {
    console.log('Child process exited with exit code '+code);
});

capsocket.on('connection', function(ws) {
    console.log("connection on scrcpy")
    imageSocket = ws
    ws.on('message', ParseInstruction)
    if (stream == null){
        // 原始代码默认的图像socket
        stream =  net.connect({
            port: remoteport
        },function (){
            console.info("screen socket connect")
            canRead = true;
        })

        stream.on('error', function() {
            console.error('Be sure to run `adb forward tcp:%d localabstract:scrcpy`', remoteport)
            console.error('Be sure to run `adb forward tcp:%d localabstract:scrcpy-control`', controlport)
            process.exit(1)
        })

        stream.on('readable', tryRead)
    }

    if (controlStream == null){
        controlStream = net.connect({
            port: controlport
        },function () {
            console.info("constrol socket connect")
            canWrite = true;
        })
    }

    ws.on('close', function(e) {
        console.log(e)
        console.info('Lost a client on scrcpy')
        imageSocket = null
        // stream.end()
        // controlStream.end()
    })

    function tryRead() {
        for (var chunk; (chunk = stream.read());) {
            // console.info('chunk(length=%d)', chunk.length)
            for (var cursor = 0, len = chunk.length; cursor < len;) {
                if (readBannerBytes < bannerLength) {
                    switch (readBannerBytes) {
                        case 0:
                            // version
                            banner.version = chunk[cursor]
                            break
                        case 1:
                            // length
                            banner.length = bannerLength = chunk[cursor]
                            break
                        case 2:
                        case 3:
                        case 4:
                        case 5:
                            // pid
                            banner.pid +=
                                (chunk[cursor] << ((readBannerBytes - 2) * 8)) >>> 0
                            break
                        case 6:
                        case 7:
                        case 8:
                        case 9:
                            // real width
                            banner.realWidth +=
                                (chunk[cursor] << ((readBannerBytes - 6) * 8)) >>> 0
                            break
                        case 10:
                        case 11:
                        case 12:
                        case 13:
                            // real height
                            banner.realHeight +=
                                (chunk[cursor] << ((readBannerBytes - 10) * 8)) >>> 0
                            break
                        case 14:
                        case 15:
                        case 16:
                        case 17:
                            // virtual width
                            banner.virtualWidth +=
                                (chunk[cursor] << ((readBannerBytes - 14) * 8)) >>> 0
                            break
                        case 18:
                        case 19:
                        case 20:
                        case 21:
                            // virtual height
                            banner.virtualHeight +=
                                (chunk[cursor] << ((readBannerBytes - 18) * 8)) >>> 0
                            break
                        case 22:
                            // orientation
                            banner.orientation += chunk[cursor] * 90
                            break
                        case 23:
                            // quirks
                            banner.quirks = chunk[cursor]
                            break
                    }

                    cursor += 1
                    readBannerBytes += 1

                    if (readBannerBytes === bannerLength) {
                        console.log('banner', banner)
                    }
                }
                else if (readFrameBytes < 4) {
                    frameBodyLength += (chunk[cursor] << (readFrameBytes * 8)) >>> 0
                    cursor += 1
                    readFrameBytes += 1
                    // console.info('headerbyte%d(val=%d)', readFrameBytes, frameBodyLength)
                }
                else {
                    if (len - cursor >= frameBodyLength) {
                        // console.info('bodyfin(len=%d,cursor=%d)', frameBodyLength, cursor)

                        frameBody = Buffer.concat([
                            frameBody
                            , chunk.slice(cursor, cursor + frameBodyLength)
                        ])

                        // Sanity check for JPG header, only here for debugging purposes.
                        if (frameBody[0] !== 0xFF || frameBody[1] !== 0xD8) {
                            console.error(
                                'Frame body does not start with JPG header', frameBody)
                            // process.exit(1)
                        }else{
                            if (imageSocket != null)
                                imageSocket.send(frameBody,{
                                    binary:true
                                })
                        }
                        if (imageSocket != null)
                            imageSocket.send(frameBody, {
                                binary: true
                            })

                        cursor += frameBodyLength
                        frameBodyLength = readFrameBytes = 0
                        frameBody = Buffer.alloc(0)
                    }
                    else {
                        // console.info('body(len=%d)', len - cursor)

                        frameBody = Buffer.concat([
                            frameBody
                            , chunk.slice(cursor, len)
                        ])

                        frameBodyLength -= len - cursor
                        readFrameBytes += len - cursor
                        cursor = len
                    }
                }
            }
        }
    }

    function byteToString(arr) {
        if(typeof arr === 'string') {
            return arr;
        }
        var str = '',
            _arr = arr;
        for(var i = 0; i < _arr.length; i++) {
            var one = _arr[i].toString(2),
                v = one.match(/^1+?(?=0)/);
            if(v && one.length == 8) {
                var bytesLength = v[0].length;
                var store = _arr[i].toString(2).slice(7 - bytesLength);
                for(var st = 1; st < bytesLength; st++) {
                    store += _arr[st + i].toString(2).slice(2);
                }
                str += String.fromCharCode(parseInt(store, 2));
                i += bytesLength - 1;
            } else {
                str += String.fromCharCode(_arr[i]);
            }
        }
        return str;
    }
    function ParseInstruction(e){
        let datas = JSON.parse(e);
        // console.log(datas)
        let buf = "";
        if (canWrite == false)
            return;
        switch (datas.msg_type){
            case CONTROL_MSG_TYPE_INJECT_KEYCODE:
                buf = Buffer.alloc(10);
                buf.writeIntBE(datas.msg_type, 0, 1)
                buf.writeIntBE(datas.msg_inject_keycode_action, 1, 1)
                buf.writeInt32BE(keyCodeToAndroid[datas.msg_inject_keycode_keycode], 2)
                buf.writeInt32BE(datas.msg_inject_keycode_metastate, 6)
                controlStream.write(buf);
                break;
            case CONTROL_MSG_TYPE_INJECT_TEXT:
                var txt = Buffer.from(datas.message);
                buf = Buffer.alloc(3 + txt.length)
                buf.writeIntBE(CONTROL_MSG_TYPE_INJECT_TEXT, 0, 1)
                buf.writeInt16BE(txt.length, 1)
                buf.write(datas.message, 3)
                controlStream.write(buf);
                break;
            case CONTROL_MSG_TYPE_INJECT_TOUCH_EVENT:
                if (datas.msg_inject_touch_position.width > datas.msg_inject_touch_position.height != banner.realWidth > banner.realHeight){
                    var tmp = banner.realWidth
                    banner.realWidth = banner.realHeight
                    banner.realHeight = tmp
                }
                datas.Msg_inject_touch_pointerid = datas.msg_inject_touch_index
                datas.Msg_inject_touch_pressure = 1
                datas.Msg_inject_touch_buttons = 1
                buf = Buffer.alloc(26);
                buf.writeIntBE(datas.msg_type,0, 1)
                buf.writeIntBE(datas.msg_inject_touch_action, 1, 1)
                buf.writeInt32BE(datas.Msg_inject_touch_pointerid, 2)
                buf.writeInt32BE(datas.msg_inject_touch_position.x * banner.realWidth, 6)
                buf.writeInt32BE(datas.msg_inject_touch_position.y * banner.realHeight, 10)
                buf.writeInt16BE(banner.realWidth, 14)
                buf.writeInt16BE(banner.realHeight, 16)
                buf.writeInt32BE(datas.Msg_inject_touch_pressure, 18)
                buf.writeInt32BE(datas.Msg_inject_touch_buttons, 22)
                controlStream.write(buf)
                break;

            case CONTROL_MSG_TYPE_INJECT_SCROLL_EVENT:
                if (datas.msg_inject_scroll_position.width > datas.msg_inject_scroll_position.height != banner.realWidth > banner.realHeight){
                    var tmp = banner.realWidth
                    banner.realWidth = banner.realHeight
                    banner.realHeight = tmp
                }
                buf = Buffer.alloc(21);
                buf.writeIntBE(datas.msg_type, 0, 1)
                buf.writeInt32BE(datas.msg_inject_scroll_position.x * banner.realWidth, 1)
                buf.writeInt32BE(datas.msg_inject_scroll_position.y * banner.realHeight, 5)
                buf.writeInt16BE(banner.realWidth, 9)
                buf.writeInt16BE(banner.realHeight, 11)
                buf.writeInt32BE(datas.msg_inject_scroll_horizontal, 13)
                buf.writeInt32BE(datas.msg_inject_scroll_vertical, 17)

                controlStream.write(buf);
                break;
            case CONTROL_MSG_TYPE_BACK_OR_SCREEN_ON:
            case CONTROL_MSG_TYPE_EXPAND_NOTIFICATION_PANEL:
            case CONTROL_MSG_TYPE_COLLAPSE_NOTIFICATION_PANEL:
            case CONTROL_MSG_TYPE_GET_CLIPBOARD:
            case CONTROL_MSG_TYPE_SET_CLIPBOARD:
            case CONTROL_MSG_TYPE_SET_SCREEN_POWER_MODE:
            default:
                err = errors.New("unsupported msg type")
        }
    }

})



server.listen(localport);
console.log("redirecting connections from 127.0.0.1:%d to %s:%d", localport, remotehost, remoteport);

