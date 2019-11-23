"use strict";

require('../libs.js');

const hideout_areas_config = JSON.parse( utility.readJson("database/configs/hideout/areas.json" ) );

//upgrading can take times,the first step is to pay what needed for upgrade and start construction
function HideoutUpgrade(tmplist,body)
{
	
    //pay money or delete items
	for(var itemToPay of body.items )
	{
		for(var inventoryItem in tmplist.data[0].Inventory.items)
		{
			if(tmplist.data[0].Inventory.items[inventoryItem]._id == itemToPay.id )//find the specific item in inventory
			{
				if(tmplist.data[0].Inventory.items[inventoryItem]._tpl == "5449016a4bdc2d6f028b456f")// if its money ..
				{
					tmplist.data[0].Inventory.items[inventoryItem].upd.StackObjectsCount -= itemToPay.count;
				}
				else //if its construction/barter items
				{	
					move_f.removeItem(tmplist, { "Action":"Remove", "item" : tmplist.data[0].Inventory.items[inventoryItem]._id } );
				}		
			}
		}
	}

	//time construction management
	for(var hideoutArea in tmplist.data[0].Hideout.Areas)
	{	
		//find areaType in profile
		if(tmplist.data[0].Hideout.Areas[hideoutArea].type == body.areaType)
		{

			for( var hideout_stage in hideout_areas_config.data)
			{	
				//find the  good stage from config
				if( hideout_areas_config.data[hideout_stage].type == body.areaType)
				{
					//get construction time
					var ctime = hideout_areas_config.data[hideout_stage].stages[ tmplist.data[0].Hideout.Areas[hideoutArea].level + 1 ].constructionTime;
					if(ctime > 0 )
					{	
						var timestamp = Math.floor(Date.now() / 1000);
						tmplist.data[0].Hideout.Areas[hideoutArea].completeTime = timestamp + ctime ;
						tmplist.data[0].Hideout.Areas[hideoutArea].constructing = true;
					}
				}				
			}
		}
	}

	profile.setCharacterData(tmplist);	

	item.resetOutput();
	return item.getOutput();
}

//validating the upgrade
function HideoutUpgradeComplete(tmplist,body)
{
	for(var hideoutArea in tmplist.data[0].Hideout.Areas)
	{
		if(tmplist.data[0].Hideout.Areas[hideoutArea].type == body.areaType)
		{
			tmplist.data[0].Hideout.Areas[hideoutArea].level++;	
			tmplist.data[0].Hideout.Areas[hideoutArea].completeTime = 0;
			tmplist.data[0].Hideout.Areas[hideoutArea].constructing = false;

			//and then apply bonusses or its auo ? 		
		}
	}

	profile.setCharacterData(tmplist);

	item.resetOutput();		
	return item.getOutput();
}


//move items from hideout
function HideoutPutItemsInAreaSlots(tmplist,body)
{
	for(var itemToMove in body.items)
	{
		for(var inventoryItem of tmplist.data[0].Inventory.items)
		{
			if(body.items[itemToMove].id == inventoryItem._id )
			{
				for( let area in tmplist.data[0].Hideout.Areas)
				{
					if( tmplist.data[0].Hideout.Areas[area].type == body.areaType)
					{
						let slot_to_add = 
						{
							"item":[{
								"_id": inventoryItem._id,
								"_tpl":inventoryItem._tpl,
								"upd": inventoryItem.upd
							}]
						}
						tmplist.data[0].Hideout.Areas[area].slots.push(slot_to_add);
						move_f.removeItem(tmplist, { "Action":"Remove", "item" : inventoryItem._id } );
					}
				}
			}
		}
	}

	profile.setCharacterData(tmplist);	
	return item.getOutput();

}

function HideoutTakeItemsFromAreaSlots(tmplist,body)
{
	item.resetOutput();	

	for( let area in tmplist.data[0].Hideout.Areas)
	{
		if( tmplist.data[0].Hideout.Areas[area].type == body.areaType)
		{
			//should use body.slots[0] to get the array index but since its not managed like that, its different
			//move tmplist.data[0].Hideout.Areas[area].slots[0].item[0] to inventory with new location --> special function needed 
			//then manual remove --> tmplist.data[0].Hideout.Areas[area].slots.splice(0,1);
		}
	}
	
	//profile.setCharacterData(tmplist);	
	return item.getOutput();
}

function HideoutToggleArea(tmplist,body)
{

	for(var area in tmplist.data[0].Hideout.Areas)
	{
		if( tmplist.data[0].Hideout.Areas[area].type == body.areaType )
		{	
			tmplist.data[0].Hideout.Areas[area].active = body.enabled;
		}
	}

	profile.setCharacterData(tmplist);
	item.resetOutput();		
	return item.getOutput();
}


function HideoutSingleProductionStart(tmplist,body)
{	
	registerProduction(tmplist, body);

	for(var itemToDelete of body.items)
	{
		move_f.removeItem(tmplist, { "Action":"Remove", "item" : itemToDelete.id } );
	}

	item.resetOutput();
	return item.getOutput();
}

function HideoutScavCaseProductionStart(tmplist,body)
{	
	//take money before registering prod (registering save also that money change)
	for(var moneyToEdit of body.items)
	{
		for(var item in tmplist.data[0].Inventory.items)
		{
			if(tmplist.data[0].Inventory.items[item]._id == moneyToEdit.id)
			{
				tmplist.data[0].Inventory.items[item].upd.StackObjectsCount -= moneyToEdit.count;
			}
		}
	}

	registerProduction(tmplist, body);

	item.resetOutput();
	return item.getOutput();
}

function HideoutContinuousProductionStart(tmplist, body)
{
	registerProduction(tmplist, body);

	item.resetOutput();		
	return item.getOutput();
}

function HideoutTakeProduction(tmplist, body)
{
	item.resetOutput();	

	//call the adding item function
	//profile.setCharacterData(tmplist);
	return item.getOutput();
}

function registerProduction(tmplist, body)//internal function used for 3 requests
{
	var crafting_receipes = JSON.parse( utility.readJson("database/configs/hideout/production_recipes.json" ) );

	for(var receipe in crafting_receipes.data)
	{	
		if(body.recipeId == crafting_receipes.data[receipe]._id)
		{
			tmplist.data[0].Hideout.Production[crafting_receipes.data[receipe].areaType] = { 
				"Progress":0,
				"inProgress": true,
           		"RecipeId": body.recipeId,
        		"Products": [],
        		"StartTime": body.timestamp
        	};
		}
	}
	profile.setCharacterData(tmplist);
}

module.exports.hideoutUpgrade = HideoutUpgrade;
module.exports.hideoutUpgradeComplete = HideoutUpgradeComplete;
module.exports.hideoutPutItemsInAreaSlots = HideoutPutItemsInAreaSlots;
module.exports.hideoutTakeItemsFromAreaSlots = HideoutTakeItemsFromAreaSlots;
module.exports.hideoutToggleArea = HideoutToggleArea;
module.exports.hideoutSingleProductionStart  = HideoutSingleProductionStart;
module.exports.hideoutContinuousProductionStart = HideoutContinuousProductionStart;
module.exports.hideoutScavCaseProductionStart = HideoutScavCaseProductionStart;
module.exports.hideoutTakeProduction = HideoutTakeProduction;