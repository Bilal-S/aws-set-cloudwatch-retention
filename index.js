"use strict";

const configData = require("./config.json");
const AWS = require("aws-sdk");
const _ = require("lodash");
const retentionOptions = [1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1827, 3653];

//use bluebird as promise library
AWS.config.setPromisesDependency(require('bluebird'));

// set configData to defaults (30 days, 50 log files)
if (_.isUndefined(configData.retentionDays)) configData.retentionDays = 30;
if (_.isUndefined(configData.maxLogs)) configData.maxLogs = 50;
if (_.isUndefined(configData.region)) configData.region = "us-east-1";
if (_.isUndefined(configData.ignoreShorterPeriods)) configData.ignoreShorterPeriods = true;

// check for valid value in retention options
if (_.isNumber(configData.retentionDays)) {
    configData.retentionDays = _.toInteger(configData.retentionDays)
} else {
    console.log(`Cannot accept non-numeric retention period ${configData.retentionDays}`);
    process.exit(1);
} 

if (retentionOptions.indexOf(configData.retentionDays) === -1) {
    console.log(` ${configData.retentionDays} is an invalid retention period please use one of the valid options: ${retentionOptions}`);
    process.exit(1);
}


// instantiate cloudwatch access. We will use security and access keys from environment CLI
const cloudwatch = new AWS.CloudWatchLogs({region: configData.region});


/**
 * Gets total list of log groups
 *
 * @param {number} iterationCount - managed by function for recursive calls
 * @param {string} nextToken - managed by function for recursive calls: next batch of logs start
 */
async function listLogs(iterationCount, nextToken) {
    
    
    if (typeof iterationCount === "undefined") {
        iterationCount =0;
    }


    let params = {
        limit: 50,
        logGroupNamePrefix: '/'
    };    

    // assign next token if we have one
    if (typeof nextToken !== "undefined") {
        params.nextToken = nextToken;
    }  

    const cwlpromise = cloudwatch.describeLogGroups(params).promise();

    return cwlpromise.then(async (data) => {
        
        let moreData =[];
        let returnArray=[];

        if ((iterationCount <= configData.maxLogs) && (typeof data.nextToken !== 'undefined')) {
            // we have more logs, call this again recursively            
            params.nextToken = data.nextToken;
            iterationCount = iterationCount + params.limit; //
            console.log("MORE");
            moreData = await listLogs(iterationCount, params.nextToken);
            // add returned logs to our data
            returnArray = _.concat(data.logGroups, moreData);
             
            //return final data
            return Promise.resolve(returnArray);
        } else { 
            // simple resolve promise no next batch
            return Promise.resolve(data.logGroups);
        }
        
    }).catch((err) =>{
        console.log(err);
        return Promise.reject(err);
    }); 
    
}

/**
 * set actual retention period fo
 * we process one at a time rather than parallel
 * 
 * @param {object} logGroup - single log group for which we are setting retention
 *
 */
async function setRetention(logGroup){
    
    let  params = {
        logGroupName: logGroup.logGroupName,
        retentionInDays: configData.retentionDays
    };

    const cwlpromise = cloudwatch.putRetentionPolicy(params).promise();

    // call aws
    return cwlpromise.then(async (data) => {

          return Promise.resolve(logGroup.logGroupName);

    }).catch((err) =>{
        console.log(err);
        return Promise.reject(err);
    });     



}



/**
 * Main processing function
 *
 */
async function main(){
    let retentionDays = 0;
    let operationResult = "";

    let logGroups = await listLogs();   

    console.log(`found ${logGroups.length} log groups`);

    // now process the logs for retention days
    if (configData.retentionDays >0) {
        retentionDays = _.toInteger(configData.retentionDays);
        console.log(`setting log retention to ${retentionDays} days`);

        // iterate through array members (not parallel)
        for (let idx = 0; idx < logGroups.length; idx++) {
            
            // check for shorter periods already set
            if (configData.ignoreShorterPeriods && !_.isUndefined(logGroups[idx].retentionInDays) && logGroups[idx].retentionInDays <= configData.retentionDays ){
                operationResult = "skipping - same or lower retention period already set";
            } else {
                // set 
                operationResult = await setRetention(logGroups[idx]);
            }

            
            console.log(`setting ${idx+1}: ${operationResult}`);
        }

    }
     
    console.log("DONE");
}


//run our code
console.log("START");
main();
