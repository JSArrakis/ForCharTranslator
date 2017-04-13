var fs = require('fs'),
    csv = require('fast-csv');

var fileInput = process.argv[2].split('.');
var fileName = fileInput[0];

var inputTestFileName = fileName + '.txt';
var outputTestFileName = fileName + '-output.txt';


var inputFileName = fileName + '.csv';
var outputFileName = fileName + '-output.csv';

var csvStream,
    csvWrite,
    writableStream,
    startTime,
    endTime,
    stopwatchStart,
    stopwatchStop;

var stream = fs.createReadStream(inputFileName, { encoding: 'binary' });

var row = 0;
var cell = 0;
var decode = 0;
var char = 0;
var change = 0;
var destroy = 0;


var charDict = (function () { //This builds a dictionary using the unicode char value as the key and the replacement char as the value. 

    var charDict = {}

    var alphaNorm = ['B', 'F', 'G', 'H', 'J', 'K', 'L', 'M', 'Q', 'R', 'S', 'T', 'V', 'W', 'X', 'Z', 'b', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm', 'p', 'q', 'r', 's', 't', 'v', 'w', 'x', 'z', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', ' ', '-', '.', "'", ',', ';', ':', '+', '"', '@', '&', '#', '/' ];

    var i;
    var len = alphaNorm.length;

    for (i = 0; i < len; i++) {
        charDict[alphaNorm[i].charCodeAt(0)] = alphaNorm[i];
    }

    function addGroup(source, dest) {
        var i;
        var len = dest.length;

        for (i = 0; i < len; i++) {
            charDict[dest[i]] = source;
        }

    }

    addGroup('A', [65, 192, 193, 194, 195, 196, 197]);
    addGroup('C', [67, 199]);
    addGroup('D', [68, 208]);
    addGroup('E', [69, 200, 201, 202, 203]);
    addGroup('I', [73, 204, 205, 206, 207]);
    addGroup('N', [78, 209]);
    addGroup('O', [79, 210, 211, 212, 213, 214, 216]);
    addGroup('P', [80, 222]);
    addGroup('U', [85, 217, 218, 219, 220]);
    addGroup('Y', [89, 221]);
    addGroup('a', [97, 224, 225, 226, 227, 228, 229]);
    addGroup('c', [99, 231]);
    addGroup('e', [101, 232, 233, 234, 235]);
    addGroup('i', [105, 236, 237, 238, 239]);
    addGroup('n', [110, 241]);
    addGroup('o', [111, 242, 243, 244, 245, 246]);
    addGroup('u', [117, 249, 250, 251, 252]);
    addGroup('y', [121, 253, 255]);
    addGroup('ss', [223]);
    //addGroup('-', [47]);

    return charDict;
})();

function translate(c) {

    if (charDict.hasOwnProperty(c.charCodeAt(0))) {
        return charDict[c.charCodeAt(0)];
    } else {
        destroy++;
        return '';
    }

}

function unescapeHtml(s) {
    return s
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'")
        .replace(/&#39;/g, "'");
}

function removeJunk(s) {
    if (s.charAt(0).toLowerCase() === "a") {
        var c = 0;
        for(var i = 1; i < 4; i++){
            if (c < 4 && s.charAt(i).toLowerCase() === "a" || c < 4 && s.charAt(i).toLowerCase() === "e") {
                c++;
            } else if (c === 4) {
                return "";
            } else {
                return s;
            }
        }
    } else {
        return s;
    }
}

function unaccent(s) {
    var buffer = [];
    var i;
    var len = s.length;

    for (i = 0; i < len; i++) {
        char++;
        var c = s.charAt(i)
        var translated = translate(c);
        buffer.push(translated);
    }

    return buffer.join('');
}
    
function processRow(data, callback) {
    var buffer = [];
    var i;
    var len = data.length;

    for (i = 0; i < len; i++) {

        cell = i;

        var normal = removeJunk(unaccent(unescapeHtml(data[i])));
        buffer.push(normal);
    }

    csvWrite.write(buffer);

    callback();
}

function msToTime(s) {
    var ms = s % 1000;
    s = (s - ms) / 1000;
    var secs = s % 60;
    s = (s - secs) / 60;
    var mins = s % 60;
    s = (s - mins) / 60;
    var hrs = s % 24;
    var days = (s - hrs) / 24;

    return days + ' Days ' + hrs + ' Hours ' + mins + ' Minutes ' + secs + ' Seconds ' + ms + ' Milliseconds';
}

function createMetrics() {
    var currentTime = new Date();
    endTime = (currentTime.getMonth() + 1) + '/' + currentTime.getDate() + '/' + currentTime.getFullYear() + ' ' + currentTime.getHours() + ':' + currentTime.getMinutes() + ':' + currentTime.getSeconds();
    stopwatchStop = currentTime.getTime();
    var runTimeMilli = stopwatchStop - stopwatchStart;
    var totalRunTime = msToTime(runTimeMilli);
    console.log('Rows Processed: ' + row);
    //console.log('Characters Decoded: '+ );
    console.log('Characters Evaluated: ' + char);
    console.log('Characters Removed: ' + destroy);
    console.log('Start Time: ' + startTime);
    console.log('End Time: ' + endTime);
    console.log('Total Run Time: ' + totalRunTime);
}


function csvPull(source) {
    var currentTime = new Date();
    startTime = (currentTime.getMonth() + 1) + '/' + currentTime.getDate() + '/' + currentTime.getFullYear() + ' ' + currentTime.getHours() + ':' + currentTime.getMinutes() + ':' + currentTime.getSeconds();
    stopwatchStart = currentTime.getTime();
    csvWrite = csv.createWriteStream({ headers: true });
    writableStream = fs.createWriteStream(outputFileName);
    csvStream = csv()
        .on("data", function (data) {
            row++;
            csvStream.pause();
            processRow(data, function () {
                    csvStream.resume();
            });
        })
        .on("end", function () {
            console.log('END OF CSV FILE');
            createMetrics();
        });
    csvWrite.pipe(writableStream);
    source.pipe(csvStream);
}
csvPull(stream);
