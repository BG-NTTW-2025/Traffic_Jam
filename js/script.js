"use strict";

/*************************************************/
/* SECTION 1 - GLOBALS                           */
/*************************************************/

let TILE_WIDTH;
let TILE_HEIGHT;

let Canvas;
let Ctx;

let MapData;
let TileImage;


/*************************************************/
/* SECTION 2 - INITIALIZE                        */
/*************************************************/

window.onload = Init;

async function Init()
{
    Canvas = document.getElementById("GameCanvas");
    Ctx = Canvas.getContext("2d");

await LoadMap();

InitVehicles();

requestAnimationFrame(GameLoop);
}


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

    Direction : NORTH
};

function InitVehicles()
{
	alert("InitVehicles gevonden");
    CarImage.src = "Images/Car01.png";

    Car01.PixelX = Car01.TileX * TILE_WIDTH;
    Car01.PixelY = Car01.TileY * TILE_HEIGHT;
}

function UpdateVehicles()
{
    // Nog leeg.
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

    Ctx.rotate(0);

    Ctx.drawImage(
        CarImage,
        -20,
        -20,
        40,
        40
    );

    Ctx.restore();
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
