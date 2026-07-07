"use strict";

/*************************************************/
/* SECTION 1 - GLOBALS                           */
/*************************************************/

let TilesetData;

let TileInfo = [];
const VERSION = "v0.1.64";
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
    if(TileX < 0 || TileY < 0)
        return -1;

    if(TileX >= MapData.width || TileY >= MapData.height)
        return -1;

    let Layer = MapData.layers[0].data;
    let Index = TileY * MapData.width + TileX;

    if(!Layer[Index])
        return -1;

    return Layer[Index] - 1;
}

/*************************************************/
/* SECTION 5 - VEHICLES                          */
/*************************************************/

const NORTH = 0;
const EAST  = 1;
const SOUTH = 2;
const WEST  = 3;

let CarImage = new Image();

let Cars =
[
    {
        Name : "Car01",

        TileX : 1,
        TileY : 1,

        PixelX : 0,
        PixelY : 0,

        Direction : SOUTH,
        NextDirection : SOUTH,

        Speed : 2,
        Moving : true,
        Distance : 0,
        CheckedThisTile : false,

        State : "DRIVE",
        StopCounter : 0,

        TurnTicks : 0,
        TurnMaxTicks : 40,
        TurnFromDirection : SOUTH,
        TurnToDirection : SOUTH
    },

    {
        Name : "Car02",

        TileX : 1,
        TileY : 2,

        PixelX : 0,
        PixelY : 0,

        Direction : SOUTH,
        NextDirection : SOUTH,

        Speed : 2,
        Moving : true,
        Distance : 0,
        CheckedThisTile : false,

        State : "DRIVE",
        StopCounter : 0,

        TurnTicks : 0,
        TurnMaxTicks : 40,
        TurnFromDirection : SOUTH,
        TurnToDirection : SOUTH
    }
];

    {
        Name : "Car03",

        TileX : 1,
        TileY : 3,

        PixelX : 0,
        PixelY : 0,

        Direction : SOUTH,
        NextDirection : SOUTH,

        Speed : 2,
        Moving : true,
        Distance : 0,
        CheckedThisTile : false,

        State : "DRIVE",
        StopCounter : 0,

        TurnTicks : 0,
        TurnMaxTicks : 40,
        TurnFromDirection : SOUTH,
        TurnToDirection : SOUTH
    }
];

function InitVehicles()
{
    console.log("Traffic Engine " + VERSION);

    CarImage.src = "Images/Car01.png";

    for(let i = 0; i < Cars.length; i++)
    {
        Cars[i].PixelX = Cars[i].TileX * TILE_WIDTH;
        Cars[i].PixelY = Cars[i].TileY * TILE_HEIGHT;
    }
}

function DirectionToAngle(Direction)
{
    if(Direction == NORTH) return 0;
    if(Direction == EAST)  return Math.PI / 2;
    if(Direction == SOUTH) return Math.PI;
    if(Direction == WEST)  return Math.PI * 1.5;

    return 0;
}

function GetDirectionVector(Direction)
{
    if(Direction == NORTH) return { X:0,  Y:-1 };
    if(Direction == EAST)  return { X:1,  Y:0  };
    if(Direction == SOUTH) return { X:0,  Y:1  };
    if(Direction == WEST)  return { X:-1, Y:0  };

    return { X:0, Y:0 };
}

function GetCarRotation(Car)
{
    if(Car.State == "TURN")
    {
        let StartAngle = DirectionToAngle(Car.OldDirection);
        let EndAngle   = DirectionToAngle(Car.NewDirection);

        let Difference = EndAngle - StartAngle;

        if(Difference > Math.PI)
            Difference -= Math.PI * 2;

        if(Difference < -Math.PI)
            Difference += Math.PI * 2;

        let Progress = Car.TurnTicks / Car.TurnMaxTicks;

        return StartAngle + Difference * Progress;
    }

    return DirectionToAngle(Car.Direction);
}

function ExitHasDirection(Exit, Direction)
{
    if(Direction == NORTH && Exit.includes("N")) return true;
    if(Direction == EAST  && Exit.includes("E")) return true;
    if(Direction == SOUTH && Exit.includes("S")) return true;
    if(Direction == WEST  && Exit.includes("W")) return true;

    return false;
}

function IsOppositeDirection(A, B)
{
    if(A == NORTH && B == SOUTH) return true;
    if(A == SOUTH && B == NORTH) return true;
    if(A == EAST  && B == WEST)  return true;
    if(A == WEST  && B == EAST)  return true;

    return false;
}

function PickNextDirection(Exit, CurrentDirection)
{
    let Options = [];

    if(Exit.includes("N")) Options.push(NORTH);
    if(Exit.includes("E")) Options.push(EAST);
    if(Exit.includes("S")) Options.push(SOUTH);
    if(Exit.includes("W")) Options.push(WEST);

    let ValidOptions = [];

    for(let Direction of Options)
    {
        if(!IsOppositeDirection(Direction, CurrentDirection))
            ValidOptions.push(Direction);
    }

    if(ValidOptions.length == 0)
        return CurrentDirection;

    if(ValidOptions.length == 1)
        return ValidOptions[0];

    return ValidOptions[Math.floor(Math.random() * ValidOptions.length)];
}

function HasNoseReachedPoint(Car, ExtraPixels)
{
    let CenterX = Car.TileX * TILE_WIDTH  + TILE_WIDTH  / 2;
    let CenterY = Car.TileY * TILE_HEIGHT + TILE_HEIGHT / 2;

    let NoseX = Car.PixelX + TILE_WIDTH / 2;
    let NoseY = Car.PixelY + TILE_HEIGHT / 2;

    let NoseOffset = 20 + ExtraPixels;

    if(Car.Direction == NORTH)
        NoseY -= NoseOffset;

    if(Car.Direction == EAST)
        NoseX += NoseOffset;

    if(Car.Direction == SOUTH)
        NoseY += NoseOffset;

    if(Car.Direction == WEST)
        NoseX -= NoseOffset;

    if(Car.Direction == NORTH && NoseY <= CenterY) return true;
    if(Car.Direction == EAST  && NoseX >= CenterX) return true;
    if(Car.Direction == SOUTH && NoseY >= CenterY) return true;
    if(Car.Direction == WEST  && NoseX <= CenterX) return true;

    return false;
}

function HasNoseReachedTurnPoint(Car)
{
    return HasNoseReachedPoint(Car, 0);
}

function HasNoseReachedStopPoint(Car)
{
    return HasNoseReachedPoint(Car, -15);
}

function StartTurn(Car, NewDirection)
{
    Car.State = "TURN";

    Car.OldDirection = Car.Direction;
    Car.NewDirection = NewDirection;

    Car.TurnTicks = 0;
}

function UpdateTurn(Car)
{
    let OldVector = GetDirectionVector(Car.OldDirection);
    let NewVector = GetDirectionVector(Car.NewDirection);

    let Step = 20 / Car.TurnMaxTicks;

    Car.PixelX += OldVector.X * Step;
    Car.PixelY += OldVector.Y * Step;

    Car.PixelX += NewVector.X * Step;
    Car.PixelY += NewVector.Y * Step;

    Car.TurnTicks++;

    if(Car.TurnTicks >= Car.TurnMaxTicks)
    {
        let TileCenterX = Car.TileX * TILE_WIDTH  + TILE_WIDTH  / 2;
        let TileCenterY = Car.TileY * TILE_HEIGHT + TILE_HEIGHT / 2;

        /*
            Harde correctie tegen afrondingsfouten.

            Bij EAST/WEST moet de auto perfect op de horizontale
            middenas van de weg liggen.

            Bij NORTH/SOUTH moet de auto perfect op de verticale
            middenas van de weg liggen.
        */

        if(Car.NewDirection == EAST || Car.NewDirection == WEST)
        {
            Car.PixelY = TileCenterY - TILE_HEIGHT / 2;
        }

        if(Car.NewDirection == NORTH || Car.NewDirection == SOUTH)
        {
            Car.PixelX = TileCenterX - TILE_WIDTH / 2;
        }

        Car.Direction = Car.NewDirection;
        Car.NextDirection = Car.NewDirection;

        Car.State = "DRIVE";
        Car.CheckedThisTile = true;
        Car.TurnTicks = 0;
    }
}

function UpdateDrive(Car)
{
    if(Car.WaitTicks > 0)
    {
        Car.WaitTicks--;
        return;
    }

    let Vector = GetDirectionVector(Car.Direction);

    Car.PixelX += Vector.X * Car.Speed;
    Car.PixelY += Vector.Y * Car.Speed;

    Car.TileX = Math.floor((Car.PixelX + TILE_WIDTH / 2) / TILE_WIDTH);
    Car.TileY = Math.floor((Car.PixelY + TILE_HEIGHT / 2) / TILE_HEIGHT);
	
	if(
		Car.TileX != Car.LastStoppedTileX ||
		Car.TileY != Car.LastStoppedTileY
	)
	{
		Car.LastStoppedTileX = -1;
		Car.LastStoppedTileY = -1;
	}
	
	if(HasNoseReachedStopPoint(Car))
{
    let TileNumber = GetTileNumber(Car.TileX, Car.TileY);
    let StopTicks = GetStopTicks(TileNumber);

    if(
        StopTicks > 0 &&
        (
            Car.TileX != Car.LastStoppedTileX ||
            Car.TileY != Car.LastStoppedTileY
        )
    )
    {
        Car.LastStoppedTileX = Car.TileX;
        Car.LastStoppedTileY = Car.TileY;

        Car.WaitTicks = StopTicks;

        console.log(
            "StopTile",
            TileNumber,
            "StopTicks",
            StopTicks
        );

        return;
    }
}

	if(!Car.CheckedThisTile && HasNoseReachedTurnPoint(Car))
{
    let TileNumber = GetTileNumber(Car.TileX, Car.TileY);
    let Exit = GetExit(TileNumber);

    if(!Exit || Exit == "")
    {
        alert("Ongeldige Exit: leeg");
        Paused = true;
        return;
    }


    /*
        Dezelfde tegel niet twee keer verwerken.
    */

    if(
        Car.TileX == Car.LastCheckedTileX &&
        Car.TileY == Car.LastCheckedTileY
    )
    {
        return;
    }

    Car.LastCheckedTileX = Car.TileX;
    Car.LastCheckedTileY = Car.TileY;

    Car.NextDirection = PickNextDirection(
        Exit,
        Car.Direction
    );

    console.log(
        "Tile",
        TileNumber,
        "Exit",
        Exit,
        "Direction",
        Car.Direction,
        "NextDirection",
        Car.NextDirection
    );

    if(Car.NextDirection != Car.Direction)
    {
        StartTurn(Car, Car.NextDirection);
        return;
    }

    Car.CheckedThisTile = true;
}

    let LocalX = (Car.PixelX + TILE_WIDTH / 2) % TILE_WIDTH;
    let LocalY = (Car.PixelY + TILE_HEIGHT / 2) % TILE_HEIGHT;

    if(
        LocalX < 3 ||
        LocalX > TILE_WIDTH - 3 ||
        LocalY < 3 ||
        LocalY > TILE_HEIGHT - 3
    )
    {
        Car.CheckedThisTile = false;
    }
}

function UpdateVehicles()
{
    for(let i = 0; i < Cars.length; i++)
    {
        if(Cars[i].State == "TURN")
            UpdateTurn(Cars[i]);
        else
            UpdateDrive(Cars[i]);
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

    Ctx.rotate(GetCarRotation());

    Ctx.drawImage(
        CarImage,
        -20,
        -20,
        40,
        40
    );

    Ctx.restore();
}

function DrawVehicles()
{
    if(!CarImage.complete)
        return;

    for(let i = 0; i < Cars.length; i++)
    {
        DrawCar(Cars[i]);
    }
}

function DrawCar(Car)
{
    Ctx.save();

    Ctx.translate(
        Car.PixelX + TILE_WIDTH / 2,
        Car.PixelY + TILE_HEIGHT / 2
    );

    Ctx.rotate(GetCarRotation(Car));

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
    if(TileNumber < 0)
        return "";

    if(!TileInfo[TileNumber])
        return "";

    if(!TileInfo[TileNumber].Exit)
        return "";

    return TileInfo[TileNumber].Exit;
}

function GetStopTicks(TileNumber)
{
    if(TileNumber < 0)
        return 0;

    if(!TileInfo[TileNumber])
        return 0;

    if(!TileInfo[TileNumber].StopTicks)
        return 0;

    return TileInfo[TileNumber].StopTicks;
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
    if(!Paused)
    {
        Update();
    }

    Draw();

    requestAnimationFrame(GameLoop);
}