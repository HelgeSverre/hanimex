/*
 Copyright (c) 2010 Brian Silverman, Barry Silverman
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
*chipsim.js handles the logical runtime part of the simulation
*independent of specific chip features, visuals, chip setup, or user input
*/

var ctrace = false;

//Logs anytime the code attempts to read/modify a node with an invalid name
//Different from ctrace as ctrace produces lots of possibly unwanted data
var badnodetrace = true;
var traceTheseNodes = [];
var traceTheseTransistors = [];
var loglevel = 0;

//The list of nodes marked for updating
var recalclist = new Array();
//A list of booleans which specify if node #X is in the recalc list
var recalcHash = new Array();
var group = new Array();
//A list of nodes armed for forcing (see force() and runForce())
var forceList = new Array();
var forcedRun = false;

/*
* Checks every listed node for changes and if
* a node changes, the affected ones will be updated as well
* It will repeat this until no more nodes change state (Chip is electrically stable)
* or the loop limiter runs out
*/
function recalcNodeList(list)
{
	var n = list[0];
	recalclist = new Array();
	recalcHash = new Array();
	var limiter = 100;
	for(var j=0;j<100;j++){		// loop limiter
		if(list.length==0) return;
		if(ctrace) {
			var i;
			for(i=0;i<traceTheseNodes.length;i++) {
				if(list.indexOf(traceTheseNodes[i])!=-1) break;
			}
			if((traceTheseNodes.length==0)||(list.indexOf(traceTheseNodes[i])==-1)) {
				console.log('recalcNodeList iteration: ', j, list.length, 'nodes');
			} else {
				console.log('recalcNodeList iteration: ', j, list.length, 'nodes', list);
			}
		}
		list.forEach(recalcNode);
		list = recalclist;
		recalclist = new Array();
		recalcHash = new Array();
	}
	console.log("Alert: Unstable state, reached loop limiter of "+limiter);
	hiliteNode(list);
	if(ctrace) console.log(n,'looping...');
}

/*
* Finds all nodes currently connected to given node
* decides state of nodegroup, then sets all nodes in the group
* to the new state
* If any nodes change state, their transistors will change state
* Those transistors will then mark their source/drain nodes for possible updates,
* which will be processed in the next recalc cycle
*/
function recalcNode(node)
{
	if(node==ngnd||node==npwr)
		return;
	getNodeGroup(node);
	var newState = getNodeValue();
	if(ctrace && (traceTheseNodes.indexOf(node)!=-1))
		console.log('recalc', node, group);
	group.forEach(function(i){
		var n = nodes[i];
		if(n.state==newState||n.num==npwr) return;//The Vcc node might be in a group now, so we are sure to not update it
		n.state = newState;
		n.gates.forEach(function(t){
			if(n.state) turnTransistorOn(t);
			else turnTransistorOff(t);});
	});
}
function turnTransistorOn(t)
{
	if(t.on) return;
	if(ctrace && (traceTheseTransistors.indexOf(t.name)!=-1))
		console.log(t.name, 'on', t.gate, t.c1, t.c2);
	t.on = true;
	addRecalcNode(t.c1);
}
	
function turnTransistorOff(t)
{
	if(!t.on) return;
	if(ctrace && (traceTheseTransistors.indexOf(t.name)!=-1))
		console.log(t.name, 'off', t.gate, t.c1, t.c2);
	t.on = false;
	addRecalcNode(t.c1);
	addRecalcNode(t.c2);
}
/*
* Adds a new node to the recalc list (To be run next cycle)
* But only if the node is not already on the list (or power/ground)
*/
function addRecalcNode(nn)
{
       if(nn==ngnd) return;
       if(nn==npwr) return;
       if(recalcHash[nn] == 1)return; 
       recalclist.push(nn);
       recalcHash[nn] = 1;
}

function getNodeGroup(i)
{
	group = new Array();
	addNodeToGroup(i);
}
/*
* Finds all nodes that are (currently) connected
* to an initial node
*/
function addNodeToGroup(i)
{
	if(group.indexOf(i) != -1) return;
	group.push(i);
	if(i==ngnd) return;
	if(i==npwr) return;
	nodes[i].c1c2s.forEach(
		function(t){
			if(!t.on) return;
			var other;
			if(t.c1==i) other=t.c2;
			if(t.c2==i) other=t.c1;
			addNodeToGroup(other);});
}

/*
* Gets the state of the entire group of nodes
*/
function getNodeValue()
{
	//force code
	//Only search for forced nodes if this is a forced run, otherwise we lose a large chunk of performance
	//(>50% Hz lost in tests)
	if(forcedRun)
	{
		for(var i in group)
		{
			var nn = group[i];
			var n = nodes[nn];
			if(n.forced)
			return n.forcedState;
		}
	}
	if(arrayContains(group, ngnd)) return false;
	if(arrayContains(group, npwr)) return true;
	for(var i in group)
	{
		var nn = group[i];
		var n = nodes[nn];
		if(n.pullup) return true;
		if(n.pulldown) return false;
		if(n.state) return true;
	}
	return false;
}

/*
* Checks if a node is a logical 1 or 0
* TODO: Add green_state/underage/driving test and arrest node
* if illegal
*/
function isNodeHigh(nn)
{
	if(nodes[nn]==null)
	{
		if(badnodetrace)
			console.log("Invalid node name used: "+nn);
		return;
	}
	return(nodes[nn].state);
}

function saveString(name, str)
{
	var request = new XMLHttpRequest();
	request.onreadystatechange=function(){};
	request.open('PUT', 'save.php?name='+name, true);
	request.setRequestHeader('Content-Type', 'text/plain');
	request.send(str);
}

function allNodes()
{
	var res = new Array();
	var ii = 0;
	for(var i in nodes)
	{
		// Don't feed numeric strings to recalcNodeList(). Numeric
		// strings can cause a (data dependent) duplicate node number
		// hiccup when accumulating a node group's list, ie:
		// group => [ "49", 483, 49 ]
		ii = Number( i );
		if((ii!=npwr)&&(ii!=ngnd)) res.push(ii);
	}
	return res;
}
/*
* Writes the state of all the chip's nodes to a string of (mostly) 'h' and 'l's
*/
function stateString()
{
	var codes = ['l','h'];
	var res = '';
	//Interesting fact, the limiter was hardcoded at 1725
	for(var i=0;i<nodes.length;i++){
		var n = nodes[i];
		if(n==undefined) res+='x';
		else if(i==ngnd) res+='g';
		else if(i==npwr) res+='v';
		else res+= codes[0+n.state];
	}
	return res;
}

function showState(str)
{
	var codes = {g: false, h: true, v: true, l: false};
	for(var i=0;i<str.length;i++){
		if(str[i]=='x') continue;
		var state = codes[str[i]];
		nodes[i].state = state;
		var gates = nodes[i].gates;
		gates.forEach(function(t){t.on=state;});
	}
	refresh();
}

/*
* The below functions are used to modify the chip's state
* setHigh/setLow force a node into a state, 
* setPd (Pd = pulldown) does the same but does not update anything
* Set HL is simply setHigh with the requested pull set as an argument
*/
function setPd(name,isHigh)
{
	var nn = nodenames[name];
	if(nodes[nn]==null)
	{
		if(badnodetrace)
			console.log("Invalid node name used: "+name);
		return;
	}
	nodes[nn].pullup = isHigh;
	nodes[nn].pulldown = !isHigh;
}

function setHigh(name)
{
	var nn = nodenames[name];
	if(nodes[nn]==null)
	{
		if(badnodetrace)
			console.log("Invalid node name used: "+name);
		return;
	}
	nodes[nn].pullup = true;
	nodes[nn].pulldown = false;
	recalcNodeList([nn]);
}

function setLow(name)
{
	var nn = nodenames[name];
	if(nodes[nn]==null)
	{
		if(badnodetrace)
			console.log("Invalid node name used: "+nn);
		return;
	}
	nodes[nn].pullup = false;
	nodes[nn].pulldown = true;
	recalcNodeList([nn]);
}
function setHL(name,isHigh)
{
	if(isHigh)
		setHigh(name);
	else 
		setLow(name);
}
/*
* This arms a node for forcing
*/
function force(name,isHigh)
{
	var nn = nodenames[name];
	if(nodes[nn]==null)
	{
		if(badnodetrace)
			console.log("Invalid node name used: "+nn);
		return;
	}
	nodes[nn].forced = true;
	nodes[nn].forcedState = isHigh;
	forceList.push(nodes[nn]);
}
/*
* Refreshes the chip, with forced nodes stuck in forced states
* A forced node's state takes priority over anything else, including connection to ground
* Once it is done, we de-arm the forced nodes so they need to be armed again
*/
function runForce()
{
	forcedRun = true;
	recalcNodeList(allNodes());
	forcedRun = false;
	for(var a in forceList)
	{
		var n = forceList[a];
		n.forced = false;
	}
	forceList = [];
}
function arrayContains(arr, el){return arr.indexOf(el)!=-1;}
