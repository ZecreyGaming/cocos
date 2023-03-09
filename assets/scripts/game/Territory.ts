import * as cc from 'cc';
import Map from './Map';
const { ccclass, property } = cc._decorator;

@ccclass('Territory')
export class Territory extends cc.Component {
    public index: number = 0;
    public gridX: number = 0;
    public gridY: number = 0;
    public teamId: number = -1;
    public map: Map = null;
    private _sp: cc.Sprite = null;

    onLoad() {
        this._sp = this.getComponent(cc.Sprite);
        this.node.on(cc.Node.EventType.TOUCH_END, this.onTouchEnd, this);
    }

    private onTouchEnd(evt: cc.EventTouch) {
        // console.log("grid: " + this.gridX + "x" + this.gridY + ", index = " + this.index, evt.getLocation());
        // if (this._sp.color.toRGBValue() != cc.Color.RED.toRGBValue()) {
        //     this.color = cc.Color.RED;
        // } else {
        //     this.color = cc.Color.WHITE;
        // }
        let gridPos = {x: 0, y: 0};
        this.map.mapToGrid(this.node.position, gridPos);
        // console.log("toTrid: " + gridPos.x + "x" + gridPos.y);
    }

    public set color(v: cc.Color) {
        if (this._sp) {
            this._sp.color = v;
        }
    }

    public get color(): cc.Color {
        if (this._sp) {
            return this._sp.color;
        }
        return cc.Color.WHITE;
    }
}

