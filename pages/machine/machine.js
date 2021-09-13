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
        lastTimeStamp: 0,
        destUrl: '',
        timespan: 1000,        
    },

    onLoad(options) {                    
        var _this = this
        _this.setData({
            destUrl: options.url
        })   
        const eventChannel = this.getOpenerEventChannel()
        eventChannel.on('setting', function(setting){
            let footerHeight = 0            
            let keepRation = false
            if (setting.data.navigate)
                footerHeight = 30
            if (setting.data.screen == 'ratio')
                keepRation = true
            _this.setData({
                footerHeight: footerHeight,
                keepRation: keepRation
            })                
        })
    
        var system = wx.getSystemInfoSync() 
        var footerHeight = this.data.footerHeight

        this.setData({
            canvasWidth: system.windowWidth,
            canvasHeight: system.windowHeight - footerHeight,
            imgWidth: system.windowWidth,
            imgHeight: system.windowHeight - footerHeight,
            ratio: (system.windowHeight-footerHeight) / system.windowWidth
        })
        wx.connectSocket({
            url: 'ws://' + _this.data.destUrl,              
            header:{
                'content-type': 'application/json'
            }
        })
    
        wx.onSocketOpen(function(res) {
            _this.data.socketOpen = true
            _this.data.lastTimeStamp = Date.now()
            console.log("open......")
        })
    
        wx.onSocketMessage(function(res) {      
            if (res.data.length < 13)
                return
        
            let imageTime = Number(res.data.slice(0, 13))
            let imageData = res.data.slice(13, res.data.length)

            if (Date.now() - imageTime < this.data.timespan){
                _this.setData({imgData: imageData})
            }        
        })
    
        wx.onSocketClose(function(res) {
            _this.data.socketOpen = false
            console.log('closed!!!!')
        })
        wx.onSocketError((result) => {
            console.log('error!!!!')
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