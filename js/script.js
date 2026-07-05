"use strict";

/*************************************************/
/* SECTION 1 - GLOBALS                           */
/*************************************************/

let TilesetData;

let TileInfo = [];
const VERSION = "v0.1.28";
let TILE_WIDTH;
let TILE_HEIGHT;

let Canvas;
let Ctx;

let MapData;
let TileImage;
let Paused = false;

/*************************************************/
/* SECTION 2 - INITIALIZE                        */
/*************************************************/

window.onload = Init;

async function Init()
{
    Canvas = document.getElementById("GameCanvas");
    Ctx = Canvas.getContext("2d");

await LoadMap();

await LoadTileset();

InitVehicles();

requestAnimationFrame(GameLoop);
}

window.addEventListener(
    "keydown",
    function(Event)
    {
        if(Event.key == "p" || Event.key == "P")
        {
            Paused = !Paused;
            console.log("Paused:", Paused);
        }
    }
);


/*************************************************/
/* SECTION 3 - LOAD MAP                          */
/*************************************************/

async function LoadMap()
{
    //-------------------------------------------------
    // TMJ laden
    //-------------------------------------------------

    const Response = await fetch("Maps/USAcity.tmj");

    MapData = await Response.json();
	TILE_WIDTH  = MapData.tilewidth;
    TILE_HEIGHT = MapData.tileheight;

    //-------------------------------------------------
    // Canvas grootte aanpassen
    //-------------------------------------------------

    Canvas.width  = MapData.width  * TILE_WIDTH;
    Canvas.height = MapData.height * TILE_HEIGHT;

    //-------------------------------------------------
    // PNG laden
    //-------------------------------------------------

    TileImage = new Image();

    TileImage.src = "Art/USA_Roads.png";

    // TileImage.onload = DrawMap;
}


async function LoadTileset()
{
    const Response = await fetch("Maps/USA_Roads.tsj");

    TilesetData = await Response.json();

    TileInfo = [];

    for(const Tile of TilesetData.tiles)
    {
        TileInfo[Tile.id] = {};

        for(const Property of Tile.properties)
        {
            TileInfo[Tile.id][Property.name] = Property.value;
        }
    }

    console.log(TileInfo);
}

/*************************************************/
/* SECTION 4 - DRAW MAP                          */
/*************************************************/

function DrawMap()
{
    let Layer = MapData.layers[0].data;

    for(let y=0; y<MapData.height; y++)
    {
        for(let x=0; x<MapData.width; x++)
        {
            let Tile = Layer[y * MapData.width + x] - 1;
//console.log(x, y, Tile);
            if(Tile < 0)
                continue;

            let SourceX = (Tile % 4) * TILE_WIDTH;
            let SourceY = Math.floor(Tile / 4) * TILE_HEIGHT;

            Ctx.drawImage(

                TileImage,

                SourceX,
                SourceY,

                TILE_WIDTH,
                TILE_HEIGHT,

                x * TILE_WIDTH,
                y * TILE_HEIGHT,

                TILE_WIDTH,
                TILE_HEIGHT
            );
        }
    }
}	

function GetTileNumber(TileX, TileY)
{
    let Layer = MapData.layers[0].data;

    return Layer[TileY * MapData.width + TileX] - 1;
}

/*************************************************/
/* SECTION 5 - VEHICLES                          */
/*************************************************/

const CAR_LENGTH = 40;
const CAR_HALF_LENGTH = CAR_LENGTH / 2;
const TURN_SPEED = 0.12;

const NORTH = 0;
const EAST  = 1;
const SOUTH = 2;
const WEST  = 3;

let CarImage = new Image();

let Car01 =
{
    TileX : 1,
    TileY : 1,

    PixelX : 0,
    PixelY : 0,

    Direction : SOUTH,
    TargetDirection : SOUTH,

    Angle : Math.PI,
    TargetAngle : Math.PI,

    Speed : 1,
    Moving : true,
    Distance : 0,
    CheckedThisTile : false
};

function InitVehicles()
{
	// alert("Traffic Engine " + VERSION);
	console.log("Traffic Engine " + VERSION);
    CarImage.src = "Images/Car01.png";

    Car01.PixelX = Car01.TileX * TILE_WIDTH;
    Car01.PixelY = Car01.TileY * TILE_HEIGHT;
}

function UpdateVehicles()
{
    if(!Car01.Moving)
        return;

    UpdateCarAngle();

    switch(Car01.Direction)
    {
        case NORTH:
            Car01.PixelY -= Car01.Speed;
            break;

        case EAST:
            Car01.PixelX += Car01.Speed;
            break;

        case SOUTH:
            Car01.PixelY += Car01.Speed;
            break;

        case WEST:
            Car01.PixelX -= Car01.Speed;
            break;
    }

    Car01.Distance += Car01.Speed;

    if(
        Car01.Distance >= TILE_WIDTH - CAR_HALF_LENGTH &&
        !Car01.CheckedThisTile
    )
    {
        Car01.CheckedThisTile = true;

        let NextTileX = GetNextTileX(Car01);
        let NextTileY = GetNextTileY(Car01);

        let TileNumber = GetTileNumber(
            NextTileX,
            NextTileY
        );

        let Exit = GetExit(TileNumber);

        Car01.TargetDirection =
            ChooseDirectionFromExit(Exit);

        Car01.TargetAngle =
            DirectionToAngle(Car01.TargetDirection);
    }

    if(Car01.Distance >= TILE_WIDTH)
    {
        Car01.Distance = 0;
        Car01.CheckedThisTile = false;

        Car01.TileX = GetNextTileX(Car01);
        Car01.TileY = GetNextTileY(Car01);

        Car01.Direction = Car01.TargetDirection;

        Car01.PixelX = Car01.TileX * TILE_WIDTH;
        Car01.PixelY = Car01.TileY * TILE_HEIGHT;

        Car01.Angle =
            DirectionToAngle(Car01.Direction);

        Car01.TargetAngle = Car01.Angle;
    }
}

function DrawVehicles()
{
    if(!CarImage.complete)
        return;

    Ctx.save();

    Ctx.translate(
        Car01.PixelX + TILE_WIDTH / 2,
        Car01.PixelY + TILE_HEIGHT / 2
    );

    Ctx.rotate(Car01.Angle);

    Ctx.drawImage(
        CarImage,
        -20,
        -20,
        40,
        40
    );

    Ctx.restore();
}

function GetExit(TileNumber)
{
    if(!TileInfo[TileNumber])
        return "";

    if(!TileInfo[TileNumber].Exit)
        return "";

    return TileInfo[TileNumber].Exit;
}

function ChooseDirectionFromExit(Exit)
{
    let Choice = Exit[
        Math.floor(Math.random() * Exit.length)
    ];

    switch(Choice)
    {
        case "N": return NORTH;
        case "E": return EAST;
        case "S": return SOUTH;
        case "W": return WEST;
    }

    alert("Ongeldige Exit: " + Exit);
    Paused = true;
}

function GetCarRotation()
{
    switch(Car01.Direction)
    {
        case NORTH: return 0;
        case EAST:  return Math.PI / 2;
        case SOUTH: return Math.PI;
        case WEST:  return -Math.PI / 2;
    }

    return 0;
}

function DirectionToAngle(Direction)
{
    switch(Direction)
    {
        case NORTH: return 0;
        case EAST:  return Math.PI / 2;
        case SOUTH: return Math.PI;
        case WEST:  return -Math.PI / 2;
    }

    return Math.PI;
}

function GetNextTileX(Car)
{
    if(Car.Direction == EAST)
        return Car.TileX + 1;

    if(Car.Direction == WEST)
        return Car.TileX - 1;

    return Car.TileX;
}

function GetNextTileY(Car)
{
    if(Car.Direction == SOUTH)
        return Car.TileY + 1;

    if(Car.Direction == NORTH)
        return Car.TileY - 1;

    return Car.TileY;
}

function UpdateCarAngle()
{
    let Difference =
        Car01.TargetAngle - Car01.Angle;

    if(Difference > Math.PI)
        Difference -= Math.PI * 2;

    if(Difference < -Math.PI)
        Difference += Math.PI * 2;

    Car01.Angle += Difference * TURN_SPEED;
}

/*************************************************/
/* SECTION 6 - GAME LOOP                         */
/*************************************************/

function Update()
{
    UpdateVehicles();
}

function Draw()
{
    DrawMap();
	DrawVehicles();
}

function GameLoop()
{
    Update();

    Draw();

    requestAnimationFrame(GameLoop);
}

function GameLoop()
{
    if(!Paused)
    {
        UpdateVehicles();
    }

    DrawMap();
    DrawVehicles();

    requestAnimationFrame(GameLoop);
}