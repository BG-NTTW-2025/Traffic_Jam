"use strict";

/*************************************************/
/* SECTION 1 - GLOBALS                           */
/*************************************************/

let TilesetData;

let TileInfo = [];
const VERSION = "v0.1.85";
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

const QUEUE_DISTANCE_BEFORE_CENTER = -10;

const MAX_CARS = 20;

let SpawnCounter = 0;

const Garages =
[
    { TileX:1,  TileY:1,  Direction:SOUTH },
    { TileX:13, TileY:1,  Direction:WEST  },
    { TileX:1,  TileY:13, Direction:EAST  },
    { TileX:13, TileY:13, Direction:NORTH }
];

let CarImage = new Image();

let TileOccupation = [];

let Cars = [];

function InitVehicles()
{
    console.log("Traffic Engine " + VERSION);

    CarImage.src = "Images/Car01.png";

    for(let i = 0; i < Cars.length; i++)
    {
        Cars[i].PixelX = Cars[i].TileX * TILE_WIDTH;
        Cars[i].PixelY = Cars[i].TileY * TILE_HEIGHT;
    }

    InitTileOccupation();
	
	for(let i = 0; i < Garages.length; i++)
{
    CreateCar(
        Garages[i].TileX,
        Garages[i].TileY,
        Garages[i].Direction
    );
}
}

function InitTileOccupation()
{
    TileOccupation = [];

    for(let i = 0; i < MapData.width * MapData.height; i++)
    {
        TileOccupation[i] = -1;
    }

    for(let i = 0; i < Cars.length; i++)
    {
        ReserveTile(
            Cars[i].TileX,
            Cars[i].TileY,
            i
        );
    }

  //  console.log("TileOccupation initialized", TileOccupation);
}

function CreateCar(TileX, TileY, Direction)
{
    let Car =
    {
        Name : "Car" + String(Cars.length + 1).padStart(2, "0"),

        TileX : TileX,
        TileY : TileY,

        PixelX : TileX * TILE_WIDTH,
        PixelY : TileY * TILE_HEIGHT,

        Direction : Direction,
        NextDirection : Direction,

        Speed : 2,

        State : "DRIVE",
        WaitTicks : 0,

        CheckedThisTile : false,

        LastCheckedTileX : -1,
        LastCheckedTileY : -1,

        LastStoppedTileX : -1,
        LastStoppedTileY : -1,

        TurnTicks : 0,
        TurnMaxTicks : 40,

        OldDirection : Direction,
        NewDirection : Direction
    };

    Cars.push(Car);

    ReserveTile(
        TileX,
        TileY,
        Cars.length - 1
    );

    console.log("Spawned", Car.Name, TileX, TileY);

    return Car;
}

function TrySpawnCar()
{
    if(Cars.length >= MAX_CARS)
        return;

    let GarageIndex = Math.floor(Math.random() * Garages.length);
    let Garage = Garages[GarageIndex];

    if(!IsTileFree(Garage.TileX, Garage.TileY))
        return;

    CreateCar(
        Garage.TileX,
        Garage.TileY,
        Garage.Direction
    );
}

function GetCarIndex(Car)
{
    for(let i = 0; i < Cars.length; i++)
    {
        if(Cars[i] == Car)
            return i;
    }

    return -1;
}

function ReleaseTileForCar(TileX, TileY, Car)
{
    let Index = GetTileOccupationIndex(TileX, TileY);
    let CarIndex = GetCarIndex(Car);

    if(TileOccupation[Index] == CarIndex)
        TileOccupation[Index] = -1;
}

function GetTileOccupationIndex(TileX, TileY)
{
    return TileY * MapData.width + TileX;
}

function IsTileFree(TileX, TileY)
{
    if(TileX < 0 || TileY < 0)
        return false;

    if(TileX >= MapData.width || TileY >= MapData.height)
        return false;

    let Index = GetTileOccupationIndex(TileX, TileY);

    return TileOccupation[Index] == -1;
}

function ReserveTile(TileX, TileY, CarIndex)
{
    let Index = GetTileOccupationIndex(TileX, TileY);

    TileOccupation[Index] = CarIndex;
}

function ReleaseTile(TileX, TileY)
{
    let Index = GetTileOccupationIndex(TileX, TileY);

    TileOccupation[Index] = -1;
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


function HasCarReachedQueuePoint(Car)
{
    let TileCenterX = Car.TileX * TILE_WIDTH  + TILE_WIDTH  / 2;
    let TileCenterY = Car.TileY * TILE_HEIGHT + TILE_HEIGHT / 2;

    let CarCenterX = Car.PixelX + TILE_WIDTH  / 2;
    let CarCenterY = Car.PixelY + TILE_HEIGHT / 2;

    if(Car.Direction == NORTH &&
       CarCenterY <= TileCenterY + QUEUE_DISTANCE_BEFORE_CENTER)
        return true;

    if(Car.Direction == EAST &&
       CarCenterX >= TileCenterX - QUEUE_DISTANCE_BEFORE_CENTER)
        return true;

    if(Car.Direction == SOUTH &&
       CarCenterY >= TileCenterY - QUEUE_DISTANCE_BEFORE_CENTER)
        return true;

    if(Car.Direction == WEST &&
       CarCenterX <= TileCenterX + QUEUE_DISTANCE_BEFORE_CENTER)
        return true;

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
    let OldPixelX = Car.PixelX;
    let OldPixelY = Car.PixelY;
    let OldTileX  = Car.TileX;
    let OldTileY  = Car.TileY;

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
        Car.TileX != OldTileX ||
        Car.TileY != OldTileY
    )
    {
        ReleaseTileForCar(
            OldTileX,
            OldTileY,
            Car
        );
    }

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

          //  console.log(
          //      "StopTile",
           //     TileNumber,
            //    "StopTicks",
             //   StopTicks
           // );

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

        let PickedDirection = PickNextDirection(
            Exit,
            Car.Direction
        );

        let TargetVector = GetDirectionVector(PickedDirection);

        let TargetTileX = Car.TileX + TargetVector.X;
        let TargetTileY = Car.TileY + TargetVector.Y;

if(!IsTileFree(TargetTileX, TargetTileY))
{
    if(PickedDirection == Car.Direction)
    {
        if(HasCarReachedQueuePoint(Car))
        {
            Car.PixelX = OldPixelX;
            Car.PixelY = OldPixelY;
            Car.TileX  = OldTileX;
            Car.TileY  = OldTileY;

            return;
        }

        Car.LastCheckedTileX = -1;
        Car.LastCheckedTileY = -1;

        return;
    }

    Car.PixelX = OldPixelX;
    Car.PixelY = OldPixelY;
    Car.TileX  = OldTileX;
    Car.TileY  = OldTileY;

    return;
}

        ReserveTile(
            TargetTileX,
            TargetTileY,
            GetCarIndex(Car)
        );

        Car.LastCheckedTileX = Car.TileX;
        Car.LastCheckedTileY = Car.TileY;

        Car.NextDirection = PickedDirection;

        //console.log(
          //  "Tile",
          //  TileNumber,
         //   "Exit",
         //  Exit,
         //   "Direction",
         //   Car.Direction,
         //   "NextDirection",
         //   Car.NextDirection
       // );

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
    SpawnCounter++;

    if(SpawnCounter >= 100)
    {
        SpawnCounter = 0;
        TrySpawnCar();
    }

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

const TARGET_FPS = 50;
const FRAME_TIME = 1000 / TARGET_FPS;

let LastFrameTime = 0;

function Update()
{
    UpdateVehicles();
}

function Draw()
{
    DrawMap();
    DrawVehicles();
}

function GameLoop(TimeStamp)
{
    if(TimeStamp - LastFrameTime >= FRAME_TIME)
    {
        LastFrameTime = TimeStamp;

        if(!Paused)
        {
            Update();
        }

        Draw();
    }

    requestAnimationFrame(GameLoop);
}