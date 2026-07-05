"use strict";

/*************************************************/
/* SECTION 1 - GLOBALS                           */
/*************************************************/

let TilesetData;

let TileInfo = [];
const VERSION = "v0.1.32";
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
    NextDirection : SOUTH,

    Speed : 1,
    Moving : true,

    State : "STRAIGHT",

    Distance : 0,
    TurnDistance : 0,

    OldDirection : SOUTH
};

function InitVehicles()
{
	// alert("Traffic Engine " + VERSION);
	console.log("Traffic Engine " + VERSION);
    CarImage.src = "Images/Car01.png";

    Car01.PixelX = Car01.TileX * TILE_WIDTH;
    Car01.PixelY = Car01.TileY * TILE_HEIGHT;
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

const CAR_LENGTH = 40;
const CAR_HALF = 20;

const NOSE_CHECK_DISTANCE = TILE_WIDTH - CAR_HALF;
const TURN_DISTANCE = 20;

function MoveDirection(Direction)
{
    switch(Direction)
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
}

function MoveDiagonal(DirectionA, DirectionB)
{
    MoveDirection(DirectionA);
    MoveDirection(DirectionB);
}

function GetNextTileX(TileX, Direction)
{
    if(Direction == EAST)
        return TileX + 1;

    if(Direction == WEST)
        return TileX - 1;

    return TileX;
}

function GetNextTileY(TileY, Direction)
{
    if(Direction == SOUTH)
        return TileY + 1;

    if(Direction == NORTH)
        return TileY - 1;

    return TileY;
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

    return 0;
}

function MiddleTurnAngle(DirectionA, DirectionB)
{
    let A = DirectionToAngle(DirectionA);
    let B = DirectionToAngle(DirectionB);

    let Diff = B - A;

    if(Diff > Math.PI)
        Diff -= Math.PI * 2;

    if(Diff < -Math.PI)
        Diff += Math.PI * 2;

    return A + Diff / 2;
}

function UpdateVehicles()
{
    if(!Car01.Moving)
        return;

    if(Car01.State == "TURN")
    {
        MoveDiagonal(
            Car01.OldDirection,
            Car01.NextDirection
        );

        Car01.TurnDistance += Car01.Speed;

        if(Car01.TurnDistance >= TURN_DISTANCE)
        {
            Car01.State = "STRAIGHT";
            Car01.TurnDistance = 0;

            Car01.Direction = Car01.NextDirection;
            Car01.Distance = CAR_HALF;
        }

        return;
    }

    MoveDirection(Car01.Direction);

    Car01.Distance += Car01.Speed;

    if(Car01.Distance >= NOSE_CHECK_DISTANCE)
    {
        let NewTileX = GetNextTileX(
            Car01.TileX,
            Car01.Direction
        );

        let NewTileY = GetNextTileY(
            Car01.TileY,
            Car01.Direction
        );

        let TileNumber = GetTileNumber(
            NewTileX,
            NewTileY
        );

        let Exit = GetExit(TileNumber);

        Car01.NextDirection =
            ChooseDirectionFromExit(Exit);

        Car01.TileX = NewTileX;
        Car01.TileY = NewTileY;

        Car01.Distance = -CAR_HALF;

        if(Car01.NextDirection != Car01.Direction)
        {
            Car01.OldDirection = Car01.Direction;
            Car01.State = "TURN";
            Car01.TurnDistance = 0;
        }
        else
        {
            Car01.Direction = Car01.NextDirection;
        }
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

if(Car01.State == "TURN")
{
    Ctx.rotate(
        MiddleTurnAngle(
            Car01.OldDirection,
            Car01.NextDirection
        )
    );
}
else
{
    Ctx.rotate(
        DirectionToAngle(Car01.Direction)
    );
}

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