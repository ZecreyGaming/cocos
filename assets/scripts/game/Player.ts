import * as cc from 'cc';
import Map from './Map';
const { ccclass, property } = cc._decorator;

@ccclass('Player')
export class Player extends cc.Component {

    public playerId: string = null;
    public teamId: number = 0;
    public map: Map = null;
    public speed: number = 0.1;
    public width: number = 30;
    public height: number = 30;

    private _pos: cc.Vec3 = cc.v3(0, 0);
    private _targetPos = {x: 0, y: 0};

    private _offsetX: number = 0;
    private _offsetY: number = 0;
    private _angel: number = 0;
    private _gridPos = {x: 0, y: 0};

    public setPosition(x: number, y: number, now: boolean) {
        this._targetPos.x = x;
        this._targetPos.y = y;
        if (now) this.node.setPosition(x, y);
    }

    public setGridPosition(gx: number, gy: number) {
        this.map.gridToMapPosition(gx, gy, this.node.position);
    }

    public setIndexPosition(index: number) {
        this.map.indexToMapPosition(index, this.node.position);        
    }

    public setMoveAngel(angel: number) {
        this._angel = angel;
        let r = cc.math.toRadian(this._angel);
        this._offsetX = Math.cos(r) * this.speed;
        this._offsetY = Math.sin(r) * this.speed;
    }

    onLoad() {

    }

    update(dt: number) {
        // if (this.enabled == false) return;
        // this.node.getPosition(this._pos);
        // cc.math.lerp(this._pos.x, this._targetPos.x, dt);
        // cc.math.lerp(this._pos.y, this._targetPos.y, dt);
        // this.node.getPosition(this._pos);
        // this._pos.x = this._pos.x + this._offsetX;
        // this._pos.y = this._pos.y + this._offsetY;
        // this.node.setPosition(this._pos.x, this._pos.y);
        // this.map.mapToGrid(this._pos, this._gridPos);
        // let index = this.map.gridToIndex(this._gridPos.x, this._gridPos.y);
        // let t = this.map.getTerritory(index);
        // if (t != null) {
        //     let tf = this.node.getComponent(cc.UITransform);
        //     let tf2 = t.getComponent(cc.UITransform);
        //     let flag = tf.getBoundingBox().containsRect(tf2.getBoundingBox());
        //     if (flag && t.teamId != this.teamId) {
        //         this.map.updateTerritory(index, this.teamId);
        //         this.setMoveAngel(-this._angel);
        //     }
        // }
    }

}

