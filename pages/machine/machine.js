Page({
    data: {
        footerHeight: '30',
        keepRation: true,
        canvasWidth: '100px',
        canvasHeight: '100px',
        imgWidth: '100px',
        imgHeight: '100px',
        rotate: false,
        rotateStyle: '',        
        imgData: '',
        socketOpen: false,
        ratio: 0,
        alignLeft: 0,
        alignTop: 0,
        blankStyle: '',
        firstLoad: true,        
    },

    onLoad() {
        var system = wx.getSystemInfoSync()
        var _this = this
        var footerHeight = this.data.footerHeight
        this.setData({
            canvasWidth: system.windowWidth,
            canvasHeight: system.windowHeight - footerHeight,
            imgWidth: system.windowWidth,
            imgHeight: system.windowHeight - footerHeight,
            ratio: (system.windowHeight-footerHeight) / system.windowWidth
        })
        wx.connectSocket({
            url: 'ws://10.86.98.106:20001',              
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
        if (this.data.firstLoad && this.data.keepRation){
            let localWidth = e.detail.width
            let localHeight = e.detail.height
            if (localWidth > localHeight){
                let tmp = localWidth
                localWidth = localHeight
                localHeight = tmp
            }

            let localRatio = localHeight / localWidth
            let tmpWidth = this.data.imgHeight * localWidth / localHeight
            let tmpHeight = this.data.imgWidth * localHeight / localWidth
            if (localRatio > this.data.ratio){
                this.setData({
                    imgWidth: tmpWidth,
                    alignLeft: (this.data.canvasWidth - tmpWidth) / 2, 
                    ratio: localRatio,
                    firstLoad: false,
                })
            }else{
                this.setData({
                    imgHeight: tmpHeight,
                    alignTop: (this.data.canvasHeight - tmpHeight) / 2,
                    ratio: localRatio,
                    firstLoad: false,
                })
            }
        } 
         
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
                    rotateStyle: 'transform: rotate(90deg);'
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
        let scalex = (touch.clientX - this.data.alignLeft)  / this.data.imgWidth
        let scaley = (touch.clientY - this.data.alignTop) / this.data.imgHeight        
        if (this.data.rotate){
            scalex = (touch.clientY - this.data.alignTop) / this.data.imgWidth
            scaley = 1 -(touch.clientX - this.data.alignLeft) / this.data.imgHeight
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
        let scalex = (touch.clientX - this.data.alignLeft)  / this.data.imgWidth
        let scaley = (touch.clientY - this.data.alignTop) / this.data.imgHeight        
        if (this.data.rotate){
            scalex = (touch.clientY - this.data.alignTop) / this.data.imgWidth
            scaley = 1 -(touch.clientX - this.data.alignLeft) / this.data.imgHeight
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
        let scalex = (touch.clientX - this.data.alignLeft)  / this.data.imgWidth
        let scaley = (touch.clientY - this.data.alignTop) / this.data.imgHeight        
        if (this.data.rotate){
            scalex = (touch.clientY - this.data.alignTop) / this.data.imgWidth
            scaley = 1 -(touch.clientX - this.data.alignLeft) / this.data.imgHeight
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