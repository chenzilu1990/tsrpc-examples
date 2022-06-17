export interface PlayerState {
    id: number,
    // 位置
    pos: { x: number, y: number },
    // 晕眩结束时间
    dizzyEndTime?: number,

    roles:RoleState[]
}

export interface RoleState {
    fromPlayerId:number,
    roleId:number,
    targetX:number,
    targetY:number,
    targetTime:number,
    isImmediately:boolean,
}