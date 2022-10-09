import { _decorator, Component } from 'cc';
const { ccclass } = _decorator;

@ccclass('NetErrorPanel')
export class NetErrorPanel extends Component {

    public get isShow() {
        return this.node.active;
    }

    public showUI() {
        this.node.active = true;
    }

    public closeUI() {
        this.node.active = false;
    }
}

