import * as cc from "cc";
import { Territory } from "./Territory";
import { Player } from "./Player";
import { ItemData } from "./Data";

export default class Map extends cc.EventTarget {

    public static Event = {
        LOAD_COMPLETE: 'LOAD_COMPLETE',
        LOAD_ERROR: 'LOAD_ERROR',
        LOAD_PROGRESS: 'LOAD_PROGRESS'
    };

    private _mapLayer: cc.Node = null;
    private _iconLayer: cc.Node = null;
    private _playerLayer: cc.Node = null;
    private _rows: number = 30;
    private _cols: number = 40;
    private _gridNodeTemp: cc.Node = null;
    private _gridWid: number = 20;
    private _gridHei: number = 20;

    private _territorys: Array<Territory> = null;
    private _avatars: Array<cc.SpriteFrame> = null;
    private _itemAssets = null;
    private _players: object = null;
    private _items: object = null;
    private _loaded: boolean = false;
    private _teamColors: Array<cc.Color> = null;

    private _mapOffsetX: number = 0;
    private _mapOffsetY: number = 0;
    private _mapWidth: number = 840;
    private _mapHeight: number = 630;

    private _gridNodePool: Array<Territory> = [];
    private _playerNodePool: Array<Player> = [];
    private _itemNodePool: Array<cc.Node> = [];

    constructor(mapLayer: cc.Node, playerLayer: cc.Node, iconLayer: cc.Node, gridNodeTemp: cc.Node) {
        super();
        this._mapLayer = mapLayer;
        this._iconLayer = iconLayer;
        this._playerLayer = playerLayer;
        this._gridNodeTemp = gridNodeTemp;
        this._territorys = new Array<Territory>();
        this._avatars = [];
        this._players = {};
        this._itemAssets = {};
        this._items = {};
        //  1.Bitcoin/BTC阵营：#F7931A | 2.Ethereum/ETH阵营：#627EEA | 3.Binance阵营/BNB：#F0BB10 | 4.Avalanche/AVAX阵营：#E84142 | 5.Polygon/MATIC阵营：#8247E5
        this._teamColors = [cc.Color.WHITE];
        let c = new cc.Color();
        this._teamColors.push(cc.Color.fromHEX(c, '#F7931A'));
        c = new cc.Color();
        this._teamColors.push(cc.Color.fromHEX(c, '#627EEA'));
        c = new cc.Color();
        this._teamColors.push(cc.Color.fromHEX(c, '#F0BB10'));
        c = new cc.Color();
        this._teamColors.push(cc.Color.fromHEX(c, '#E84142'));
        c = new cc.Color();
        this._teamColors.push(cc.Color.fromHEX(c, '#8247E5'));
    }

    public init(rows: number, cols: number, gridWid: number, gridHei: number) {
        this._rows = rows;
        this._cols = cols;
        this._gridWid = gridWid;
        this._gridHei = gridHei;
        this.resetPlayer();
        this.createMap();
    }

    // type/thumbnail/
    public initItemAssets(items: Array<any>) {
        for (let i = 0; i < items.length; i++) {
            let item = items[i];
            this._itemAssets[item.type] = {type: item.type, url: item.thumbnail};
            cc.assetManager.loadRemote(item.thumbnail, (err: Error, asset: cc.Texture2D) => {
                if (err) console.error(err);
            });
        }
    }

    public load() {
        this._loaded = false;
        cc.resources.loadDir("./avatars", cc.SpriteFrame, this.onLoadResComplete.bind(this))
    }

    private onLoadResComplete(err: Error, assets: Array<cc.SpriteFrame>) {
        if (err) {
            console.error("avatar load error!");
            this.emit(Map.Event.LOAD_ERROR);
            return;
        }
        console.log("game load complete.");
        for (let i = 0; i < assets.length; i++) {
            assets[i].addRef();
            this._avatars.push(assets[i]);
        }
        this._loaded = true;
        this.emit(Map.Event.LOAD_COMPLETE);
        console.log("game init complete. avatar count = " + this._avatars.length);
    }

    private createMap() {
        for (let i = 0; i < this._territorys.length; i++) {
            let t = this._territorys[i];
            if (t) {
                t.node.parent = null;
                this._gridNodePool.push(t);
            }
        }
        this._territorys.splice(0, this._territorys.length);
        let rows = this._rows, cols = this._cols;
        let gridWid = this._gridWid, gridHei = this._gridHei;
        // let offsetX = -(cols * gridWid + cols) / 2 + gridWid / 2;
        // let offsetY = -(rows * gridHei + rows) / 2 + gridHei / 2;
        let offsetX = -(cols * gridWid + cols) / 2 + gridWid / 2;
        let offsetY = (rows * gridHei + rows) / 2 - gridHei / 2;
        for (let i = 0; i < rows; i++) {
            for (let j = 0; j < cols; j++) {
                let t = this._gridNodePool.pop();
                let n: cc.Node = null;
                if (t == null) {
                    n = cc.instantiate(this._gridNodeTemp);
                    t = n.addComponent(Territory);
                    n.active = true;
                } else {
                    n = t.node;
                    t = n.getComponent(Territory);
                }
                let sp = n.getComponent(cc.Sprite);
                sp.color = this._teamColors[0];
                this._mapLayer.addChild(n);
                let tf = n.getComponent(cc.UITransform);
                if (tf) tf.setContentSize(this._gridWid, this._gridHei);
                n.setPosition(offsetX + j * (gridWid + 1), offsetY - i * (gridHei + 1));
                t.gridX = j;
                t.gridY = i;
                t.teamId = -1;
                t.map = this;
                t.index = t.gridY * cols + t.gridX;
                // console.log("index = " + t.index + " , x = " + j + ", y = " + i);
                this._territorys[t.index] = t;
            }
        }
        // 偏移值是左上角
        this._mapOffsetX = offsetX - gridWid / 2;
        this._mapOffsetY = offsetY + gridHei / 2;
    }

    public reset() {
        this.resetPlayer();
        this.createMap();
    }

    private resetPlayer() {
        if (this._players) {
            for (let k in this._players) {
                let p: Player = this._players[k];
                if (p) {
                    this._playerLayer.removeChild(p.node);
                    this._playerNodePool.push(p);
                }
            }
            this._players = {};
        }
    }

    public gridToMapPosition(gx: number, gy: number, center: boolean = false, out: any) {
        if (out) {
            out.x = this._mapOffsetX + gx * (this._gridWid + 1);
            out.y = this._mapOffsetY - gy * (this._gridHei + 1);
            if (center) {
                out.x += this._gridWid / 2;
                out.y -= this._gridHei / 2;
            }
        }
    }

    public indexToMapPosition(index: number, out?) {
        if (out) {
            let gx = Math.floor(index % this._cols);
            let gy = Math.floor(index / this._cols);
            out.x = this._mapOffsetX + gx * (this._gridWid + 1);
            out.y = this._mapOffsetY - gy * (this._gridHei + 1);
        }
    }

    public gridToIndex(gx: number, gy: number) {
        return gy * this._cols + gx;
    }

    public mapToGrid(pos: cc.Vec3, out) {
        out.x = Math.floor((pos.x - this._mapOffsetX) / (this._gridWid + 1));
        out.y = Math.floor((-pos.y + this._mapOffsetY) / (this._gridHei + 1));
    }

    public createPlayer(teamId: number, playerId: string, addTo: boolean = false, thumbnail: string = null) {
        let n: cc.Node = null;
        let player: Player = this._playerNodePool.pop();
        let tf: cc.UITransform = null;
        let sp: cc.Sprite = null;
        if (player != undefined) {
            n = player.node;
            n.name = "team_" + teamId;
            tf = n.getComponent(cc.UITransform); 
            sp = n.getComponent(cc.Sprite);
        } else {
            n = new cc.Node("team_" + teamId);
            player = n.addComponent(Player);
            tf = n.addComponent(cc.UITransform); 
            sp = n.addComponent(cc.Sprite);
        }
        n.layer = this._playerLayer.layer;
        n.setPosition(this._mapWidth * 4, this._playerLayer.children.length * 50);
        if (thumbnail == null) {
            let faceId = Math.ceil((this._avatars.length - 1) * Math.random());
            sp.spriteFrame = this._avatars[faceId];
        } else {
            sp.spriteFrame = null;
            cc.assetManager.loadRemote(thumbnail, (err: Error, image: cc.ImageAsset) => {
                if (err == null) {
                    let texture = new cc.Texture2D();
                    texture.image = image;
                    let spriteFrame = sp.spriteFrame;
                    sp.spriteFrame = null;
                    spriteFrame.texture = texture;
                    sp.spriteFrame = spriteFrame;
                }
            });
        }
        
        sp.sizeMode = cc.Sprite.SizeMode.CUSTOM;
        tf.setContentSize(30, 30);
        player.width = 30;
        player.height = 30;
        player.teamId = teamId;
        player.playerId = playerId;
        player.map = this;
        if (addTo) this.addPlayer(player);
        return player;
    }

    public addPlayer(player: Player) {
        this._playerLayer.addChild(player.node);
        this._players[player.playerId] = player;
    }

    public updatePlayer(playerId: string, _x: number, _y: number, now: boolean = false) {
        let player: Player = this._players[playerId];
        if (player) {
            player.setPosition(this._mapOffsetX + _x, this._mapOffsetY - _y, now);
        }
        console.log("=== updatePlayer ===",player)
    }

    /** 更新领地 */
    public updateTerritory(index: number, teamId: number) {

        let c = this._teamColors[teamId];
        let t = this._territorys[index];
        if (c && t) {
            t.teamId = teamId;
            t.color = c;
            console.log("=== updateTerritory ===",t)
        }
    }

    private _liveItems: Array<string> = [];
    public updateItems(items: Array<ItemData>) {
        console.log("=== updateItems ===",items)
        this._liveItems.splice(0, this._liveItems.length);
        for (let i = 0; i < items.length; i++) {
            let itemData = items[i];
            let n = this._items[itemData.id];
            if (n == null) {
                let asset = this._itemAssets[itemData.type];
                if (asset) {
                    n = this._itemNodePool.pop();
                    let sp: cc.Sprite = null;
                    let tf: cc.UITransform = null;
                    if (n == null) {
                        n = new cc.Node("item_" + itemData.id);
                        tf = n.addComponent(cc.UITransform);
                        sp = n.addComponent(cc.Sprite);
                        sp.sizeMode = cc.Sprite.SizeMode.CUSTOM;
                        sp.spriteFrame = new cc.SpriteFrame();
                        tf.setContentSize(20, 20);
                    } else {
                        n.name = "item_" + itemData.id;
                        sp = n.getComponent(cc.Sprite);
                    }
                    cc.assetManager.loadRemote(asset.url, (err: Error, image: cc.ImageAsset) => {
                        if (err == null) {
                            let texture = new cc.Texture2D();
                            texture.image = image;
                            let spriteFrame = sp.spriteFrame;
                            sp.spriteFrame = null;
                            spriteFrame.texture = texture;
                            sp.spriteFrame = spriteFrame;
                            n.layer = this._iconLayer.layer;
                            this._iconLayer.addChild(n);
                        }
                    });
                    this._items[itemData.id] = n;
                    n.setPosition(this._mapOffsetX + itemData.x, this._mapOffsetY - itemData.y);
                }
            } else {
                n.setPosition(this._mapOffsetX + itemData.x, this._mapOffsetY - itemData.y);
            }
            this._liveItems.push(itemData.id.toString());
        }
        for (let k in this._items) {
            let findex = this._liveItems.indexOf(k);
            if (findex < 0) {
                let n = this._items[k];
                if (n) {
                    this._iconLayer.removeChild(n);
                    this._itemNodePool.push(n);
                }
            }
        }
    }

    public getTerritoryTeamId(index: number) {
        if (this._territorys[index] == null) return -2;
        return this._territorys[index].teamId;
    }

    public getTerritory(index: number): Territory {
        if (this._territorys[index] == null) return null;
        return this._territorys[index];
    }

    public checkMapBox(node: cc.Node) {

    }

}