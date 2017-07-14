'use strict'

const AWS = require('aws-sdk');
const DyKi = {};

DyKi.Client = class {
    constructor(tableName, streamName, region) {
        this.tableName = tableName;
        this.streamName = streamName;

        this.dynamodb = new AWS.DynamoDB({
            apiVersion: '2012-08-10',
            region,
        });

        this.kinesis = new AWS.Kinesis({
            apiVersion: '2013-12-02',
            region,
        });
    }

    run(startKey, pageSize = 4) {
        this.startKey = startKey;
        this.pageSize = pageSize;

        this.scan();
    }

    scan() {
        const params = {
            TableName: this.tableName,
            ExclusiveStartKey: {
                uuid: {
                    S: this.startKey,
                },
            },
            ReturnConsumedCapacity: 'TOTAL',
            Limit: this.pageSize,
        };

        this.dynamodb.scan(params, this.scanResult.bind(this));
    }

    scanResult(err, response) {
        if (err) {
            throw err
        }

        let _this = this;

        response.Items.forEach(function(item) {
            console.log(item);
            _this.putKinesisRecord(item);
        });
    }

    putKinesisRecord(item) {
        const record = {
            eventName: 'UPDATE',
            dynamodb: {
                NewImage: item,
            },
        };

        console.log('Put Kinesis Record', record);

        const params = {
            Data: JSON.stringify(record),
            PartitionKey: item.uuid['S'],
            StreamName: this.streamName,
        };

        this.kinesis.putRecord(params, function(err, data) {
            if (err) {
                throw err;
            }
            console.log('Kinesis PutRecord', data);
        });
    }
}

module.exports = DyKi;

