DynamoDB to Kinesis

This library will scan a DynamoDB table to dispatch JSON event to Kinesis Stream.

## Benefits

Extract full data of the table into a Kinesis Stream let you the possibility to manage data as you want with a buffer of 24hours.

## UseCases

Create a complete new ElasticSearch index before enabling DynamoDB Stream to ES.

## Installation

```
npm i -S dyki
```

## Usage

The system is really simple, you just have to Instance a new client with `DyKi.Client`
and specify the DynamoDB table, Kinesis stream name, and the region associate.

A 4th parameter is a configuration object:
    - `delay: number` adjust the delay in millisecond between two scan
    - `dyCapacityUnitLimit: number` defined a dynamodb capacity unit limit to stop scan if it's reached
    - `progressCallbackInterval: number` interval in millisecond for calling progress callback 

then you can call the `run` method to start the scan stream to kinesis.
it returns a promise where your callback will call at the end of a full scan.
(until scan result do not contain lastEvaluatedKey).

The run method can accept 3 optional arguments:
    - the number of results paginates for each scan
    - the ExclusiveStartKey object for dynamoDB (useful to start at a specific point of time)
    - callback function calls in an interval to give information with the following object in argument:
        - `lastEvaluatedKey: ` item primary key from the last scan
        - `total: number` Total of items already analyzed
        - `consumedUnitCapacity: number` The consumed unit capacity of table from the last scan


```javascript
'use strict'

const DyKi = require('../src/main');
const tableName = 'env.project.dynamodb.table';  //Related to your ARN name
const streamName = 'env.project.kinesis.stream'; //Related to your ARN name
const startKey = {
    uuid: {
        "S": 'b379abae-0fa5-48a5-8834-9130d502b4fc'
    }
};

const client = new DyKi.Client(tableName, streamName, 'eu-west-1', {
    delay: 500,
    dyCapacityUnitLimit: 10,
    progressCallbackInterval: 1500,
});

const progressCallback = function(info) {
    console.log('In progress');
    console.log(`Last Key: ${info.lastEvaluatedKey.uuid.S}`);
    console.log(`Total: ${info.total}`);
    console.log(`Unit: ${info.consumedUnitCapacity}`);
    console.log("\n");
};

client.run(25, startKey, progressCallback).then(info => {
    console.log('Finish !!');
    
    console.log(`Last Key: ${info.lastEvaluatedKey.uuid.S}`);
    console.log(`Total: ${info.total}`);
    console.log(`Unit: ${info.consumedUnitCapacity}`);
}, err => {
    console.log(err.message, err.code);
});
```

## Question, Contribution?

If you have any question, recommendation, or improvement.
Or even if you use this class and it's useful for you,
thanks for taking a few minutes to open an issue and share your experience.

Thanks.

