// index.js
// 获取应用实例
const app = getApp()

Page({
  data: {
    userInfo: {},
    hasUserInfo: false,
    canIUse: wx.canIUse('button.open-type.getUserInfo'),
    canIUseGetUserProfile: false,
    canIUseOpenData: wx.canIUse('open-data.type.userAvatarUrl') && wx.canIUse('open-data.type.userNickName'), // 如需尝试获取用户信息可改为false
    settingItems: [
      {key:'是否显示导航栏', id:'navigate', value:
          [{value: true, key: '显示'},
          {value: false, key: '不显示', checked: 'true'}]},
      {key:'显示方式', id:'screen', value:
        [{key: '全屏', value: 'full', checked:'true'},
        {key: '保持比例', value: 'ratio'}]
      }        
    ],
    navigate: false,
    screen: 'full',
  },
  // 事件处理函数
  bindViewTap() {
    wx.navigateTo({
      url: '../logs/logs',
    })
  },

  linkToCloudPhone(){
    let _this = this
    wx.navigateTo({
      url: '../machine/machine',
      success: function(e){
        e.eventChannel.emit('setting', {data: {navigate: _this.data.navigate, screen: _this.data.screen}})
      }
    })
  },
  onLoad() {
    if (wx.getUserProfile) {
      this.setData({
        canIUseGetUserProfile: true
      })
    }
  },
  getUserProfile(e) {
    // 推荐使用wx.getUserProfile获取用户信息，开发者每次通过该接口获取用户个人信息均需用户确认，开发者妥善保管用户快速填写的头像昵称，避免重复弹窗
    wx.getUserProfile({
      desc: '展示用户信息', // 声明获取用户个人信息后的用途，后续会展示在弹窗中，请谨慎填写
      success: (res) => {
        console.log(res)
        this.setData({
          userInfo: res.userInfo,
          hasUserInfo: true
        })
      }
    })
  },
  getUserInfo(e) {
    // 不推荐使用getUserInfo获取用户信息，预计自2021年4月13日起，getUserInfo将不再弹出弹窗，并直接返回匿名的用户个人信息
    console.log(e)
    this.setData({
      userInfo: e.detail.userInfo,
      hasUserInfo: true
    })
  },
  
  scanQRCode(){
    wx.scanCode({
      // onlyFromCamera: true,
      scanType: [],
      success: (result) => {
        console.log(result)
      },
      fail: (res) => {},
      complete: (res) => {},
    })
  },

  radioChange(e) {
    this.setData({
      [e.target.id]: e.detail.value
    })    
  }
})
