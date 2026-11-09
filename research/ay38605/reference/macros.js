/*
 Copyright (c) 2010 Brian Silverman, Barry Silverman, Ed Spittles, Achim Breidenbach
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
* macros.js once handled the special functions related to the IO of the 6502 chip
* some of its methods were overridden by support.js to interact with the 6800 chip instead
* NOW macros.js contains generic functions most chips will use, while support.js contains code
* geared towards the specific chip
*
* NOTE:
* Most of the microprocesser specific code (e.g. reading/writing buses, program storage) has been
* removed. If you want to simulate a microprocesser, I would recommend checking out the original code
* @https://github.com/trebonian/visual6502/
*/
var cycle = 0;
var farthestCycle = 0;
var trace = Array();
var logstream = Array();
var running = false;
var logThese=[];
var chipStatusLine = "";

//These five varibles are defaults, and may be overwritten in support.js
var undoSize = 100;//Size of the undo array
var chipname='Generic';
var nodenamereset = 'reset';
var ngnd = nodenames['vss'];
var npwr = nodenames['vcc'];

var nodes = new Array();
var transistors = {};
var nodenamelist=[];


var chipLayoutIsVisible = true;  // only modified in expert mode

//setupNodes and setupTransistors were moved from wires.js (now render.js)
function setupNodes()
{
	for(var i in segdefs){
		var seg = segdefs[i];
		var w = seg[0];
		if(nodes[w]==undefined) 
			nodes[w] = {segs: new Array(), num: w, pullup: seg[1]=='+',
			            state: false, gates: new Array(), c1c2s: new Array()};
		//These lines can skip the ground or power nodes to make them unselectable
		//if(w==ngnd) continue;
		//if(w==npwr) continue;
		nodes[w].segs.push(seg.slice(3));
	}
}

function setupTransistors(){
	for(i in transdefs){
		var tdef = transdefs[i];
		var name = tdef[0];
		var gate = tdef[1];
		var c1 = tdef[2];
		var c2 = tdef[3];
		var bb = tdef[4];
		if(tdef[6])
			// just ignore all the 'weak' transistors for now
			continue;
		if(c1==ngnd) {c1=c2;c2=ngnd;}
		if(c1==npwr) {c1=c2;c2=npwr;}
		var trans = {name: name, on: false, gate: gate, c1: c1, c2: c2, bb: bb};
		nodes[gate].gates.push(trans);
		nodes[c1].c1c2s.push(trans);
		nodes[c2].c1c2s.push(trans);
		transistors[name] = trans;
	}
}
function go()
{
	if(typeof userSteps != "undefined")
	{
		if(--userSteps==0)
		{
			running=false;
			userSteps=undefined;
		}
	}
	if(running)
	{
      step();
	   setTimeout(go, 0); // schedule the next poll
   }
}

var currentState;

// simulate a single clock phase, updating trace and highlighting layout
function step()
{
	/*currentState stores the chip's state
	  As well as any other information needed for undoing/redoing
	such as info from the (possible) simulated TV screen*/
	currentState = {};
	currentState.chip = stateString();
	halfStep();
	if(animateChipLayout)
		refresh();
	cycle++;
	trace.push(currentState);
	if(cycle>farthestCycle)
	{
		//If our trace array gets full, we get rid of the oldest elements
		if(cycle>undoSize) trace.shift();
		farthestCycle++;
	}
	chipStatus();
}

// triggers for breakpoints, watchpoints, input pin events
// almost always are undefined when tested, so minimal impact on performance
clockTriggers={};
writeTriggers={};
readTriggers={};
fetchTriggers={};
fetchTriggers={};
//The AY-3-8500 does not use these

/*
* These five functions are called by four control panel buttons
*/
function runChip()
{
	var start = document.getElementById('start');
	var stop = document.getElementById('stop');
	start.style.visibility = 'hidden';
	stop.style.visibility = 'visible';
	if(typeof running == "undefined")
		initChip();
	running = true;
        go();
}

function stopChip()
{
	var start = document.getElementById('start');
	var stop = document.getElementById('stop');
	start.style.visibility = 'visible';
	stop.style.visibility = 'hidden';
	running = false;
}

function resetChip()
{
	stopChip();
        setStatus('resetting ' + chipname + '...');
	setTimeout(initChip,0);
}

function stepForward()
{
	if(typeof running == "undefined")
		initChip();
	stopChip();
	step();
}
//Overridden by support
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
	chipStatus();
}

//Overridden by support
function chipStatus()
{
	var machine3 = 
		"Speed: " + estimatedHz().toFixed(1) + " Hz";
	setStatus(machine3);
	if (logThese.length>1) {
		updateLogbox(logThese);
	}
	selectCell(ab);
}
//You guessed it, overridden by support
function setupSpecial(){}
//Overridden by support
//It reads and acts on a parameter from a URL, and returns true if there is an error
function readParam(name,value)
{
	return true;
}
// run for an extended number of cycles, with low overhead, for interactive programs or for benchmarking
//    note: to run an interactive program, use an URL like
//    http://visual6502.org/JSSim/expert.html?graphics=f&loglevel=-1&headlesssteps=-500
function goFor(n)
{
	if(n==0)
	{
		n = headlessSteps;
	}
	//  a negative value is a request to free-run
	if(headlessSteps<0)
		n=-n;
	var start = document.getElementById('start');
	var stop = document.getElementById('stop');
	start.style.visibility = 'hidden';
	stop.style.visibility = 'visible';
	if(typeof running == "undefined") {
		initChip();
	}
	running = true;
	setTimeout("instantaneousHz(); goForN("+n+")",0);
}

// helper function: allows us to poll 'running' without resetting it when we're re-scheduled
function goForN(n)
{
	var n2=n;  // save our parameter so we can re-submit ourselves
	while(n--)
	{
		//We only want to bother updating the trace/undo array in the final <undo size>
		//of a headless run. Otherwise we waste performance (~33% Hz) saving our chip
		//state to an array location which will be overwritten in milliseconds!
		if(n<=undoSize)
		{
			currentState = {};
			currentState.chip = stateString();
		}
		halfStep();
		cycle++;
		if(n<=undoSize)
		{
			trace.push(currentState);
			if(cycle>farthestCycle)
			{
				//We compare trace.length here as trace might not have been filled when we started
				if(trace.length>undoSize) trace.shift();
				farthestCycle = cycle;
			}
		}
	}
	instantaneousHz();
	chipStatus();
	if((headlessSteps<0) && running){
		setTimeout("goForN("+n2+")",0); // re-submit ourselves if we are meant to free-run
		return;
	}
	running = false;
	var start = document.getElementById('start');
	var stop = document.getElementById('stop');
	start.style.visibility = 'visible';
	stop.style.visibility = 'hidden';
	refresh();
}

var prevHzTimeStamp=0;
var prevHzCycleCount=0;
var prevHzEstimate1=1;
var prevHzEstimate2=1;
var HzSamplingRate=10;

// return an averaged speed: called periodically during normal running
function estimatedHz()
{
	if(cycle%HzSamplingRate!=3)
		return prevHzEstimate1;
	var HzTimeStamp = now();
	var HzEstimate = (cycle-prevHzCycleCount+.01)/(HzTimeStamp-prevHzTimeStamp+.01);
	HzEstimate=HzEstimate*1000/2; // convert from phases per millisecond to Hz
	if(HzEstimate<5)
		HzSamplingRate=5;  // quicker
	if(HzEstimate>10)
		HzSamplingRate=10; // smoother
	prevHzEstimate2=prevHzEstimate1;
	prevHzEstimate1=(HzEstimate+prevHzEstimate1+prevHzEstimate2)/3; // wrong way to average speeds
	prevHzTimeStamp=HzTimeStamp;
	prevHzCycleCount=cycle;
	return prevHzEstimate1
}

// return instantaneous speed: called twice, before and after a timed run using goFor()
function instantaneousHz()
{
	var HzTimeStamp = now();
	var HzEstimate = (cycle-prevHzCycleCount+.01)/(HzTimeStamp-prevHzTimeStamp+.01);
	HzEstimate=HzEstimate*1000/2; // convert from phases per millisecond to Hz
	prevHzEstimate1=HzEstimate;
	prevHzEstimate2=prevHzEstimate1;
	prevHzTimeStamp=HzTimeStamp;
	prevHzCycleCount=cycle;
	return prevHzEstimate1
}
/*
* Takes a varible # of status arguments and puts them onto the statbox
*/
function setStatus()
{
	var res = '';
	// pad the arguments to make this a three-line display
	// there must be a clean way to do this
	if(arguments[1]==undefined)arguments[1]="";
	if(arguments[2]==undefined)arguments[2]="";
	arguments.length=3;
	for(var i=0;i<arguments.length;i++) res=res+arguments[i]+'<br>';
	statbox.innerHTML = res;
}

function setupNodeNameList()
{
	for(var i in nodenames)
		nodenamelist.push(i);
}

function nodeName(n)
{
	for(var i in nodenames){
		if(nodenames[i]==n) return i;
	}
	return '';
}
/*
* The logbox is currently not used, and so are these functions
* I plan on possibly returning it in a future version
*/
var logbox;
function initLogbox(names){}
var logboxAppend=true;

// can append or prepend new states to the log table
// when we reverse direction we need to reorder the log stream
function updateLogDirection(){}

// update the table of signal values, by prepending or appending
function updateLogbox(names){}

function signalSet(n)
{
	/*var signals=[];
	for (var i=0; (i<=n)&&(i<presetLogLists.length) ; i++){
		for (var j=0; j<presetLogLists[i].length; j++){
			signals.push(presetLogLists[i][j]);
		}
	}
	return signals;*/
}
function updateLogList(names)
{
	/*// user supplied a list of signals, which we append to the set defined by loglevel
	logThese = signalSet(loglevel);
	if(typeof names == "undefined")
		// this is a UI call - read the text input
		names = document.getElementById('LogThese').value;
	else
		// this is an URL call - update the text input box
		document.getElementById('LogThese').value = names;
	names = names.split(/[\s,]+/);
	for(var i=0;i<names.length;i++){
		// could be a signal name, a node number, or a special name
		if(typeof busToString(names[i]) != "undefined")
			logThese.push(names[i]);
	}
	initLogbox(logThese);*/
}