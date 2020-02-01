window.RANDOM =
{
	endToken: String.fromCharCode(3),
	
	waitingDependencies: 0
};

window.RANDOM.generators =
{
	"name":
	{
		"fallout4":
		{
			"name": "Fallout 4 Names",
			"description": "Generates random names based on Codsworth's name list."
		},
		"eternity":
		{
			"name": "Pillars of Eternity Names",
			"description": "Generates random names based on character names in Pillars of Eternity."
		},
		"english":
		{
			"name": "English First Names",
			"description": "Generates random English(ish) first names (male or female)."
		},
		"mineral":
		{
			"name": "Mineral Names (Realistic)",
			"description": "Generates random names for realistic-sounding minerals. Seed data from Wikipedia:List of minerals."
		},
		"town_british":
		{
			"name": "Town Names (British)",
			"description": "Generates random names for British-sounding towns. Seed data from Wikipedia:List of towns in England."
		}
	},
	"title":
	{
		"videogame":
		{
			"name": "Video Game Titles",
			"description": "Generates random names for video games. Seed data collected from multiple Wikipedia categories."
		}
	}
};

window.RANDOM.loadGenerator = function(data)
{
	/*File format:
	type
		0: markov letters
		1: markov words
		NaN: equally-weighted list
	
	0/1:
	title
	desc
	order
	minTokens
	maxTokens
	startTokenCount
	{
		token
		nextTokenCount
		{
			token(s)
			frequency
		}
	}
	
	end
	*/
	
	var stream = {
		tokens: data.split(/\r?\n/),
		streamPos: 0,
		read: function()
		{
			if (this.eof())
			{
				console.error("Tried to read past end of token stream.");
				return "";
			}
			else
				return this.tokens[this.streamPos++];
		},
		eof: function()
		{
			return this.streamPos >= this.tokens.length;
		}
	};
	
	//Load data
	var generator = {};
	var first = stream.read();
	generator.type = parseInt(first);
	if (generator.type === 0 || generator.type === 1)
	{
		generator.title = stream.read();
		generator.description = stream.read();
		
		//Markov model
		generator.order = parseInt(stream.read());
		generator.minTokens = parseInt(stream.read());
		generator.maxTokens = parseInt(stream.read());
		generator.chain = [];
		var startTokens = parseInt(stream.read());
		for (var c = 0; c < startTokens; c++)
		{
			var cObj = {};
			var tokenc = stream.read();
			generator.chain[tokenc] = cObj;
			cObj.next = [];
			var nextTokens = parseInt(stream.read());
			for (var d = 0; d < nextTokens; d++)
			{
				var dObj = {};
				cObj.next[d] = dObj;
				dObj.token = stream.read();
				dObj.freq = parseInt(stream.read());
			}
		}
		
		//Create dependent data
		for (var c in generator.chain)
		{
			var cObj = generator.chain[c];
			
			//Sum frequencies
			cObj.totalFreq = 0;
			for (var i in cObj.next)
				cObj.totalFreq += cObj.next[i].freq;
		}
		
		generator.generate = window.RANDOM.markovGenerate;
	}
	else if (!generator.type)
	{
		//Random list, equal
		generator = [];
		generator.push(first);
		while (!stream.eof())
			generator.push(stream.read());
		generator.generate = window.RANDOM.listGenerate;
	}
	return generator;
}

window.RANDOM.loadDependencies = function(generator, callback)
{
	//HACK: identifying type by function
	if (generator && generator.generate == window.RANDOM.listGenerate)
	{
		for (var i = 0; i < generator.length; i++)
		{
			var split = generator[i].split("{{insert|");
			for (var e = 1; e < split.length; e++)
			{
				var split2 = split[e].split("}}");
				if (!this.isGeneratorLoaded(split2[0]))
				{
					console.log("got dep '" + split2[0]);
					window.RANDOM.waitingDependencies++;
					window.RANDOM.loadGeneratorFromUrl(split2[0], false, notifyDependencyFinished);
				}
			}
		}
	}
	
	callback();
}

window.RANDOM.getGenerator = function(id)
{
	var split = id.split("/");
	if (this.generators[split[0]])
	{
		return this.generators[split[0]][split[1]].generator;
	}
	else
	{
		return null;
	}
}

window.RANDOM.isGeneratorLoaded = function(id)
{
	return !!this.getGenerator(id);
}

var notifyDependencyFinished = function()
{
	console.log("finished dep");
	window.RANDOM.waitingDependencies--;
	if (window.RANDOM.waitingDependencies === 0)
	{
		onGenerate();
	}
}

window.RANDOM.loadGeneratorFromUrl = function(id, setAsPrimary, callback)
{
	var url = "data/" + id + ".txt";
	var idSplit = id.split("/");
	
	var request = new window.XMLHttpRequest();
	request.onreadystatechange=function()
	{
		if (request.readyState == 4)
		{
			if (request.status != 200)
			{
				document.getElementById("content-results").innerHTML = request.statusText;
				console.error("AJAX Error Response: " + request.statusText);
			}
			else
			{
				var generator = window.RANDOM.loadGenerator(request.responseText);
				if (!window.RANDOM.generators[idSplit[0]])
				{
					window.RANDOM.generators[idSplit[0]] = {};
				}
				if (!window.RANDOM.generators[idSplit[0]][idSplit[1]])
				{
					window.RANDOM.generators[idSplit[0]][idSplit[1]] = {};
				}
				var content = window.RANDOM.generators[idSplit[0]][idSplit[1]];
				content.generator = generator;
				if (setAsPrimary)
				{
					window.RANDOM.current = generator;
					var element = document.getElementById("generator-info");
					if (element)
					{
						element.innerHTML = "<b>" + content.name + "</b>: " + content.description;
					}
				}
				window.RANDOM.loadDependencies(generator, callback);
			}
		}
	};
	request.open("GET", url, true);
	request.setRequestHeader("content-type", "application/x-www-form-urlencoded")
	request.send();
	document.getElementById("content-results").innerHTML = "Loading...";
}

window.RANDOM.markovGenerate = function()
{
	var attemptsAllowed = 10;
	
	do
	{
	attemptsAllowed--;
	var result = "";
	var precedingTokens = [];
	
	do
	{
		//Create leading-up key
		var key = "";
		for (var d = 0; d < this.order && d < precedingTokens.length; d++)
		{
			if (this.type === 1 && d > 0)
				key = " " + key;
			key = precedingTokens[precedingTokens.length-d-1] + key;
		}
		
		//Select a succeeding character
		var cObj = this.chain[key];
		
		if (cObj === undefined)
		{
			console.error("markovGenerate: Undefined entry for key '" + key + "'.");
			return "*Error*";
		}
		
		var rnd = Math.floor(Math.random() * cObj.totalFreq);
		var token = undefined;
		for (var d = 0; d < cObj.next.length; d++)
		{
			if (rnd < cObj.next[d].freq)
			{
				token = cObj.next[d].token;
				break;
			}
			rnd -= cObj.next[d].freq;
		}
		
		//Append it
		if (token !== window.RANDOM.endToken)
		{
			if (this.type === 1)
				result += " ";
			result += token;
			
			precedingTokens.push(token);
		}
	} while (token !== window.RANDOM.endToken);
	
	} while (attemptsAllowed > 0 && (precedingTokens.length < this.minTokens || precedingTokens.length > this.maxTokens))
	//console.log("Range: " + this.minTokens + "-" + this.maxTokens);
	//console.log("Attempts Left: " + attemptsAllowed);
	return result;
}

window.RANDOM.listGenerate = function()
{
	var string = this[Math.floor(Math.random() * this.length)];
	
	// replace insert macros
	var split = string.split("{{insert|");
	string = split[0];
	for (var e = 1; e < split.length; e++)
	{
		var split2 = split[e].split("}}");
		var generator = window.RANDOM.getGenerator(split2[0]);
		console.log("generate off of " + split2[0]);
		string += generator.generate();
		string += split2[1];
	}
	
	return string;
}

var handleFileSelect = function(evt)
{
	var files = evt.target.files;
	if (files.length > 0)
	{
		var reader = new FileReader();
		reader.onload = function(e)
		{
			window.RANDOM.current = window.RANDOM.loadGenerator(e.target.result);
			onGenerate();
		}
		reader.readAsText(files[0]);
	}
}

var onGenerate = function()
{
	if (window.RANDOM.waitingDependencies > 0)
	{
		return;
	}
	if (!window.RANDOM.current)
	{
		document.getElementById("content-results").innerHTML = "Choose a generator below.";
		return;
	}
	
	var quantity = document.getElementById("genQty").value;
	var result = "";
	for (var d = 0; d < quantity; d++)
	{
		if (d > 0)
			result += "<br/>";
		result += window.RANDOM.current.generate();
	}
	document.getElementById("content-results").innerHTML = result;
}

var onAttachDom = function()
{
	document.getElementById("fileChooser").addEventListener('change', handleFileSelect, false);
	
	//Populate generator selections
	var selections = document.getElementById("generator-selections");
	for (var folder in window.RANDOM.generators)
	{
		for (var generator in window.RANDOM.generators[folder])
		{
			var meta = window.RANDOM.generators[folder][generator];
			var child = document.createElement("div");
			child.className = "generator-selection-item";
			child.innerHTML = "<b><a href=\"?id=" + folder + "/" + generator + "\">" + meta.name + "</a></b>: " + meta.description;
			selections.appendChild(child);
		}
		selections.appendChild(document.createElement("br"));
	}
	
	//Load generator requested by params
	var id;
	var params = window.location.search.substr(1).split("&");
	for (var i in params)
	{
		var split = params[i].split("=");
		if (split[0] == "id")
		{
			id = decodeURIComponent(split[1]);
			window.RANDOM.loadGeneratorFromUrl(id, true, onGenerate);
			break;
		}
	}
}