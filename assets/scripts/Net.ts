import { EventTarget } from "cc";

export default class Net extends EventTarget {
    public static Event = {
        PUSH_MSG: 'PUSH_MSG'
    }
    private _ws: WebSocket = null;

    constructor(url: string) {
        super()
        this._ws = new WebSocket(url);
        this._ws.binaryType = "arraybuffer";
        this._ws.onopen = this.onOpen.bind(this);
        this._ws.onmessage = this.onMessage.bind(this);
        this._ws.onerror = this.onError.bind(this);
        this._ws.onclose = this.onClose.bind(this);
    }

    private onOpen(ws: WebSocket, evt: Event) {
        console.log("ws.protocol = " + ws.protocol, ws.binaryType);
        // console.log("ws = ", ws);
        // console.log("evt = ", evt);
        
        var bytes = new ArrayBuffer(1);
        var dv = new DataView(bytes);
        dv.setUint8(0, 1);
        this._ws.send(dv.buffer);

        // this._ws.send("hello");
    }

    private onMessage(evt: MessageEvent) {
        if (evt.data as ArrayBuffer) {
            var dataView = new DataView(evt.data);
            var d = {
                id: dataView.getInt32(0),
                x: dataView.getFloat64(4),
                y: dataView.getFloat64(12)
            }
            console.log("kkkkk: ", d);
            this.emit(Net.Event.PUSH_MSG, d);
        } else {
            console.error("onMessage err, data = ", evt.data);
        }
    }

    private onError(evt: Event) {
        console.log("onError = ", evt);
    }

    private onClose(evt: CloseEvent) {
        console.log("onClose = ", evt);
    }
} 