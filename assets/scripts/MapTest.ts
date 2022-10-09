import { _decorator, Component, Node } from 'cc';
import Map from './game/Map';
const { ccclass, property } = _decorator;

@ccclass('MapTest')
export class MapTest extends Component {
    private _map: Map = null;

    start() {

    }

    update(deltaTime: number) {
        
    }

    /** 创建阵营 */
    private createCamp() {
        let camp1 = [243, 244, 245, 246, 247, 248, 249, 204, 205, 206, 207, 208, 165, 166, 167, 126, 284, 285, 286, 287, 288, 325, 326, 327, 366];
        let camp2 = [270, 271, 272, 273, 274, 275, 276, 231, 232, 233, 234, 235, 192, 193, 194, 153, 311, 312, 313, 314, 315, 352, 353, 354, 393];
        let camp3 = [923, 924, 925, 926, 927, 928, 929, 884, 885, 886, 887, 888, 845, 846, 847, 806, 964, 965, 966, 967, 968, 1005, 1006, 1007, 1046];
        let camp4 = [950, 951, 952, 953, 954, 955, 956, 911, 912, 913, 914, 915, 872, 873, 874, 833, 991, 992, 993, 994, 995, 1032, 1033, 1034, 1073];
        for (let i = 0; i < camp2.length; i++) {
            this._map.updateTerritory(camp1[i], 0);
            this._map.updateTerritory(camp2[i], 1);
            this._map.updateTerritory(camp3[i], 2);
            this._map.updateTerritory(camp4[i], 3);
        }
    }

    private createPlayer() {
        let player1 = this._map.createPlayer(0, '1');
        player1.setIndexPosition(246);
        // player1.setMoveAngel(90);
        this._map.addPlayer(player1);
        let player2 = this._map.createPlayer(1, '2');
        player2.setIndexPosition(273);
        this._map.addPlayer(player2);
        let player3 = this._map.createPlayer(2, '3');
        player3.setIndexPosition(926);
        this._map.addPlayer(player3);
        let player4 = this._map.createPlayer(3, '4');
        player4.setIndexPosition(953);
        this._map.addPlayer(player4);
    }
}

