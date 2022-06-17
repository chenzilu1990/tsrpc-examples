import MovieClip from "./MovieClip";
import RoadNode from "../road/RoadNode";
import SceneMap from "../../SceneMap";
import { PlayerState , RoleState} from "../../../scripts/shared/game/state/PlayerState";

// Learn TypeScript:
//  - [Chinese] https://docs.cocos.com/creator/manual/zh/scripting/typescript.html
//  - [English] http://www.cocos2d-x.org/docs/creator/manual/en/scripting/typescript.html
// Learn Attribute:
//  - [Chinese] https://docs.cocos.com/creator/manual/zh/scripting/reference/attributes.html
//  - [English] http://www.cocos2d-x.org/docs/creator/manual/en/scripting/reference/attributes.html
// Learn life-cycle callbacks:
//  - [Chinese] https://docs.cocos.com/creator/manual/zh/scripting/life-cycle-callbacks.html
//  - [English] http://www.cocos2d-x.org/docs/creator/manual/en/scripting/life-cycle-callbacks.html

const {ccclass, property} = cc._decorator;

export enum CharactorState
{
    stand = 0,
    run = 1,
    sitdown = 2,
    sitdown_run = 3,
}

/**
 * 场景角色 
 * @author 落日故人 QQ 583051842
 * 
 */

@ccclass
export default class Charactor extends cc.Component {
    setTargetPos(targetX: number, targetY: number) {
        this.node.x = targetX
        this.node.y = targetY
        this.stop()
    }

    private _movieClip:MovieClip = null;

    isSelf: boolean = false;
    roleState: RoleState;
    now: number;
    targetX: number;
    targetY: number;

    public get movieClip():MovieClip
    {
        if(!this._movieClip)
        {
            this._movieClip = this.getComponentInChildren(MovieClip);
        }
        return this._movieClip;
    }


    private _direction:number = 0;

    public get direction():number
    {
        return this._direction;
    }

    public set direction(value:number)
    {
        this._direction = value;

        if(value > 4)
        {
            this.movieClip.rowIndex = 4 - value % 4;
            this.movieClip.node.scaleX = -1;
        }else
        {
            this.movieClip.rowIndex = value;
            this.movieClip.node.scaleX = 1;
        }
    }

    private _state:CharactorState = 0;

    public get state():CharactorState
    {
        return this._state;
    }

    public set state(value:CharactorState)
    {
        this._state = value;

        switch(this._state)
        {
            case CharactorState.stand: 
                this.movieClip.begin = 0;
                this.movieClip.end = 6;
            break;

            case CharactorState.run: 
                this.movieClip.begin = 6;
                this.movieClip.end = 12;
            break;

            case CharactorState.sitdown: 
                this.movieClip.begin = 12;
                this.movieClip.end = 18;
            break;

            case CharactorState.sitdown_run: 
                this.movieClip.begin = 18;
                this.movieClip.end = 24;
            break;

        }

    }


    private _alpha: number = 1;
    public get alpha(): number {
        return this._alpha;
    }
    public set alpha(value: number) {
        this._alpha = value;
        this.node.opacity = Math.floor(255 * (value/1))
    }

    public sceneMap:SceneMap = null;

    /**
     *玩家当前所站在的地图节点 
     */		
    private _currentNode:RoadNode;

    //public isScrollScene:boolean = false;

    public moving:boolean = false;

    public moveSpeed:number = 100;

    private _moveAngle:number = 0;

    private _roadNodeArr:RoadNode[] = [];
    private _nodeIndex:number = 0;

    // LIFE-CYCLE CALLBACKS:

    // onLoad () {}
    @property(cc.Label)
    labName:cc.Label = null
    
    start () {

        //this.movieClip.stop();
        this.direction = 0;
        this.state = 3;
        this.node.on(cc.Node.EventType.TOUCH_END, this.onMapMouseDown, this);
    }

    onMapMouseDown(){
        SceneMap.instance.gameManager.selectRole = this.roleState.roleId
        cc.log(SceneMap.instance.gameManager.selectRole, this.roleState.roleId)
    }
    
    init(playerId:number, state: RoleState, isSelf: boolean) {
        // this.playerId = state.id;
        this.isSelf = isSelf;
        this.labName.string = 'id:' + playerId + "\n" + "roleId:" + state.roleId
        if (isSelf) this.labName.node.color = cc.Color.RED
        // this.mesh.material!.setProperty('mainTexture', this.isSelf ? this.texSelf : this.texOther);
    }

    updateState(state: RoleState, now: number) {
        this.roleState = state;
        this.now = now;
        
        if (state.isImmediately) {
            this.setTargetPos(state.targetX, state.targetY)
        } else {
            SceneMap.instance.movePlayer(state.targetX, state.targetY, this)
        }
        // this._endTime = state.targetTime
    }

    update (dt) 
    {
        if(this.moving)
        {
            
            let precent = cc.misc.lerp(0,this.pathL,cc.misc.clamp01((Date.now() - this._startTime) / (this._endTime - this._startTime)))
            
            let index = 0
            for(let i = 0; i < this.pathLs.length; i++){
                if (precent <= this.pathLs[i]) {
                    index = i
                    break
                }
            }
            let from = this._roadNodeArr[index-1]
            let to = this._roadNodeArr[index]
            let len = this.pathLs[index] - this.pathLs[index-1]
            
            let precent2 = cc.misc.clamp01((precent-(this.pathLs[index-1])) / len)
            cc.log(precent,precent2,len,index,this._nodeIndex)
            
            let X = cc.misc.lerp(from.px, to.px, precent2)
            let Y = cc.misc.lerp(from.py, to.py, precent2)
            
            this._nodeIndex = index
            
            var nextNode:RoadNode = this._roadNodeArr[this._nodeIndex];
            var dx:number = nextNode.px - this.node.x;
            var dy:number = nextNode.py - this.node.y;

            var speed:number = this.moveSpeed * dt;

            if(dx * dx + dy * dy > speed * speed)
            {
                if(this._moveAngle == 0)
                {
                    this._moveAngle = Math.atan2(dy,dx);

                    var dire:number = Math.round((-this._moveAngle + Math.PI)/(Math.PI / 4));
                    this.direction = dire > 5 ? dire-6 : dire+2;
                }

                var xspeed:number = Math.cos(this._moveAngle) * speed;
                var yspeed:number = Math.sin(this._moveAngle) * speed;

                // this.node.x += xspeed;
                this.node.x = X;
                // this.node.y += yspeed;
                this.node.y = Y;

            }else
            {
                this._moveAngle = 0;

                if(this._nodeIndex == this._roadNodeArr.length - 1)
                {
                    this.node.x = nextNode.px;
                    this.node.y = nextNode.py

                    this.stop();
                }else
                {
                    this.walk();
                }
            }
        }

        this.setPlayerStateByNode();

    }

    public setPlayerStateByNode():void
    {
        var node:RoadNode = SceneMap.instance.getMapNodeByPixel(this.node.x,this.node.y);
        
        if(node == this._currentNode)
        {
            return;
        }
        
        this._currentNode = node
        
        if(this._currentNode)
        {
            switch(this._currentNode.value)
            {
                case 2://如果是透明节点时
                    if(this.alpha != 0.4)
                    {
                        this.alpha = 0.4;
                    }
                    break;
                case 3://如果是透明节点时
                    //trace("走到该节点传送");
                    //this.alpha < 1 && (this.alpha = 1);
                    this.alpha > 0 && (this.alpha = 0);
                    break;
                default:
                    this.alpha < 1 && (this.alpha = 1);
                    
            }
            
        }

    }

    /**
     * 根据路节点路径行走
     * @param roadNodeArr 
     */
    pathL: number;
    pathLs: number[];
    _startTime: number;
    _endTime: number;
    public walkByRoad(roadNodeArr:RoadNode[])
    {
        
        let tuple = this.getPathLength(roadNodeArr)
        this.pathL = tuple[0] as number
        this.pathLs = tuple[1] as number[]
        this._startTime = Date.now()
        this._endTime = Date.now() + (this.pathL/this.moveSpeed)*1000
        cc.log(this.pathL, this.pathLs)
        
        this._roadNodeArr = roadNodeArr;
        this._nodeIndex = 0;
        this._moveAngle = 0;

        this.walk();
        this.move();
    }
    
    getPathLength(roadNodeArr:RoadNode[]){
        let length = 0
        let lengths:number[] = []
        lengths.push(0)
        for (let i = 0;i < roadNodeArr.length -1;i++){
            let from = roadNodeArr[i]
            let to = roadNodeArr[i+1]
            let L = Math.sqrt((to.px - from.px)**2 + (to.py - from.py)**2)
            length += L
            lengths.push(length)
        }
        return [length,lengths]
    }
    
    private walk()
    {
        if(this._nodeIndex < this._roadNodeArr.length - 1)
        {
            this._nodeIndex ++;
        }else
        {

        }
    }

    public move()
    {
        this.moving = true;
        this.state = CharactorState.run;
    }

    public stop()
    {
        this.moving = false;
        this.state = CharactorState.stand;
    }
}
