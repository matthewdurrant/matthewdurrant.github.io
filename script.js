//The buttons for adding to list, and exporting the subscription.properties
var addBtn = document.querySelector("#addToList");
var subBtn = document.querySelector("#makeSubProps");
var zipBtn = document.querySelector("#downloadZip");

//for adding a new attribute filter
var addAttrBtn = document.querySelector("#attrBtn");

//the form inputs
var sourceCatInput = document.querySelector("#sourceCatalog");
var subscriberIdInput = document.querySelector("#subscriberId");
var bandInput = document.querySelector("#band");
var lotInput = document.querySelector("#lot");
var discountInput = document.querySelector("#discount");
//table to display current files
var subsTable = document.querySelector("#subsTable tbody");
//table for current attributes
var attrTable = document.querySelector("#attrTable tbody");

//attribute form inputs
var attrNameInput = document.querySelector("#attributeName");
var attrValueInput = document.querySelector("#attributeValue");

//last row added to table
var lastRow;

//stores groovyFile objects
var groovyFiles = [];

//if form is filled in correctly, add the data
addBtn.addEventListener("click", function() {

	if (document.querySelector("#mainForm").reportValidity())
	{
		// console.log("Adding to list...");
		addSubscription();
	}
}
);

zipBtn.addEventListener("click", function() {

	var zip = new JSZip();
	groovyFiles.forEach(function(file) {
		//add to zip
		zip.folder(file.folder).file(file.fileName, file.toGroovy());
	});

	//add the subscription.properties file
	zip.file("subscriptions.properties", getSubscriptionProperties());
	

	//zip the file and offer for download
	zip.generateAsync({type:"blob"})
	.then(function (blob) {
		saveAs(blob, "subscriptions.zip");
	});
});

//add a new attribute
var newFileAttributes = [];
addAttrBtn.addEventListener("click", function() {
	if (document.querySelector("#attrForm").reportValidity())
	{
		addAttribute();
	}
})	

function addAttribute() {
	newFileAttributes[attrNameInput.value.toString()] = "'" + attrValueInput.value + "'";
	//Clear form
	attrNameInput.value = null;
	attrValueInput.value = null;

	//Also add to table. TODO reuse code properly
	//make table unhidden
	document.querySelector("#attrTableDiv").classList.remove("hidden");
	//clear old tableDiv
	$("#attrTable tbody tr").remove();
	//Insert new rows
	Object.keys(newFileAttributes).forEach(function(key) {
		var newRow = attrTable.insertRow();
		newRow.insertCell(0).textContent = key;
		newRow.insertCell(1).textContent = newFileAttributes[key];
	})
}

//update a 4 cell table row with new file data
function addDataToTable(newRow, newFile, newSub, index)
{
	newRow.insertCell(0).textContent = newFile.sourceCatalog;
	newRow.insertCell(1).textContent = newFile.customerId;
	newRow.insertCell(2).style.whiteSpace = "pre"; //fixes newline
	newRow.insertCell(3).innerHTML = "<code>./subscriptions/" + newFile.folder + "/<a role='button' download='file.groovy' id='download-" + index + "'>Download</a></code>";
}

//array to hold the text file objects for download
var textFiles = [];
//holds the subscription.properties text file
var subFile;
//create a text file from a string
function makeTextFile(text, file) {
	//Replace LF line endings with CRLF (to support Windows Notepad)
	text = text.replace(/\n/g, "\r\n");

	var data = new Blob([text], {type: 'text/plain'});
    // If we are replacing a previously generated file we need to
    // manually revoke the object URL to avoid memory leaks.
    if (file !== null) {
    	window.URL.revokeObjectURL(file);
    }
    file = window.URL.createObjectURL(data);
    return file;
}

//Create the subscription.properties text file
function getSubscriptionProperties() {
	//Go through files, pick up customer ids and assign to relevant unique catalog
	var uniqueCats = []; //an array of the unique subscriptionProperty lines (e.g. "S00001-0000=ABC,DEF")
	//go through the groovyFile objects...
	groovyFiles.forEach(function(file) { 
		var targetCat = null;
		//check if this groovyFile's sourceCatalog was already created
		uniqueCats.forEach(function(cat) {
			if (cat.sourceCatalog === file.sourceCatalog)
			{
				targetCat = cat; //use existing subscriptionProperty in uniqueCats
			}
		});
		//if subscriptionProperty for this sourceCatalog doesn't exist, add one
		if (targetCat === null)
		{ 
			targetCat = new subscriptionProperty(file.sourceCatalog); //create new subscriptionProperty for this sourceCatalog
			uniqueCats.push(targetCat); //add to our list of subscriptionProperties
		}
		targetCat.customers.push(file.customerId); //add the customer id from this groovyFile to the subscriptionProperty's customer array
	});

	//get the subscriptionProperty to return its sourceCatalog and a comma-separated list of customer IDs
	//e.g. "S00001-0000=ABC,DEF"
	//then join all the subscriptionProperties with a newline character
	return uniqueCats.map(function(cat) { return cat.toString(); } ).join("\r\n");
}

function addSubscription() {
	//When user clicks "Add to list", create or update our array of files
	//get inputs from form
	var sourceCatalog = sourceCatInput.value;
	var subscriberId = subscriberIdInput.value;
	var priceType;
	//If both inputs are *, output * only - else, join
	if (bandInput.value === '*' && lotInput.value === '*')
		{ priceType = '*';}
	else priceType = bandInput.value + "-" + lotInput.value;
	var discount = discountInput.value;

	var newFile = null;
	//Does a file already exist for this catalog and subscriber?
	groovyFiles.forEach(function(file) {
		if (file.sourceCatalog === sourceCatalog && file.customerId === subscriberId)
		{
			newFile = file;
		}
	});
	//if no newFile found, create new file
	if (newFile === null)
	{
		newFile = new groovyFile(sourceCatalog, subscriberId);
		groovyFiles.push(newFile);
	}
	var index = groovyFiles.indexOf(newFile);
	//create attributes array	
	var attributes = $.extend( {}, newFileAttributes)
	//reset working array and table
	newFileAttributes = [];
	document.querySelector("#attrTableDiv").classList.add("hidden");
	$("#attrTable tbody tr").remove();
	//Create new anonymous subscription object
	var newSub = [{	
		contractId: "'" + sourceCatalog + "'",
		classificationId: "'*'",
		classificationGroupId: "'*'",
		priceType: "'" + priceType + "'",
		attributes: [attributes],
		discount: "'" + discount + "'"
	}];




	//Add this new subscription to our file
	newFile.contents.subscription.push(newSub);

	//Also add to table.
	//Remove any existing formatting.
	if (lastRow != null) lastRow.classList.remove("success");
	//Insert new row with class success.
	var newRow;
	//If file index not in table, add a new row with data.
	if (index + 1 > subsTable.rows.length)
	{
		newRow = subsTable.insertRow();
		addDataToTable(newRow, newFile, newSub, index);
	}
	else //Update existing row.
	{
		newRow = subsTable.rows[index];
		//newRow.cells[2].textContent = newFile.contents.subscription.length + " (hover to view)";
	}
	//Update list of subscriptions for this row
	newRow.cells[2].textContent = newFile.getSubscriptions();
	lastRow = newRow;

	//Update download button
	var btn = document.querySelector("#download-" + index);
	btn.href = makeTextFile(newFile.toGroovy(), textFiles[index]);
	btn.download = newFile.fileName;
	btn.textContent = newFile.fileName;

	//Update subscriptions button
	subBtn.href = makeTextFile(getSubscriptionProperties(), subFile);

	//show the other download buttons and the table
	subBtn.classList.remove("hidden");
	zipBtn.classList.remove("hidden");
	document.querySelector("#tableDiv").classList.remove("hidden");

	newRow.classList.add("success");

}

//this object is exported as a .groovy script file for a syndication.
class groovyFile {
	constructor(sourceCatalog, customerId)
	{
		this.sourceCatalog = sourceCatalog;
		this.customerId = customerId;
		this.fileName = customerId + ".groovy";
		this.folder = sourceCatalog;
		this.contents = new contents(sourceCatalog, customerId);
	}

	//return the subscriptions on this syndication
	//used as the description in the table
	getSubscriptions() {
		var subsDesc= [];
		this.contents.subscription.forEach(function(sub) {
			subsDesc.push(sub[0].priceType + ", " + sub[0].discount + "%");
		});
		return subsDesc.join("\n");
	}

	//convert this entire JavaScript object to a Groovy script through some technical wizardry
	toGroovy() {
		//Convert this object to JSON.
		var outputString = JSON.stringify(this.contents, null, ' ');
		console.log(outputString);
		//Convert JSON to Groovy script.
		//This is hackish but works well - simply delete JSON's curly braces
		//and double quotes.
		const regex = /{|}|"/g;
		return '[' + outputString.replace(regex,'')  + ']';
	}
}

//used to keep the Groovy script contents separate from metadata (file name, etc.)
class contents {
	constructor(sourceCatalog, subscriberId) {
		//Syndication array, which really only contains one anonymous object
		this.syndication = [ { 
			//Wrap everything in single quotes
			//so it survives the object-JSON-groovy transition
			targetCatalog: "'" + sourceCatalog + '-' + subscriberId + "'",
			targetSupplier: "'" + sourceCatalog.split("-")[0] + "'",
			targetContract: "'" + sourceCatalog + '-' + subscriberId + "'",
		} ];
		//Subscription array, which will contain 1+ anonymous objects
		this.subscription = [];
	}
}

//to be used in the subscriptions.properties file
class subscriptionProperty {
	constructor(sourceCatalog)
	{
		this.sourceCatalog = sourceCatalog;
		this.customers = [];
	}

	//returns one line of the subscriptions.properties file
	//eg. "S00001-0000=ABC,DEF"
	toString() {
		return this.sourceCatalog + "=" + this.customers.join();
	}

}