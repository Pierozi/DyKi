DynamoDB to Kinesis

This library let you batch a full DynamoDB table to dispatch JSON event to Kinesis Stream.

## Benefits

1. Extract full data of table into a Kinesis Stream let you the possiblity to manage data as you want with a buffer of 24hours.

## UseCases

Create a full new ElasticSearchIndex before enable DynamoDB Stream to ES

## Demo

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

