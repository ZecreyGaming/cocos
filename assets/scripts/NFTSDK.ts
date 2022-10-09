import { _decorator, Component, Node } from 'cc';
const { ccclass, property } = _decorator;

export var nftsdk = window["nftsdk"] || {
    createNTFFromGame: (data: any) => { //  创建NFT param: data = {id: 1, cb: (id) => void}
        console.error("not found ntfsdk.createNTFFromGame Function.");
        if (data && data.cb) {
            data.cb(data.id);
        }
    },
    gameInit: () => { // 游戏开始初始化
        console.error("not found ntfsdk.gameInit Function.");
    },
    gameLoadProgress: (progress: number) => { // 游戏加载进度
        console.error("not found ntfsdk.gameLoadProgress Function.");
    },
    gameInitComplete: () => { // 游戏初始化完成
        console.error("not found ntfsdk.gameInitComplete Function.");
    },
    getUserData: (cb: Function) => { // 获取用户数据
        console.error("not found ntfsdk.getUserData Function.");
        cb && cb({assets: []});
    },
    setUpdateUserDataCallback: (cb: (data) => void) => { // 用户信息更新回调
        console.error("not found ntfsdk.setUpdateUserDataCallback Function.");
        window['rpggame'].updateUserDataCallback = cb;
    }
};

@ccclass('NFTSDK')
export class NFTSDK extends Component {
    public gameInit() {
        if (nftsdk && nftsdk.gameInit as Function) {
            nftsdk.gameInit();
        }
    }
    public gameInitComplete() {
        if (nftsdk && nftsdk.gameInitComplete as Function) {
            nftsdk.gameInitComplete();
        }
    }
    public createNTFFromGame(id: number, cb: (id: number) => void) {
        if (nftsdk && nftsdk.createNTFFromGame as Function) {
            nftsdk.createNTFFromGame({id: id, cb: cb});
        }
    }
    public getUserInfo(cb: (data: any) => void) {
        if (nftsdk && nftsdk.getUserData as Function) {
            nftsdk.getUserData(cb);
        }
    }
    public setUpdateUserDataCallback(cb: (data: any) => void) {
        if (nftsdk && nftsdk.setUpdateUserDataCallback as Function) {
            nftsdk.setUpdateUserDataCallback(cb);
        }
    }
}

