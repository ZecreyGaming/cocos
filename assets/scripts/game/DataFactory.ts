import { FrameData, ItemData, PlayerData } from "./Data";

export default class DataFactory {
    private _preRecoveryFrameDataPool: Array<FrameData> = null;
    private _frameDataPool: Array<FrameData> = null;
    private _playerDataPool: Array<PlayerData> = null;
    private _itemDataPool: Array<ItemData> = null;

    constructor() {
        this._preRecoveryFrameDataPool = [];
        this._frameDataPool = [];
        this._playerDataPool = [];
        this._itemDataPool = [];
    }

    public exePreDelQueue() {
        while (this._preRecoveryFrameDataPool.length > 0) {
            let fd = this._preRecoveryFrameDataPool.pop();
            this.addFrameDataToPool(fd);
        }
    }

    public addFrameDataToPreRePool(fd: FrameData) {
        this._preRecoveryFrameDataPool.push(fd);
    }

    public addFrameDataToPool(fd: FrameData){
        for (let i = 0; i < fd.players.length; i++) {
            let pd = fd.players.pop();
            PlayerData.reset(pd);
            this._playerDataPool.push(pd);
        }
        for (let i = 0; i < fd.items.length; i++) {
            let pd = fd.items.pop();
            ItemData.reset(pd);
            this._itemDataPool.push(pd);
        }
        FrameData.reset(fd);
        this._frameDataPool.push(fd);
    }

    public recoveryFrameData(frameDatas: Array<FrameData>) {
        while (frameDatas.length > 0) {
            let pd = frameDatas.pop();
            this.addFrameDataToPreRePool(pd);
        }
    }

    public createFrameData() {
        if (this._frameDataPool.length > 0) {
            let fd = this._frameDataPool.pop();
            return fd;
        }
        return new FrameData();
    }

    public createPlayerData() {
        if (this._playerDataPool.length > 0) {
            let pd = this._playerDataPool.pop();
            PlayerData.reset(pd);
            return pd;
        }
        return new PlayerData();
    }

    public createItemData() {
        if (this._itemDataPool.length > 0) {
            let itemData = this._itemDataPool.pop();
            ItemData.reset(itemData);
            return itemData;
        }
        return new ItemData();
    }
}