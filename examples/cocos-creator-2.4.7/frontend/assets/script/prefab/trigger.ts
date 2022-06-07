import { ClientInput } from "../../scripts/shared/protocols/client/MsgClientInput";
import Main from "../Main";
import Charactor from "../map/charactor/Charactor";
import SceneMap from "../SceneMap";

const {ccclass, property} = cc._decorator;

@ccclass
export default class NewClass extends cc.Component {

	@property
	targetX:number = 0

	@property
	targetY:number = 0

	@property
	mapID:number = 0
    onCollisionEnter(other:cc.Collider, self) {

        let input: ClientInput = {
            type: 'PlayerPos',
            x: this.targetX,
            y: this.targetY,
        }
        SceneMap.instance.gameManager.sendClientInput(input)
        Main.instance.loadSingleMap(this.mapID)

    }

}
