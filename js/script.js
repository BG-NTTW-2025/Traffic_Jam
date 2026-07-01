"use strict";

/*************************************************/
/* SECTION 1 - GLOBALS                           */
/*************************************************/

const TILE_SIZE = 50;

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
}


/*************************************************/
/* SECTION 3 - LOAD MAP                          */
/*************************************************/

async function LoadMap()
{
    //-------------------------------------------------
    // TMJ laden
    //-------------------------------------------------

    const Response = await fetch("Maps/USAcity.tsj");

    MapData = await Response.json();

    //-------------------------------------------------
    // Canvas grootte aanpassen
    //-------------------------------------------------

    Canvas.width  = MapData.width  * TILE_SIZE;
    Canvas.height = MapData.height * TILE_SIZE;

    //-------------------------------------------------
    // PNG laden
    //-------------------------------------------------

    TileImage = new Image();

    TileImage.src = "Maps/USA_Roads.png";

    TileImage.onload = DrawMap;
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

            let SourceX = (Tile % 4) * TILE_SIZE;
            let SourceY = Math.floor(Tile / 4) * TILE_SIZE;

            Ctx.drawImage(

                TileImage,

                SourceX,
                SourceY,

                TILE_SIZE,
                TILE_SIZE,

                x * TILE_SIZE,
                y * TILE_SIZE,

                TILE_SIZE,
                TILE_SIZE
            );
        }
    }
}