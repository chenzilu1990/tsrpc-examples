
import { MapType } from "./map/base/MapType";
import MapLayer from "./map/layer/MapLayer";
import EntityLayer from "./map/layer/EntityLayer";
import Charactor from "./map/charactor/Charactor";
import RoadNode from "./map/road/RoadNode";
import IRoadSeeker from "./map/road/IRoadSeeker";
import MapData from "./map/base/MapData";
import MapRoadUtils from "./map/road/MapRoadUtils";
import AstarHoneycombRoadSeeker from "./map/road/AstarHoneycombRoadSeeker";
import AStarRoadSeeker from "./map/road/AStarRoadSeeker";
import Point from "./map/road/Point";
import { MapLoadModel } from "./map/base/MapLoadModel";
import MapParams from "./map/base/MapParams";

// Learn TypeScript:
//  - [Chinese] https://docs.cocos.com/creator/manual/zh/scripting/typescript.html
//  - [English] http://www.cocos2d-x.org/docs/creator/manual/en/scripting/typescript.html
// Learn Attribute:
//  - [Chinese] https://docs.cocos.com/creator/manual/zh/scripting/reference/attributes.html
//  - [English] http://www.cocos2d-x.org/docs/creator/manual/en/scripting/reference/attributes.html
// Learn life-cycle callbacks:
//  - [Chinese] https://docs.cocos.com/creator/manual/zh/scripting/life-cycle-callbacks.html
//  - [English] http://www.cocos2d-x.org/docs/creator/manual/en/scripting/life-cycle-callbacks.html
import { BaseWsClient } from 'tsrpc-base-client';
import { WsClient as WsClientBrowser } from 'tsrpc-browser';
import { serviceProto, ServiceType } from '../scripts/shared/protocols/serviceProto';
import { GameManager } from '../scripts/models/GameManager';
import { ClientInput } from "../scripts/shared/protocols/client/MsgClientInput";
const { ccclass, property } = cc._decorator;

/**
 * 地图场景逻辑
 * @author 落日故人 QQ 583051842
 * 
 */
@ccclass
export default class SceneMap extends cc.Component {

    private targetX: number = 0
    private targetY: number = 0

    @property(cc.Node)
    public layer: cc.Node = null;

    @property(MapLayer)
    public mapLayer: MapLayer = null;

    @property(EntityLayer)
    public entityLayer: EntityLayer = null;

    @property(Charactor)
    private player: Charactor = null;

    @property(cc.Camera)
    private camera: cc.Camera = null;

    @property(cc.Prefab)
    private prefabPlayer: cc.Prefab

    @property(cc.Node)
    private enetityLayer: cc.Node = null

    @property()
    public isFollowPlayer: boolean = true;

    private _roadDic: { [key: string]: RoadNode } = {};

    private _roadSeeker: IRoadSeeker;

    private targetPos: cc.Vec2 = cc.Vec2.ZERO;

    //private _mapData:MapData = null;

    private _mapParams: MapParams = null;

    private _playerInstances: { [playerId: number]: Charactor | undefined } = {};

    // LIFE-CYCLE CALLBACKS:
    client!: BaseWsClient<ServiceType>;
    gameManager!: GameManager;
    static instance: SceneMap = null;
    onLoad() {

        this.gameManager = new GameManager();
        // 监听数据状态事件
        // 新箭矢发射（仅表现）
        // this.gameManager.gameSystem.onNewArrow.push(v => { this._onNewArrow(v) });

        // 断线 2 秒后自动重连
        // this.gameManager.client.flows.postDisconnectFlow.push(v => {
        //     setTimeout(() => {
        //         this.gameManager.join();
        //     }, 2000)
        //     return v;
        // });

        this.gameManager.join();

        SceneMap.instance = this

        
        var manager = cc.director.getCollisionManager();
        manager.enabled = true
        manager.enabledDebugDraw = true


    }


    playBGM() {

        cc.resources.load("map/BGM/" + this._mapParams.name, cc.AudioClip, (err: Error, clip: cc.AudioClip) => {
            cc.log(err, clip)
            if (err) return
            cc.audioEngine.playMusic(clip, true)

        })
    }

    start() {

        this.node.x = -cc.winSize.width / 2;
        this.node.y = -cc.winSize.height / 2;

        // this.player.sceneMap = this;
        this.node.on(cc.Node.EventType.TOUCH_START, this.onMapMouseDown, this);
    }

    public init(mapData: MapData, bgTex: cc.Texture2D, mapLoadModel: MapLoadModel = 1) {
 
        //this._mapData = mapData;

        MapRoadUtils.instance.updateMapInfo(mapData.mapWidth, mapData.mapHeight, mapData.nodeWidth, mapData.nodeHeight, mapData.type);

        //初始化底图参数
        this._mapParams = new MapParams();
        this._mapParams.name = mapData.name;
        this._mapParams.bgName = mapData.bgName;
        this._mapParams.mapType = mapData.type;
        this._mapParams.mapWidth = mapData.mapWidth;
        this._mapParams.mapHeight = mapData.mapHeight;
        this._mapParams.ceilWidth = mapData.nodeWidth;
        this._mapParams.ceilHeight = mapData.nodeHeight;

        this._mapParams.viewWidth = mapData.mapWidth > cc.winSize.width ? cc.winSize.width : mapData.mapWidth;
        this._mapParams.viewHeight = mapData.mapHeight > cc.winSize.height ? cc.winSize.height : mapData.mapHeight;
        this._mapParams.sliceWidth = 256;
        this._mapParams.sliceHeight = 256;
        this._mapParams.bgTex = bgTex;
        this._mapParams.mapLoadModel = mapLoadModel;

        this.mapLayer.init(this._mapParams);
    
        var len: number = mapData.roadDataArr.length;
        var len2: number = mapData.roadDataArr[0].length;
        
        var value: number = 0;
        var dx: number = 0;
        var dy: number = 0;

        for (var i: number = 0; i < len; i++) {
            for (var j: number = 0; j < len2; j++) {
                value = mapData.roadDataArr[i][j];
                dx = j;
                dy = i;
                
                var node: RoadNode = MapRoadUtils.instance.getNodeByDerect(dx, dy);
                node.value = value;

                this._roadDic[node.cx + "_" + node.cy] = node;
            }
        }

        if (mapData.type == MapType.honeycomb) {
            this._roadSeeker = new AstarHoneycombRoadSeeker(this._roadDic)
        } else {
            this._roadSeeker = new AStarRoadSeeker(this._roadDic);
        }

        this.node.width = this.mapLayer.width;
        this.node.height = this.mapLayer.height;

        this.setViewToPlayer();
        this.playBGM()

    }

    public getMapNodeByPixel(px: number, py: number): RoadNode {
        var point: Point = MapRoadUtils.instance.getWorldPointByPixel(px, py);
        
        var node: RoadNode = this._roadDic[point.x + "_" + point.y];
        
        return node;
    }


    public onMapMouseDown(event: cc.Event.EventTouch): void {
        //var pos = this.node.convertToNodeSpaceAR(event.getLocation());
        var pos = this.camera.node.position.add(event.getLocation());

        this.movePlayer(pos.x, pos.y);

    }

    /**
     * 视图跟随玩家
     * @param dt 
     */
    public followPlayer(dt: number) {
        this.targetPos = this.player.node.position.sub(cc.v2(cc.winSize.width / 2, cc.winSize.height / 2));

        if (this.targetPos.x > this._mapParams.mapWidth - cc.winSize.width) {
            this.targetPos.x = this._mapParams.mapWidth - cc.winSize.width;
        } else if (this.targetPos.x < 0) {
            this.targetPos.x = 0;
            
        }    

        if (this.targetPos.y > this._mapParams.mapHeight - cc.winSize.height) {
            this.targetPos.y = this._mapParams.mapHeight - cc.winSize.height;
        } else if (this.targetPos.y < 0) {
            this.targetPos.y = 0;
        }
        

        //摄像机平滑跟随
        this.camera.node.position.lerp(this.targetPos, dt * 2.0, this.targetPos);
        this.camera.node.position = this.targetPos;

        if (this._mapParams.mapLoadModel == MapLoadModel.slices) {
            this.mapLayer.loadSliceImage(this.targetPos.x, this.targetPos.y);
        }
        
    }

    /**
        *移到玩家 
        * @param targetX 移动到的目标点x
        * @param targetY 移到到的目标点y
        * 
        */	
    public movePlayer(targetX: number, targetY: number) {
        let input: ClientInput = {
            type: 'PlayerTarget',
            x: targetX,
            y: targetY,
        }
        this.gameManager.sendClientInput(input)
        // this.movePlayer2(targetX, targetY, this.player)

    }

    public movePlayer2(targetX: number, targetY: number, player: Charactor) {
        if (player.targetX == targetX && player.targetY == targetY) return
        var startPoint: Point = MapRoadUtils.instance.getWorldPointByPixel(player.node.x, player.node.y);
        var targetPoint: Point = MapRoadUtils.instance.getWorldPointByPixel(targetX, targetY);

        var startNode: RoadNode = this._roadDic[startPoint.x + "_" + startPoint.y];
        var targetNode: RoadNode = this._roadDic[targetPoint.x + "_" + targetPoint.y];

        var roadNodeArr: RoadNode[] = this._roadSeeker.seekPath(startNode, targetNode); //点击到障碍点不会行走
        //var roadNodeArr:RoadNode[] = this._roadSeeker.seekPath2(startNode,targetNode);  //点击到障碍点会行走到离障碍点最近的可走路点

        if (roadNodeArr.length > 0) {
            player.walkByRoad(roadNodeArr);
        }
        player.targetX = targetX
        player.targetY = targetY
    }

    /**
     *把视野定位到给定位置 
    * @param px
    * @param py
    * 
    */		
    public setViewToPoint(px: number, py: number): void {
        this.targetPos = cc.v2(px, py).sub(cc.v2(cc.winSize.width / 2, cc.winSize.height / 2));

        if (this.targetPos.x > this._mapParams.mapWidth - cc.winSize.width) {
            this.targetPos.x = this._mapParams.mapWidth - cc.winSize.width;
        } else if (this.targetPos.x < 0) {
            this.targetPos.x = 0;
            
        }    

        if (this.targetPos.y > this._mapParams.mapHeight - cc.winSize.height) {
            this.targetPos.y = this._mapParams.mapHeight - cc.winSize.height;
        } else if (this.targetPos.y < 0) {
            this.targetPos.y = 0;
        }
        
        this.camera.node.position = this.targetPos;
        
        if (this._mapParams.mapLoadModel == MapLoadModel.slices) {
            this.mapLayer.loadSliceImage(this.targetPos.x, this.targetPos.y);
        }
    }
    
    /**
     * 将视野对准玩家
     */
    public setViewToPlayer(): void {
        if (!this.player) return
        this.setViewToPoint(this.player.node.x, this.player.node.y);
    }


    update(dt) {
        if (this.isFollowPlayer) {
            if (this.player) {
                // cc.log("fjksd=======")
                this.followPlayer(dt);
            }
            //this.camera.node.position = this.player.node.position.sub(cc.v2(cc.winSize.width / 2,cc.winSize.height / 2));
        }
        this._updatePlayers();
    }

    private _updatePlayers() {
        // Update pos
        let playerStates = this.gameManager.state.players;
        for (let playerState of playerStates) {
            let player = this._playerInstances[playerState.id];
            // 场景上还没有这个 Player，新建之
            if (!player) {
                cc.log(playerState)
                let node = cc.instantiate(this.prefabPlayer);
                this.enetityLayer.addChild(node);
                player = this._playerInstances[playerState.id] = node.getComponent(Charactor)!;
                player.init(playerState, playerState.id === this.gameManager.selfPlayerId)

                // 摄像机拍摄自己
                cc.log(playerState.id, this.gameManager.selfPlayerId)
                if (playerState.id === this.gameManager.selfPlayerId) {
                    // this.camera.focusTarget = node;
                    this.player = player
                }
            }

            // 根据最新状态，更新 Player 表现组件
            player.updateState(playerState, this.gameManager.state.now);
            if (playerState.isImmediately){

                player.setTargetPos(playerState.pos.x, playerState.pos.y)
            } else {
                
                this.movePlayer2(playerState.targetX, playerState.targetY, player)
            }
        }

        // Clear left players
        // for (let i = this.enetityLayer.children.length - 1; i > -1; --i) {
        //     let player = this.enetityLayer.children[i].getComponent(Charactor)!;
        //     if (!this.gameManager.state.players.find(v => v.id === player.playerId)) {
        //         player.node.removeFromParent();
        //         delete this._playerInstances[player.playerId];
        //     }
        // }
    }


}
