const json2csvParser = require("json2csv").Parser;
const fs = require("fs");

let data = require("./scouting.matchscoutingreports.json");
let output = [];


for(var i = 0; i < data.length; i++){
	if(data[i]["crossedLineInAutonomous"] && data[i]["crossedLineInAutonomous"] == "Yes"){
		data[i]["crossedLineInAutonomous"] = 1;
	} else if(data[i]["crossedLineInAutonomous"] && data[i]["crossedLineInAutonomous"] == "No"){
		data[i]["crossedLineInAutonomous"] = 0;
	}
}

let getValues = (teamData, key) => teamData.map(a => a[key]).filter(a=>a!=undefined);

let getAverage = (values) => {
	//console.log(values)
	let sum = 0;
	for(var i = 0; i < values.length; i++){
		sum += values[i];
	}
	if(values.length == 0){
		return 0;
	}
	return sum/values.length+0.0;

}

let removeDuplicates = (array) => {
	let newArray = [];
	for(var i = 0; i < array.length; i++)
		if(!newArray.includes(array[i]))
			newArray.push(array[i])
	return newArray
}

let min = (array) => {
	let currentMin = 10000;
	for(var i = 0; i < array.length; i++){
		if(currentMin > array[i]){
			currentMin = array[i];
		}
	}
	return currentMin;
}

let max = (array) => {
	let currentMax = -10000;
	for(var i = 0; i < array.length; i++){
		if(currentMax < array[i]){
			currentMax = array[i];
		}
	}
	return currentMax;
}

function standardDeviation(values){
  var avg = average(values);
  
  var squareDiffs = values.map(function(value){
    var diff = value - avg;
    var sqrDiff = diff * diff;
    return sqrDiff;
  });
  
  var avgSquareDiff = average(squareDiffs);

  var stdDev = Math.sqrt(avgSquareDiff);
  return stdDev;
}

function average(data){
  var sum = data.reduce(function(sum, value){
    return sum + value;
  }, 0);

  var avg = sum / data.length;
  return avg;
}

let averageValues = (teamData, key) => getAverage(getValues(teamData, key));
let zeroAverageValues = (teamData, key) => getAverage(getValues(teamData, key).filter(a => a != 0));

// Find teams
let teams = removeDuplicates(data.map(a => a.team));


// Find all fields
const uncookedFields = [];
for(var i = 0; i < teams.length; i++){
	let rawFields = data.filter(a => (a.team == teams[i]));
	for(var x = 0; x < rawFields.length; x++){
		for(y = 0; y < Object.keys(rawFields[x]).length; y++){
			uncookedFields.push(Object.keys(rawFields[x])[y])
		}
	}
}
var ignoredFields = ["_id", "submittedBy", "submittedAt", "__v", "matchNumber"]
fields = removeDuplicates(uncookedFields).filter(a => !ignoredFields.includes(a));
var allTheFields = [];
for(var i = 0; i < fields.length; i++){
	allTheFields.push(fields[i]);
}

function processFields(rawTeamData, field, teamData){
	var values = getValues(rawTeamData, field);
	if(fields.length < 1)
		return

	if(field == "climbTimeInTeleop"){
		for(var i = 0; i < values.length; i++){
			values[i] = parseFloat(values[i]);
		}
	}

	if(field == "tournament"){
		teamData.tournament = removeDuplicates(values);
		return;
	}

	if(field == "team"){
		teamData.team = values[0];
		return;
	}

	if(typeof(values[0]) == 'number'){
		teamData[field+"Averaged"] = averageValues(rawTeamData, field);
		teamData[field+"ZeroAveraged"] = zeroAverageValues(rawTeamData, field);
		teamData[field+"Min"] = min(getValues(rawTeamData, field));
		teamData[field+"Max"] = max(getValues(rawTeamData, field));
		teamData[field+"SD"] = standardDeviation(getValues(rawTeamData, field))
		allTheFields.push(field+"Averaged");
		allTheFields.push(field+"ZeroAveraged");
		allTheFields.push(field+"Min");
		allTheFields.push(field+"Max");
		allTheFields.push(field+"SD");

		teamData[field] = "[multiple]"
	} else if(typeof(values[0]) == 'string'){
		teamData[field] = values;
	}

}


for(var i = 0; i < teams.length; i++){
 	let rawTeamData = data.filter(a => (a.team == teams[i]))
	let teamData = {};

	for(var x = 0; x < fields.length; x++){
		processFields(rawTeamData, fields[x], teamData);
	}
	
	output.push(teamData)
}

allTheFields = removeDuplicates(allTheFields);
const parser = new json2csvParser({fields: allTheFields})
const csv = parser.parse(output);


fs.writeFile("./output.csv", csv, err => console.log)