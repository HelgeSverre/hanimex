 /*
 Copyright (c) 2010 Ed Spittles
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
* support.js for the AY-3-8500
* Contains chip-specific support functions and values
* These may override the defaults in macros.js
*/
chipname='AY-3-8606';

grChipSize=2000;
undoSize = 400;//400 undo steps, just over 3 scanlines
ngnd = nodenames['gnd'];
npwr = nodenames['vcc'];

nodenamereset = 'reset';

//No advanced logging has been introduced for this chip, yet
presetLogLists=[];
var lPaddleThreshold;
var rPaddleThreshold;
var lPaddleCharge;
var rPaddleCharge;
var gameNum;

//sets up anything chip-specific
function setupSpecial()
{
	setupTV();
}

// simulate a single clock phase with no update to graphics or trace
function halfStep()
{
	var clk = isNodeHigh(nodenames['clk']);
	if (clk) {setLow('clk');	forwardTV();} 
	else {setHigh('clk'); }
	/*if(isNodeHigh(nodenames['vsyncON']))
	{
		setLow("pinLPin");
		setLow("pinRPin");
		lPaddleCharge = 0;
		rPaddleCharge = 0;
	}*/
}

function updateFields()
{
	gameNum = parseInt(document.getElementById("GameInput").value);
	setPd("pinS1",true);
	setPd("pinS2",true);
	setPd("pinS3",true);
	//setCounter('R',document.getElementById("ScoreInput1").value);
	//setCounter('L',document.getElementById("ScoreInput2").value);
	lPaddleThreshold = document.getElementById("PaddleInput1").value;
	rPaddleThreshold = document.getElementById("PaddleInput2").value;
}
/*
* Sets a score counter to the value passed to it
*/
function setCounter(side,score)
{
	force('scr'+side+'0u',(score & 1) != 0);
	force('scr'+side+'1u',(score & 2) != 0);
	force('scr'+side+'2u',(score & 4) != 0);
	force('scr'+side+'3u',(score & 8) != 0);
	force('scr'+side+'0l',(score & 1) != 0);
	force('scr'+side+'1l',(score & 2) != 0);
	force('scr'+side+'2l',(score & 4) != 0);
	force('scr'+side+'3l',(score & 8) != 0);
	//We have prepped the nodes for forcing, now we trigger a force run
	runForce();
}
/*
* Initializes the chips state
* First it turns all nodes (except power) and transistors off
* Sets various nodes such as pins to correct values with initNodeValues()
* then runs a full update
*/
function initChip()
{
   var start = now();
	for(var nn in nodes)
	{
		//Apparently the float property is unused
		nodes[nn].state = false;
		nodes[nn].float = true;
	}

	nodes[ngnd].state = false;
	nodes[ngnd].float = false;
	nodes[npwr].state = true;
	nodes[npwr].float = false;
	for(var tn in transistors) transistors[tn].on = (transistors[tn].gate==npwr);//changed to power always powered transistors
	initNodeValues();
	//The following line does not appear to be needed. I do not know its original purpose in the 6502 sim
	//for(var i=0;i<6;i++){halfStep();} // avoid updating graphics and trace buffer before user code
	refresh();
	lPaddleCharge = 0;
	rPaddleCharge = 0;
	cycle = 0;
	farthestCycle = 0;
	trace = Array();
	if(typeof expertMode != "undefined")
		updateLogList();
	chipStatus();
	if(ctrace)console.log('initChip done after', now()-start);
}

/*
* Set any nodes, besides the ground and power ones, to default values
*/
function initNodeValues()						
{
	setPd('pinS1',true);
	setPd('pinS2',true);
	setPd('pinS3',true);
	setPd('pinBallspeed',true);
	setPd('pinBallsize',true);
	setPd('pinBatsize',true);
	setPd('pinRightServe',true);
	setPd('pinTest1',true);
	setPd('pinTest2',true);
	setPd('pinLeftServe',true);
	setPd('reset',false);
	recalcNodeList(allNodes());
	//Once the chip becomes stable, we turn off the reset (active low)
	setPd('reset',true);
	//Then force the sync flip flops into off state (so the user doesn't have to wait)
	/*force('hsyncON',false);
	force('hsyncNOT_ON',true);
	force('vsyncON',false);
	force('vsyncNOT_ON',true);*/
	//Then we update the scores with whatever the default values are
	updateFields();
	recalcNodeList(allNodes());
}
/*
* Called by the toggle pin checkboxes
*/
function updateInputs(pinName, state)
{
	if(state)
	{
		setPd(pinName,false);
	}
	else
	{
		setPd(pinName,true);
	}
	recalcNodeList(allNodes()); 
	//Update the drawing, but only if the simulation is paused and graphics enabled
	if(!running && animateChipLayout)
		refresh();
}
//The only change between this and the original stepBack()
//is that we now call the backwardTV() function
function stepBack()
{
	var traceAt = --cycle;
	if(farthestCycle>=undoSize)
	{
		traceAt = undoSize - (farthestCycle - (cycle));
	}
	if(traceAt<0) return;
	currentState = trace[traceAt];
	showState(currentState.chip);
	backwardTV();
	chipStatus();
}
function updateOnSync(isVsync)
{
	if(isVsync)
	{
		setLow("pinLeftBat");
		setLow("pinRightBat");
		lPaddleCharge = 0;
		rPaddleCharge = 0;
	}
	else
	{
		lPaddleCharge++;
		rPaddleCharge++;
		if(lPaddleCharge==lPaddleThreshold)
			setHigh("pinLeftBat");
		if(rPaddleCharge==rPaddleThreshold)
			setHigh("pinRightBat");
		//This could be compressed with a % function
		switch(gameNum)
		{
			case(1):setHL("pinS1",!isNodeHigh(nodenames['pin2Strobe1']));break;
			case(2):setHL("pinS1",!isNodeHigh(nodenames['pin2Strobe2']));break;
			case(3):setHL("pinS1",!isNodeHigh(nodenames['pin2Strobe3']));break;
			case(4):setHL("pinS1",!isNodeHigh(nodenames['pin2Strobe4']));break;
			case(5):setHL("pinS2",!isNodeHigh(nodenames['pin2Strobe1']));break;
			case(6):setHL("pinS2",!isNodeHigh(nodenames['pin2Strobe2']));break;
			case(7):setHL("pinS2",!isNodeHigh(nodenames['pin2Strobe3']));break;
			case(8):setHL("pinS2",!isNodeHigh(nodenames['pin2Strobe4']));break;
			case(9):setHL("pinS3",!isNodeHigh(nodenames['pin2Strobe1']));break;
			case(10):setHL("pinS3",!isNodeHigh(nodenames['pin2Strobe2']));break;
		}
	}
}
//Updates the status on the control panel
function chipStatus()
{
	var line1 = "Cycle: "+cycle+" "+"Speed: " + estimatedHz().toFixed(2) + " Hz";
	var line2 = chipStatusLine;
	setStatus(line1,line2);
}
//Currently the chip does not save any of its info to URLs
function readParam(name,value)
{
	return true;
}
