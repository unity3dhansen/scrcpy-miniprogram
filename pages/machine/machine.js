Page({
    data: {
        canvasWidth: '100px',
        canvasHeight: '100px',
        imgWidth: '100px',
        imgHeight: '100px',
        rotate: false,
        rotateStyle: '',        
        imgData: '',
        diff: '0px',
        socketOpen: false,
    },

    onLoad() {
        var system = wx.getSystemInfoSync()
        var _this = this
        this.setData({
            canvasWidth: system.windowWidth,
            canvasHeight: system.windowHeight - 30,
            imgWidth: system.windowWidth,
            imgHeight: system.windowHeight - 30,
            diff: (system.windowHeight - 30 - system.windowWidth) / 2,
        })
        wx.connectSocket({
            url: 'ws://127.0.0.1:20001',              
            header:{
                'content-type': 'application/json'
            }
        })
    
        wx.onSocketOpen(function(res) {
            _this.data.socketOpen = true
            console.log("open......")
        })
    
        wx.onSocketMessage(function(res) {         
            let data = "data:image/png;base64," + wx.arrayBufferToBase64(res.data);           
            _this.setData({imgData:data})                                       
        })
    
        wx.onSocketClose(function(res) {
            _this.data.socketOpen = false
            console.log('closed!!!!')
        })
    },  
    imgBindload(e) {
        if (this.data.rotate != (e.detail.width > e.detail.height)){        
            let tmpWidth = this.data.imgWidth;         
            let tmpHeight = this.data.imgHeight;                        
            this.setData({imgWidth:tmpHeight,
                imgHeight:tmpWidth,
                rotate:(e.detail.width > e.detail.height),
                rotateStyle: ''               
            })
            if (this.data.rotate){
                this.setData({
                    rotateStyle: 'transform: rotate(90deg) translate('+ this.data.diff + 'px, ' + this.data.diff + 'px); '
                })
            }                                                                     
        }          
    },
    sendSocketMessage(msg) {
        if (this.data.socketOpen) {
          wx.sendSocketMessage({
            data:msg
          })
        }
    },
    handleStart(e){      
        let touch = e.changedTouches[0]
        let scalex = touch.clientX  / this.data.canvasWidth
        let scaley = touch.clientY  / this.data.canvasHeight        
        if (this.data.rotate){
            scalex = touch.clientY / this.data.imgWidth
            scaley = 1 - touch.clientX / this.data.imgHeight
        }
        let msg = JSON.stringify({
            "msg_type": 2,
            "msg_inject_touch_action": 0,
            "msg_inject_touch_index": touch.identifier,
            "msg_inject_touch_position": {
                "x": scalex, "y": scaley, "width": this.data.imgWidth, "height": this.data.imgHeight
            }
        })
       this.sendSocketMessage(msg);            
    },
    handleMove(e){
        let touch = e.changedTouches[0]
        let scalex = touch.clientX  / this.data.canvasWidth
        let scaley = touch.clientY  / this.data.canvasHeight        
        if (this.data.rotate){
            scalex = touch.clientY / this.data.imgWidth
            scaley = 1 - touch.clientX / this.data.imgHeight
        }
        let msg = JSON.stringify({
            "msg_type": 2,
            "msg_inject_touch_action": 2,
            "msg_inject_touch_index": touch.identifier,
            "msg_inject_touch_position": {
                "x": scalex, "y": scaley, "width": this.data.imgWidth, "height": this.data.imgHeight
            }
        })
       this.sendSocketMessage(msg);     
    },
    handleEnd(e){
        let touch = e.changedTouches[0]
        let scalex = touch.clientX  / this.data.canvasWidth
        let scaley = touch.clientY  / this.data.canvasHeight        
        if (this.data.rotate){
            scalex = touch.clientY / this.data.imgWidth
            scaley = 1 - touch.clientX / this.data.imgHeight
        }
        let msg = JSON.stringify({
            "msg_type": 2,
            "msg_inject_touch_action": 1,
            "msg_inject_touch_index": touch.identifier,
            "msg_inject_touch_position": {
                "x": scalex, "y": scaley, "width": this.data.imgWidth, "height": this.data.imgHeight
            }
        })
       this.sendSocketMessage(msg);     
    },
    specialKey(touch) {
        this.sendSocketMessage(JSON.stringify({
            "msg_type": 0,
            "msg_inject_keycode_action": 0,
            "msg_inject_keycode_keycode": touch.currentTarget.id,
            "msg_inject_keycode_metastate": 0
        }))
        this.sendSocketMessage(JSON.stringify({
            "msg_type": 0,
            "msg_inject_keycode_action": 1,
            "msg_inject_keycode_keycode": touch.currentTarget.id,
            "msg_inject_keycode_metastate": 0
        }))
    },
})