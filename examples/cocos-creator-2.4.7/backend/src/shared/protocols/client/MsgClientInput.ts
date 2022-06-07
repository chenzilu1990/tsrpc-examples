import { PlayerAttack, PlayerMove, PlayerTarget, PlayerPos } from "../../game/GameSystem";

/** 发送自己的输入 */
export interface MsgClientInput {
    sn: number,
    inputs: ClientInput[]
};

export type ClientInput = Omit<PlayerMove, 'playerId'> | Omit<PlayerAttack, 'playerId'> | Omit<PlayerTarget, 'playerId'> | Omit<PlayerPos, 'playerId'>;