import { EventTarget } from "cc";
import { DEBUG } from "cc/env";
import { PackageBase, MessageBase, ProtocolBase } from "./ProtocolBase";

var RES_OK = 200;
var RES_FAIL = 500;
var RES_OLD_CLIENT = 501;

export default class Network extends EventTarget {
    public static Event = {
        CLOSE: "close",                         // 关闭连接
        DISCONNECT: "disconnect",               // 与服务器断开连接
        RECONNECT :"reconnect",                 // 重连成功
        IO_ERROR: "io-error",                   // 网络连接错误
        RES_ERROR: "error",                     // 网络消息服务器处理错误、不支持旧客户端，如：重发
        HEARTBEAT_TIMEOUT: "heartbeat_timeout", // 心跳超时，会主动断开连接，需要处理网络问题
        ON_KICK: "onKick",                      // 服务器主动把玩家踢下线
        ON_MSG: "onMsg",                        // request返回消息
        ON_PUSH: "onPush",                      // 服务器推送消息
    };

    private _initCallback: Function = null;
    private _handshakeCallback: Function = null;

    /** 网络配置项 */
    /** 最大重连数 */
    private _maxReconnectAttempts: number = 3;
    /** 最大心跳超时次数，心跳时间超时时间等于心跳时间乘最大心跳超时次数 */
    private _maxHeartbeatTimeoutTimes: number = 2;
    private _gapThreshold: number = 100;
    /** 重连延迟时间，单位为毫秒 */
    private _reconnectionDelay: number = 1000 * 5;
    /** socket连接后是否需要发送握手协议 */
    private _needSeedHandshake: boolean = true;

    /** 重连url */
    private _reconnectUrl: string = null;
    /** 是否需要重新连接 */
    private _reconnect: boolean = false;
    /** 重复连接次数 */
    private _reconnectAttempts: number = 0;
    /** 重连timer */
    private _reconncetTimer: number = 0;

    private _socket: WebSocket = null;
    private _handlers: object = {};
    private _callbacks: object = {};
    private _reqId: number = 0;
    private _routeMap:object = {};
    private _dict = {};    // route string to code
    private _abbrs = {};   // code to route string

    /** 心跳相关运行时变量 */
    private _heartbeatId: number = 0;
    private _heartbeatTimeout: number = 0;
    private _heartbeatTimeoutId: number = -1;
    private _nextHeartbeatTimeout: number = 0;
    private _heartbeatInterval: number = 0;

    /** 编解码相关 */
    private _encode:Function = null;
    private _decode: Function = null;
    private _package: PackageBase = null;
    private _message: MessageBase = null;
    private _protocol: ProtocolBase = null;

    protected _logLevel: number = 0;
    protected _routeLogFilter = [];

    constructor() {
        super();
    }

    public setLogLevel(debug: number) {
        this._logLevel = debug;
        this._package.setLogLevel(this._logLevel);
        this._message.setLogLevel(this._logLevel);
    }

    public addLogRouteFilter(route: string) {
        this._routeLogFilter.push(route);
    }

    public get message() {
        return this._message;
    }

    public get protocol() {
        return this._protocol;
    }

    public get package() {
        return this._package;
    }

    /**
     * 
     * @param params
     * {
     *     host: 服务器地址
     *     port: 服务器端口
     *     reconnect: 是否需要重连
     *     protocol: 基础消息协议
     *     package: 发送服务器包协议
     *     message: 接受服务器消息协议
     *     encode: 
     *     decode: 
     *     handshakeCallback: 握手回调
     *     maxReconnectAttempts: 最大连接次数
     *     maxHeartbeatTimeoutTimes: 最大心跳超时次数，心跳时间超时时间等于心跳时间乘最大心跳超时次数, 默认值是2
     *     heartbeatTriggerMode： 心跳触发方式, 0： 服务器触发 1：客户端触发， 默认值是0
     *     needSeedHandshake: socket连接后是否需要发送握手协议, 默认不发握手协议
     *     logLevel: 日志级别
     * }
     * @param cb 
     */
    public init(params, cb?)
    {
        this._initCallback = cb;
        this._package = params.package;
        this._message = params.message;
        this._protocol = params.protocol;
        this._logLevel = params.logLevel || this._logLevel;

        if (this._package == null || this._message == null || this._protocol == null) {
            if (this._logLevel >= 1) console.error("Network: init fail, please protocol instance.");
            return;
        }

        this._protocol.owner = this;
        this._message.owner = this;
        this._package.owner = this;
        this._protocol.setLogLevel(this._logLevel);
        this._package.setLogLevel(this._logLevel);
        this._message.setLogLevel(this._logLevel);
        
        this._encode = params.encode || this.defaultEncode;
        this._decode = params.decode || this.defaultDecode;

        this._maxReconnectAttempts = params.maxReconnectAttempts || this._maxReconnectAttempts;
        this._maxHeartbeatTimeoutTimes = params.maxHeartbeatTimeoutTimes || this._maxHeartbeatTimeoutTimes;
        if (params.needSeedHandshake != undefined) {
            this._needSeedHandshake = params.needSeedHandshake;
        }
        this._reqId = 0;    
        this._handshakeCallback = params.handshakeCallback;

        this.connect(params, params.url, cb);
    };

    private connect(params, url, cb)
    {
        if (DEBUG) { if (this._logLevel >= 3) console.info('Network.connect: url = ' + url); }
        this._reconnectUrl = url;
        var _params = params || {};
        let self = this;
        let onClose = function(event) {
            self.emit(Network.Event.CLOSE, event);
            self.emit(Network.Event.DISCONNECT, event);
            if (this._logLevel >= 1) console.error('Network.onClose: reconnect = ', _params.reconnect + ', reconnect time = ' +  Math.ceil(self._reconnectionDelay / 1000));
            if(_params.reconnect && self._reconnectAttempts < self._maxReconnectAttempts) {
                self._reconnect = true;
                self._reconnectAttempts++;
                self._reconncetTimer = setTimeout(function() {
                    self.connect(_params, self._reconnectUrl, cb);
                }, self._reconnectionDelay);
                self._reconnectionDelay *= 2;
            }
        }

        this.initHandlers();

        // Init WebSocket
        this._socket = new WebSocket(url);
        this._socket.binaryType = 'arraybuffer';
        this._socket.onopen = this.onOpen.bind(this);
        this._socket.onmessage = this.onMessage.bind(this);
        this._socket.onerror = this.onError.bind(this);
        this._socket.onclose = onClose;
    };

    private initHandlers()
    {
        this._handlers[this._package.TYPE_HANDSHAKE] = this.handshake.bind(this);
        this._handlers[this._package.TYPE_HEARTBEAT] = this.heartbeat.bind(this);
        this._handlers[this._package.TYPE_DATA] = this.onData.bind(this);
        this._handlers[this._package.TYPE_KICK] = this.onKick.bind(this);
    }

    public request(route: string, msg: any, cb?)
    {
        if(arguments.length === 2 && typeof msg === 'function') {
            cb = msg;
            msg = {};
        } else {
            msg = msg || {};
        }

        route = route || msg.route;
        if(!route) {
            return;
        }
    
        this._reqId++;
        this.sendMessage(this._reqId, route, msg);
    
        this._callbacks[this._reqId] = cb;
        this._routeMap[this._reqId] = route;
    };
    
    public notify(route: string, msg: any)
    {
        msg = msg || {};
        this.sendMessage(0, route, msg);
    };
    
    private sendMessage(reqId: number, route: string, msg: any)
    {
        if (DEBUG) { if (this._logLevel >= 3) console.log(`Network.sendMessage: reqId = ${reqId}, route = ${route}, msg = ${JSON.stringify(msg)}`); }
        if(this._encode) {
            msg = this._encode(reqId, route, msg);
        }
        var packet = this._package.encode(this._package.TYPE_DATA, msg);
        this.send(packet);
    }; 

    public disconnect()
    {
        if(this._socket) {
            let socket = this._socket;
            if(socket['disconnect']) socket['disconnect']();
            if(socket.close) socket.close();
            if (DEBUG) { if (this._logLevel >= 3) console.info('Network: disconnect') };
            this._socket = null;
        }
    
        if(this._heartbeatId > 0) {
            clearTimeout(this._heartbeatId);
            this._heartbeatId = 0;
        }

        if(this._heartbeatTimeoutId > -1) {
            clearTimeout(this._heartbeatTimeoutId);
            this._heartbeatTimeoutId = -1;
        }
    };

    private onOpen()
    {
        if (DEBUG) { if (this._logLevel >= 3) console.log("Network.onOpen: ws open"); }
        if(this._reconnect == true) {
            this.emit(Network.Event.RECONNECT);
        }
        this.reset();
        if (this._needSeedHandshake == true) {
            if (DEBUG) { if (this._logLevel >= 4) console.log("Network.onOpen: send handshake"); }
            var pck = this._package.encode(this._package.TYPE_HANDSHAKE, this._package.strencode(JSON.stringify(this._package.handshakeBuffer)));
            this.send(pck.buffer);
        }
    }

    private reset()
    {
        this._reconnect = false;
        this._reconnectionDelay = 1000 * 5;
        this._reconnectAttempts = 0;
        if (this._reconncetTimer > 0) {
            clearTimeout(this._reconncetTimer);
            this._reconncetTimer = 0;
        }
    };

    private onMessage(evt: MessageEvent)
    {
        // if (this._logLevel) console.info("Network.onMessage: ", evt.data);
        this.processPackage(this._package.decode(evt.data));
        // new package arrived, update the heartbeat timeout
        if (this._heartbeatTimeout) {
            this._nextHeartbeatTimeout = Date.now() + this._heartbeatTimeout;
        }
    }

    private onError()
    {
        this.emit(Network.Event.IO_ERROR);
        if (this._logLevel >= 1) console.error('Network.onError: io-error');
    }

    private send(buffer: ArrayBuffer)
    {
        if (this._socket) {
            this._socket.send(buffer);
        }
    }

    private processPackage(msgs)
    {
        if (msgs == null) {
            if (DEBUG) { if (this._logLevel >= 1) console.error("Network.processPackage: msgs is null!"); }
            return;
        }
        // if (this._logLevel) console.log(`Network.processPackage: type = ${msgs.type}`);
        if (Array.isArray(msgs)) {
            for(var i = 0; i < msgs.length; i++) {
                let msg = msgs[i];
                let type = this._package.getPckType(msg)
                let handler = this._handlers[type];
                if (handler != null) {
                    let body = this._package.getPckBody(msg);
                    handler(body);
                } else {
                    if (DEBUG) { if (this._logLevel >= 2) console.warn("Network.processPackage.Array: handler not found, type = " + msg.type); }
                }
            }
        } else {
            let type = this._package.getPckType(msgs)
            let handler = this._handlers[type];
            if (handler != null) {
                let body = this._package.getPckBody(msgs);
                handler(body);
            } else {
                if (DEBUG) { if (this._logLevel >= 2) console.warn("Network.processPackage: handler not found, type = " + msgs.type); }
            }
        }
    };

    private processMessage(msg)
    {
        if (DEBUG) {
            if (this._logLevel >= 3) {
                if (this._routeLogFilter.indexOf(msg.route) < 0) {
                    console.log(`Network.processMessage: msg.type = ${msg.type}, msg.id = ${msg.id}, msg.route = ${msg.route},  msg.body = ${JSON.stringify(msg.body)}`);
                }
            } else if (this._logLevel >= 6) {
                console.log(`Network.processMessage: msg.type = ${msg.type}, msg.id = ${msg.id}, msg.route = ${msg.route},  msg.body = ${JSON.stringify(msg.body)}`);
            }
        }
        if (!msg.id) {
            this.emit(Network.Event.ON_PUSH, msg.route, msg.body);
            return;
        }
        var cb = this._callbacks[msg.id];
        delete this._callbacks[msg.id];
        if(typeof cb !== 'function') return;
        cb(msg.body);
        this.emit(Network.Event.ON_MSG, msg.route, msg);
    };

    public heartbeat()
    {
        if(this._heartbeatInterval <= 0) {
            return;
        }
    
        if(this._heartbeatTimeoutId) {
            clearTimeout(this._heartbeatTimeoutId);
            this._heartbeatTimeoutId = 0;
        }
    
        if(this._heartbeatId) {
            return;
        }

        var pck = this._package.encode(this._package.TYPE_HEARTBEAT);
        this._heartbeatId = setTimeout(() => {
            this._heartbeatId = 0;
            if (DEBUG) { if (this._logLevel >= 4) console.log("Network.heartbeat: send handshake"); }
            this.send(pck.buffer);
            this._nextHeartbeatTimeout = Date.now() + this._heartbeatTimeout;
            this._heartbeatTimeoutId = setTimeout(this.heartbeatTimeoutCb.bind(this), this._heartbeatTimeout);
        }, this._heartbeatInterval);
    };

    private heartbeatTimeoutCb()
    {
        var gap = this._nextHeartbeatTimeout - Date.now();
        if(gap > this._gapThreshold) {
            this._heartbeatTimeoutId = setTimeout(this.heartbeatTimeoutCb.bind(this), gap);
        } else {
            this.emit(Network.Event.HEARTBEAT_TIMEOUT);
            if (this._logLevel >= 1) console.error('Network: heartbeat timeout');
            this.disconnect();
        }
    };

    private handshake(data: ArrayBuffer | any)
    {
        let s = this._protocol.strdecode(data);
        let d: any = JSON.parse(s);

        if (DEBUG) { if (this._logLevel >= 3) console.log("Network.handshake: data = " + s); }
        if (d.code === RES_OLD_CLIENT) {
            this.emit(Network.Event.RES_ERROR, d.code, 'client version old!');
            if (this._logLevel >= 1) console.error('Network: client version old!');
            return;
        }
    
        if (d.code !== RES_OK) {
            this.emit(Network.Event.RES_ERROR, d.code, 'handshake fail!');
            if (DEBUG) { if (this._logLevel >= 1) console.error('Network: handshake fail!'); };
            return;
        }
    
        this.handshakeInit(d);
    
        if (DEBUG) { if (this._logLevel >= 4) console.log("Network.handshake: send handshake_ack"); }
        var obj = this._package.encode(this._package.TYPE_HANDSHAKE_ACK);
        this.send(obj.buffer);

        if(this._initCallback) {
            this._initCallback(this);
        }
    };

    private handshakeInit(data: any)
    {
        if(data.sys && data.sys.heartbeat) {
            this._heartbeatInterval = data.sys.heartbeat * 1000;    // heartbeat interval
            this._heartbeatTimeout = this._heartbeatInterval * this._maxHeartbeatTimeoutTimes;   // max heartbeat timeout
        } else {
            this._heartbeatInterval = 0;
            this._heartbeatTimeout = 0;
        }
    
        this.initData(data);
    
        if(this._handshakeCallback instanceof Function) {
            this._handshakeCallback(data.user);
        }
    };

    private initData(data: any)
    {
        if(!data || !data.sys) {
          return;
        }

        let dict = data.sys.dict;
        if (dict) {
            this._dict = dict;
            this._abbrs = {};
            for(var route in dict) {
                this._abbrs[dict[route]] = route;
            }
        }
    };

    private onData(data: any)
    {
        var msg = data;
        if(this._decode) msg = this._decode(msg);
        this.processMessage(msg);
    };
    
    private onKick(data: any) {
        this.emit(Network.Event.ON_KICK, data);
    };

    private defaultEncode(reqId, route, msg)
    {
        var type = reqId ? this._message.TYPE_REQUEST : this._message.TYPE_NOTIFY;
        msg = this._protocol.strencode(JSON.stringify(msg));

        var compressRoute = 0;
        if(this._dict && this._dict[route]) {
            route = this._dict[route];
            compressRoute = 1;
        }

        return this._message.encode(reqId, type, compressRoute, route, msg);
    }

    private defaultDecode(data)
    {
        var msg = this._message.decode(data);
        if (msg.id > 0) {
            msg.route = this._routeMap[msg.id];
            delete this._routeMap[msg.id];
            if(!msg.route) {
                return;
            }
        }
        msg.body = this.deCompose(msg);
        return msg;
    }

    private deCompose(msg: any) {
        var route = msg.route;
        if(msg.compressRoute) {
            if(!this._abbrs[route]){
                return {};
            }
            route = msg.route = this._abbrs[route];
        }
        let s = this._protocol.strdecode(msg.body);
        return JSON.parse(s);
    };

    public emit(msg: string, param1 = null, param2 = null)
    {
        super.emit(msg, param1, param2);
    }
}