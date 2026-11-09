/*
 Copyright (c) 2018 Cole Johnson
 
 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
*/

/*
*simTV.js contains most of the code relating to the simulated television screen
*/
var hPos = 0;
var vPos = 0;
//How long a continuous sync signal has been going on for
var syncCount = 0;
var halfShift = false;//is this field even or odd
var sCanvas;
var sCtx;

/*NTSC television is 525 lines high (including overscan) which means 530 pixels fits with only five extra
pixels (to show that the canvas does not cut off the raster)
NTSC scanlines are 63.5us (microseconds) wide (continuous signal, no pixels)
As our clock cycle is ~2Mhz, 127 clock ticks pass per scanline
pixels are 4 real pixels wide, 127 * 4 = 508, so 42 extra pixels (again, to demonstrate that nothing is cut off) */

//width/height of canvas (in real pixels)
const tvWidth = 550;
const tvHeight = 530;
const pixelWidth = 2;//was 4
//top left of screen, can be changed to crop overscan
const hrzRestart = 0;
const vrtRestart = 0;
//The minimal length of a sync signal needed activate a sync
//These numbers are geared for a ~2Mhz NTSC chip
const hSyncThreshold = 8;
const vSyncThreshold = 64;
//Called by setup routine
function setupTV()
{
	sCanvas = document.getElementById("screenCanvas");
	sCtx = sCanvas.getContext("2d");
	sCanvas.width = tvWidth;
	sCanvas.height = tvHeight;
	sCanvas.backGroundColor = tvBackgroundColor;
	hPos = hrzRestart;
	vPos = vrtRestart;
}
/*
*	Updates the simulated TV output
*	called in the halfStep() function
*/
function forwardTV()
{
	var drawColor = emptyColor;
	var synced = false;
	if(isNodeHigh(nodenames['pin2Sync']))
	{
		drawColor = syncColor;
		syncCount = syncCount + 1;
		synced = true;
	}
	else if(isNodeHigh(nodenames['pin2Colorburst']))
		drawColor = '#00FFFF';
	else if(isNodeHigh(nodenames['pin2LVideo']))
		drawColor = leftPlayerColor;
	else if(isNodeHigh(nodenames['pin2RVideo']))
		drawColor = rightPlayerColor;
	else if(isNodeHigh(nodenames['pin2Bounds']))
		drawColor = fieldColor;
	else if(isNodeHigh(nodenames['pin2Background']))
		drawColor = ballColor;
	//if(isNodeHigh(nodenames['outputSEshifter']))
	//	drawColor = '#00C0C0';
	//if(isNodeHigh(nodenames['pin2Strobe1'])||isNodeHigh(nodenames['pin2Strobe2'])||isNodeHigh(nodenames['pin2Strobe3'])||isNodeHigh(nodenames['pin2Strobe4']))
	//	drawColor = '#C000C0';
	if(synced==false)
	{
		if(syncCount>vSyncThreshold)
		{
			vPos = vrtRestart;
			hPos = hrzRestart - 1;
			halfShift = !halfShift;
			updateOnSync(true);
		}
		else if(syncCount>=hSyncThreshold)
		{
			updateOnSync(false);
			vPos = vPos + 1;
			hPos = hrzRestart - 1;
		}
		syncCount = 0;
	}
	drawPix(drawColor);
	hPos = hPos + 1;
	if(currentState!=null)
	{
		//Store our current scanning location inside the trace/undo array
		currentState.vPos = vPos;
		currentState.hPos = hPos;
		currentState.halfShift = halfShift;
		currentState.syncCount = currentState.syncCount;
	}
	//We clear the next pixel to be generated, showing where the scan line is
	drawPix(scanColor);
}
//Called by the stepBack() function
function backwardTV()
{
	drawPix(undoColor);
	hPos = currentState.hPos;
	vPos = currentState.vPos;
	syncCount = currentState.syncCount;
	halfShift = currentState.halfShift;
	//We clear the next pixel to be generated, showing where the scan line is
	drawPix(scanColor);
}
/*
* Draws a single pixel (Thats a simulated pixel not a real pixel)
* Technically pixels do not exist in analog television, however the chip has
* a max clock rate at which it updates (For the AY-3-8500, ~2Mhz) which defines 
* horizontal width of the "pixels"
*/
function drawPix(drawColor)
{
	//Double vertical position, as TV is interlaced
	var yPos = vPos * 2;
	//Shift the even fields by 1 pixel
	//We shift both by -0.5 pixels to prevent
	//Canvas blurring sorcery
	if(halfShift)
	{
		yPos = yPos - 0.5;
	}
	else
	{
		yPos = yPos + 0.5;
	}
	sCtx.strokeStyle = drawColor;
	sCtx.beginPath();
	sCtx.moveTo(hPos * pixelWidth,yPos);
	sCtx.lineTo((hPos * pixelWidth) + pixelWidth,yPos);
	sCtx.stroke();
}

