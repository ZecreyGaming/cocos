import * as cc from 'cc';
const { ccclass, property } = cc._decorator;

@ccclass('SettlementPanel')
export class SettlementPanel extends cc.Component {

    @property([cc.Node]) teamIcons: Array<cc.Node> = [];
    @property([cc.Node]) teamTitles: Array<cc.Node> = [];
    @property(cc.Label) lblCd: cc.Label = null; 

    private _cd: number = 0;
    private _callback: Function = null;

    public showUI(data: any, callback: Function) {
        this.node.active = true;
        this._callback = callback;
        if (data.cd) {
            this._cd = parseInt(data.cd);
        } else {
            this._cd = 15;
        }
        for (let i = 1; i < this.teamIcons.length; i++) {
            if (this.teamIcons[i] == null || this.teamTitles[i] == null) continue;
            if (i == data.winner) {
                this.teamIcons[i].active = true;
                this.teamTitles[i].active = true;
            } else {
                this.teamIcons[i].active = false;
                this.teamTitles[i].active = false;
            }
        }
        if (this._cd >= 10) {
            this.lblCd.string = "00:" + this._cd;
        } else {
            this.lblCd.string = "00:0" + this._cd;
        }
        this.unschedule(this.cdTimeHandler);
        let times = this._cd;
        this.schedule(this.cdTimeHandler, 1, times, 0);
    }

    private cdTimeHandler() {
        this._cd -= 1;
        if (this._cd <= 0){
            this.lblCd.string = "00:00";
            this.unschedule(this.cdTimeHandler);
            let callback = this._callback;
            if (callback) {
                callback();
                this._callback = null;
            }
        }
        if (this._cd >= 10) {
            this.lblCd.string = "00:" + this._cd;
        } else {
            this.lblCd.string = "00:0" + this._cd;
        }
    }

    public closeUI() {
        this.node.active = false;
        this.lblCd.string = "00:00";
        this.unschedule(this.cdTimeHandler);
    }

    start() {

    }
}

