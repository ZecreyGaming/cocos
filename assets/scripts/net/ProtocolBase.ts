import Network from "./Network";

export var copyByteArray = function(dest: Uint8Array, doffset: number, src: Uint8Array, soffset: number, length: number) {
    for(var index = 0; index < length; index++){
        dest[doffset++] = src[soffset++];
    }
}

export class ProtocolBase {
    public owner: Network = null;
    protected _logLevel: number = 0;

    public setLogLevel(value: number) {
        this._logLevel = value;
    }

    public strencode(str: string) {
        var byteArray = new Uint8Array(str.length * 3);
        var offset = 0;
        for(var i = 0; i < str.length; i++){
            var charCode = str.charCodeAt(i);
            var codes = null;
            if(charCode <= 0x7f){
                codes = [charCode];
            }else if(charCode <= 0x7ff){
                codes = [0xc0|(charCode>>6), 0x80|(charCode & 0x3f)];
            }else{
                codes = [0xe0|(charCode>>12), 0x80|((charCode & 0xfc0)>>6), 0x80|(charCode & 0x3f)];
            }
            for(var j = 0; j < codes.length; j++){
                byteArray[offset] = codes[j];
                ++offset;
            }
        }
        var _buffer = new Uint8Array(offset);
        copyByteArray(_buffer, 0, byteArray, 0, offset);
        return _buffer;
    }

    public strdecode(buffer: ArrayBuffer) {
        var bytes = new Uint8Array(buffer);
        var array = [];
        var offset = 0;
        var charCode = 0;
        var end = bytes.length;
        while(offset < end){
          if(bytes[offset] < 128){
            charCode = bytes[offset];
            offset += 1;
          }else if(bytes[offset] < 224){
            charCode = ((bytes[offset] & 0x3f)<<6) + (bytes[offset+1] & 0x3f);
            offset += 2;
          }else{
            charCode = ((bytes[offset] & 0x0f)<<12) + ((bytes[offset+1] & 0x3f)<<6) + (bytes[offset+2] & 0x3f);
            offset += 3;
          }
          array.push(charCode);
        }
        return String.fromCharCode.apply(null, array);
    }
}

export class PackageBase {
    public TYPE_HANDSHAKE: number = 1;
    public TYPE_HANDSHAKE_ACK: number = 2;
    public TYPE_HEARTBEAT: number = 3;
    public TYPE_DATA: number = 4;
    public TYPE_KICK: number = 5;

    public PKG_HEAD_BYTES: number = 4;

    public JS_WS_CLIENT_TYPE = 'js-websocket';
    public JS_WS_CLIENT_VERSION = '0.0.1';

    public owner: Network = null;
    protected _logLevel: number = 0;

    public handshakeBuffer = {
        sys: {
            type: this.JS_WS_CLIENT_TYPE,
            version: this.JS_WS_CLIENT_VERSION,
        },
        user: {},
    };

    public setLogLevel(value: number) {
        this._logLevel = value;
    }

    public getPckType(pck) {
        return pck.type;
    }

    public getPckBody(pck) {
        return pck.body;
    }

    public strencode(str: string): Uint8Array {
        var byteArray = new Uint8Array(str.length * 3);
        var offset = 0;
        for(var i = 0; i < str.length; i++) {
            var charCode = str.charCodeAt(i);
            var codes = null;
            if(charCode <= 0x7f){
                codes = [charCode];
            } else if (charCode <= 0x7ff){
                codes = [0xc0 | (charCode>>6), 0x80|(charCode & 0x3f)];
            } else {
                codes = [0xe0 | (charCode>>12), 0x80|((charCode & 0xfc0)>>6), 0x80|(charCode & 0x3f)];
            }
            for(var j = 0; j < codes.length; j++){
                byteArray[offset] = codes[j];
                ++offset;
            }
        }
        var _buffer = new Uint8Array(offset);
        copyByteArray(_buffer, 0, byteArray, 0, offset);
        return _buffer;
    }

    public encode(type: number, body: Uint8Array = null): Uint8Array {
        var length = body ? body.length : 0;
        var buffer = new Uint8Array(this.PKG_HEAD_BYTES + length);
        var index = 0;
        buffer[index++] = type & 0xff;
        buffer[index++] = (length>>16) & 0xff;
        buffer[index++] = (length>>8) & 0xff;
        buffer[index++] = length & 0xff;
        if (body) {
            copyByteArray(buffer, index, body, 0, length);
        }
        return buffer;
    }

    public decode(buffer: ArrayBuffer): any {
        var offset = 0;
        var bytes = new Uint8Array(buffer);
        var length = 0;
        var rs = [];
        while(offset < bytes.length) {
            var type = bytes[offset++];
            length = ((bytes[offset++]) << 16 | (bytes[offset++]) << 8 | bytes[offset++]) >>> 0;
            var body = length ? new Uint8Array(length) : null;
            copyByteArray(body, 0, bytes, offset, length);
            offset += length;
            rs.push({'type': type, 'body': body});
        }
        return rs.length === 1 ? rs[0]: rs;
    }
}

export class MessageBase {
    public TYPE_REQUEST: number = 0;
    public TYPE_NOTIFY: number = 1;
    public TYPE_RESPONSE: number = 2;
    public TYPE_PUSH: number = 3;

    public MSG_FLAG_BYTES = 1;
    public MSG_ROUTE_CODE_BYTES = 2;
    public MSG_ROUTE_LEN_BYTES = 1;

    public MSG_ROUTE_CODE_MAX = 0xffff;
    public MSG_COMPRESS_ROUTE_MASK = 0x1;
    public MSG_TYPE_MASK = 0x7;

    public owner: Network = null;
    protected _logLevel: number = 0;

    public setLogLevel(value: number) {
        this._logLevel = value;
    }

    public getMsgBody(body) {
        return body.msg;
    }

    public msgHasId(type: number) {
        return type === this.TYPE_REQUEST || type === this.TYPE_RESPONSE;
    };

    public encodeMsgId(id: number, buffer, offset: number) {
        do {
            var tmp = id % 128;
            var next = Math.floor(id / 128);
            if(next !== 0){
                tmp = tmp + 128;
            }
            buffer[offset++] = tmp;
            id = next;
        } while(id !== 0);
        return offset;
    };

    public caculateMsgIdBytes(id: number) {
        var len = 0;
        do {
          len += 1;
          id >>= 7;
        } while(id > 0);
        return len;
    };

    public msgHasRoute(type: number) {
        return type === this.TYPE_REQUEST || type === this.TYPE_NOTIFY || type === this.TYPE_PUSH;
    };

    public encodeMsgFlag(type: number, compressRoute: number, buffer: Uint8Array, offset: number) {
        if(type !== this.TYPE_REQUEST && type !== this.TYPE_NOTIFY &&
            type !== this.TYPE_RESPONSE && type !== this.TYPE_PUSH) {
            throw new Error('MessageBase.encodeMsgFlag: unkonw message type = ' + type);
        }
        buffer[offset] = (type << 1) | (compressRoute ? 1 : 0);
        return offset + this.MSG_FLAG_BYTES;
    }

    public encodeMsgBody(msg, buffer, offset) {
        copyByteArray(buffer, offset, msg, 0, msg.length);
        return offset + msg.length;
    };

    public encodeMsgRoute(compressRoute, route, buffer, offset) {
        if (compressRoute) {
            if(route > this.MSG_ROUTE_CODE_MAX){
                throw new Error('MessageBase.encodeMsgRoute: route number is overflow');
            }
            buffer[offset++] = (route >> 8) & 0xff;
            buffer[offset++] = route & 0xff;
        } else {
            if(route) {
                buffer[offset++] = route.length & 0xff;
                copyByteArray(buffer, offset, route, 0, route.length);
                offset += route.length;
            } else {
                buffer[offset++] = 0;
            }
        }
        return offset;
    }

    public encode(id: number, type: number, compressRoute: number, route, msg){
        // caculate message max length
        var idBytes = this.msgHasId(type) ? this.caculateMsgIdBytes(id) : 0;
        var msgLen = this.MSG_FLAG_BYTES + idBytes;
    
        if(this.msgHasRoute(type)) {
            if(compressRoute) {
                if(typeof route !== 'number'){
                    throw new Error('MessageBase.encode: error flag for number route!');
                }
                msgLen += this.MSG_ROUTE_CODE_BYTES;
            } else {
                msgLen += this.MSG_ROUTE_LEN_BYTES;
                if(route) {
                    route = this.owner.protocol.strencode(route);
                    if(route.length > 255) {
                        throw new Error('MessageBase.encode: route maxlength is overflow');
                    }
                    msgLen += route.length;
                }
            }
        }
    
        if(msg) {
            msgLen += msg.length;
        }
    
        var buffer = new Uint8Array(msgLen);
        var offset = 0;
    
        // add flag
        offset = this.encodeMsgFlag(type, compressRoute, buffer, offset);
    
        // add message id
        if(this.msgHasId(type)) {
            offset = this.encodeMsgId(id, buffer, offset);
        }
    
        // add route
        if(this.msgHasRoute(type)) {
          offset = this.encodeMsgRoute(compressRoute, route, buffer, offset);
        }
    
        // add body
        if(msg) {
          offset = this.encodeMsgBody(msg, buffer, offset);
        }
    
        return buffer;
    };

    public decode(buffer: ArrayBuffer) {
        var bytes =  new Uint8Array(buffer);
        var bytesLen = bytes.length || bytes.byteLength;
        var offset = 0;
        var id = 0;
        var route = null;
    
        // parse flag
        var flag = bytes[offset++];
        var compressRoute = flag & this.MSG_COMPRESS_ROUTE_MASK;
        var type = (flag >> 1) & this.MSG_TYPE_MASK;
    
        // parse id
        if(this.msgHasId(type)) {
            var m = parseInt(bytes[offset].toString());
            var i = 0;
            do{
                var m = parseInt(bytes[offset].toString());
                id = id + ((m & 0x7f) * Math.pow(2,(7*i)));
                offset++;
                i++;
            } while(m >= 128);
        }
    
        // parse route
        if(this.msgHasRoute(type)) {
            if(compressRoute) {
                route = (bytes[offset++]) << 8 | bytes[offset++];
            } else {
                var routeLen = bytes[offset++];
                if(routeLen) {
                    route = new Uint8Array(routeLen);
                    copyByteArray(route, 0, bytes, offset, routeLen);
                    route = this.owner.protocol.strdecode(route);
                } else {
                    route = '';
                }
                offset += routeLen;
            }
        }
    
        // parse body
        var bodyLen = bytesLen - offset;
        var body = new Uint8Array(bodyLen);
    
        copyByteArray(body, 0, bytes, offset, bodyLen);
    
        return {'id': id, 'type': type, 'compressRoute': compressRoute, 'route': route, 'body': body};
      }
}