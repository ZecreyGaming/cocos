import * as cc from 'cc';
import Map from './game/Map';
import Network from './net/Network';
import { SettlementPanel } from './ui/SettlementPanel';
import { TerritoryMessage, TerritoryPackage, TerritoryProtocol } from './protocol/TerritoryProtocol';
import { NetErrorPanel } from './ui/NetErrorPanel';
import { FrameData } from './game/Data';
import DataFactory from './game/DataFactory';
import { DEBUG } from 'cc/env';
const { ccclass, property } = cc._decorator;

let Base64 = window['Base64'];
var wgame = window['game'] || {game_ws_url: null};
window['game'] = wgame;

@ccclass('LoadingScene')
export class LoadingScene extends cc.Component {
    @property(cc.Camera) uiCamera: cc.Camera = null;
    @property(cc.Node) mapLayer: cc.Node = null; 
    @property(cc.Node) playerLayer: cc.Node = null; 
    @property(cc.Node) iconLayer: cc.Node = null; 
    @property(cc.Node) teamNodeTemp: cc.Node = null; 
    @property(SettlementPanel) settlementPanel: SettlementPanel = null; 
    @property(NetErrorPanel) netErrorPanel: NetErrorPanel = null; 
    @property(cc.Node) logoNode: cc.Node = null; 
    @property(cc.Node) teamLogo: Array<cc.Node> = [] 

    private _map: Map = null;
    private _net: Network = null;
    private _factory: DataFactory = null;

    private _frameTime = 1 / 25;
    private _frameDt = 0;
    private _frameIndex = -1;
    private _frameDatas: Array<FrameData> = [];
    
    private _netConnected: boolean = false;
    private _maploaded: boolean = false;
    private _gameOver: boolean = false;
    private _netError: boolean = false;
    private _joinRoomFailTimes: number = 0;
    private _remoteFrame: number = 0;
    private _logLevel: number = 1;

    private _mapData = {rows: 30, cols: 40, gridWid: 20, gridHei: 20, players: null, items: null, teamLogoPos: {}};
    private _defaultTeamLogoPos = {0: {x: 0, y: 0}, 1: {x: -376, y: -271}, 2: {x: 376, y: -271}, 3: {x: -376, y: 271}, 4: {x: 10, y: 291}, 5: {x: 376, y: 271}};

    private onNetDisconnect() {
        if (this._logLevel >= 1) console.log("Net.onNetDisconnect");
        if (this._netError) return;
        this._netError = true;
        if (this.netErrorPanel.isShow == false) {
            this.netErrorPanel.showUI()
        }
    }

    private onNetReconnect() {
        if (this._logLevel >= 1) console.log("Net.onNetReconnect");
        if (this._netError) this._netError = false;
    }

    public setLogLevel(value: number) {
        this._logLevel = value;
        if (this._net) this._net.setLogLevel(value)
    }

    private onPushMsg(route: any, body: any) {
        if (route == "onJoin" || route == "onReplay") {
            this._mapData.rows = parseInt(body.row);
            this._mapData.cols = parseInt(body.column);
            this._mapData.gridWid = parseInt(body.cell_width);
            this._mapData.gridHei = parseInt(body.cell_height);
            this._mapData.players = body.players;
            this._mapData.items = body.items;
            this._mapData.teamLogoPos = body.icon_pos || this._defaultTeamLogoPos;
            this._netConnected = true;
            this._frameIndex = -1;
            this._factory.recoveryFrameData(this._frameDatas);
            this.checkGameReady();

        } else if (route == "onGameStop") {
            if (this._gameOver == false) {
                this._gameOver = true;
                if (this._logLevel >= 3) console.log("onGameStop.body = ", body);
                let data = {winner: body.winner, cd: body.next_count_down};
                this.settlementPanel.showUI(data, () => {});
            } else {
                if (this._logLevel >= 1) console.error("The game is over!");
            }

        } else if (route == "onPlayerJoin") {
            if (body.player_id) {
                this._map.createPlayer(-1, body.player_id + '', true);
            } else {
                if (this._logLevel >= 1) console.log("onPlayerJoin.body.player_id is null", body);
            }
            
        } else if (route == "onUpdate") {
            if (Base64) {
                let frameData = this._factory.createFrameData();
                let bytes: Uint8Array = Base64.toUint8Array(body.data);
                let dataView = new DataView(bytes.buffer);
                let offset = FrameData.parse(dataView, 0, frameData, this._factory);
                let getBigUint64func = dataView['getBigUint64'];
                if (getBigUint64func == null) {
                    if (this._logLevel >= 1) console.error("[ERROR] DataView.getBigUint64 function not found!");
                }
                if (this._frameIndex == -1) {
                    this._frameIndex = frameData.frame;
                    this.iconLayer.active = true;
                    for (let i = 0; i < frameData.playerCount; i++) {
                        let pd = frameData.players[i];
                        this._map.updatePlayer(pd.id, pd.x, pd.y, true);
                    }
                }
                this._remoteFrame = frameData.frame;
                this._frameDatas.push(frameData);
                if (DEBUG) {
                    if (this._logLevel >= 5) console.log("network frame: " + frameData.frame, ", bytes.length = ", offset + "/" + bytes.length);
                    if (this._logLevel >= 5) console.log("frameData: ", JSON.stringify(frameData));
                }
            } else {
                if (this._logLevel >= 1) console.error('Base64 not found!');
            }
        } else {
            if (this._logLevel >= 1) console.error("onPushMsg: todo route/body = ", route, body);
        }
    }

    private onRequestMsg(route, body) {
        if (DEBUG) { if (this._logLevel >= 3) console.log("onRequestMsg: route = ", route, ", route = ", body) };
    }

    private checkGameReady() {
        if (this._maploaded && this._netConnected) {
            if (this._gameOver) {
                this._gameOver = false;
                this._factory.recoveryFrameData(this._frameDatas);
                this.settlementPanel.closeUI();
            }
            this._frameIndex = -1;
            this.iconLayer.active = false;
            this._map.init(this._mapData.rows, this._mapData.cols, this._mapData.gridWid, this._mapData.gridHei);
            this._map.initItemAssets(this._mapData.items);
            this.updateIconPos();
            if (this._mapData.players && this._mapData.players.length > 0) {
                for (let i = 0; i < this._mapData.players.length; i++) {
                    this._map.createPlayer(-1, this._mapData.players[i].player_id + '', true);
                }
            } else {
                if (this._logLevel) console.warn("onJoin: players is null!");
            }
            this._frameDt = this._frameTime;
        }
    }

    private updateIconPos() {
        for (let i = 0; i < 6; i++) {
            let teamNode = this.teamLogo[i];
            let teamPos = this._mapData.teamLogoPos[i] || this._defaultTeamLogoPos[i];
            if (teamNode && teamPos) {
                teamNode.setPosition(teamPos.x, teamPos.y);
            }
        }
    }

    private onMapComplete() {
        this._maploaded = true;
        this.checkGameReady();    
    }

    private connectNetwork() {
        this._net.on(Network.Event.ON_PUSH, this.onPushMsg, this);
        this._net.on(Network.Event.ON_MSG, this.onRequestMsg, this);
        this._net.on(Network.Event.DISCONNECT, this.onNetDisconnect, this);
        this._net.on(Network.Event.RECONNECT, this.onNetReconnect, this);
        this._net.on(Network.Event.HEARTBEAT_TIMEOUT, this.onNetReconnect, this);
        let wsurl = wgame.game_ws_url
        let findex = window.location.href.indexOf('?');
        if (findex >= 0) {
            let url = window.location.href.substring(findex+1);
            if (url && url.length > 0) wsurl = url;
        }
        wsurl = wsurl || "ws://3.1.100.155:3250";
        this._net.init({
            url: wsurl,
            package: new TerritoryPackage(),
            message: new TerritoryMessage(),
            protocol: new TerritoryProtocol(),
            maxReconnectAttempts: 50,
            needSeedHandshake: true,
            reconnect: true,
            logLevel: this._logLevel,
        }, () => {
            this.joinRoom();
        });
        this._net.addLogRouteFilter("onUpdate");
    }

    private onGameJoinRes(data: any) {
        if (this._logLevel >= 3) console.log("request: data = ", data);
        if (data.code == 0) {
            this._joinRoomFailTimes = 0;
            this.netErrorPanel.closeUI();
        } else {
            this._joinRoomFailTimes += 1;
            setTimeout(() => {
                this.joinRoom()
            }, this._joinRoomFailTimes * 2000);
        }
    }

    public joinRoom() {
        this._net.request("game.join", {}, this.onGameJoinRes.bind(this));
    }

    onLoad() {
        if (DEBUG) this._logLevel = 5;
        let size = cc.view.getVisibleSize();
        this.uiCamera.orthoHeight = size.height / 2;
        this.iconLayer.active = false;
        this._net = new Network();
        this._factory = new DataFactory();
        wgame.setLogLevel = this.setLogLevel.bind(this);
        this._map = new Map(this.mapLayer, this.playerLayer, this.iconLayer, this.teamNodeTemp);
        this._map.on(Map.Event.LOAD_COMPLETE, this.onMapComplete, this);
        this._map.load();
        this.connectNetwork();
    }

    update(dt: number) {
        this._frameDt += dt;
        if (this._frameDt >= this._frameTime) {
            this._factory.exePreDelQueue();
            this._frameTime = 0;
            if (this._frameDatas.length > 0) {
                let fd = this._frameDatas[0];
                if (fd != null) {
                    if (fd.frame === this._frameIndex) {
                        fd = this._frameDatas.shift();
                        for (let i = 0; i < fd.mapData.length; i++) {
                            this._map.updateTerritory(i, fd.mapData[i]);
                        }
                        for (let i = 0; i < fd.players.length; i++) {
                            let p =  fd.players[i];
                            this._map.updatePlayer(p.id, p.x, p.y, true);
                        }
                        this._map.updateItems(fd.items);
                        this._factory.addFrameDataToPreRePool(fd);
                        if (DEBUG) {
                            if (this._logLevel >= 5) console.log("local frame = " + this._frameIndex + ", remote frame = " + this._remoteFrame, ", diff = ", (this._remoteFrame - this._frameIndex));
                        }
                        this._frameIndex += 1;
                    } else {
                        this._frameDatas.sort(this.frameSort.bind(this));
                    }
                }
            }
        }
    }

    private frameSort(a: FrameData, b: FrameData) {
        if (a.frame > b.frame) {
            return 1;
        } else if (a.frame < b.frame) {
            return -1;
        }
        return 0;
    }
}

