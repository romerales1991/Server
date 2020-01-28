"use strict";

require("../libs.js");

function get(mapName) {
    let mapNode = filepaths.maps[mapName];
    let presetNames = Object.keys(mapNode);
    let map = "";

    if (!settings.gameplay.location.forceMapEnabled) {
        map = presetNames[utility.getRandomInt(0, presetNames.length - 1)];
    } else {
        map = presetNames[settings.gameplay.location.forceMapId];
    }    

    let data = json.read(mapNode[map]);
    logger.logInfo("[MAP." + mapName + "]: " + map);
    return data;
}

module.exports.get = get;