'use strict'

const when = require('when');
const AWS = require('aws-sdk');
const DyKi = {};

DyKi.Config = {
    dyEventName: 'INSERT',
    dyCapacityUnitLimit: 5,
    delay: 1000,
    progressCallbackInterval: 1000,
};

DyKi.Error = class extends Error {};

DyKi.Client = class {
    constructor(tableName, streamName, region, config = DyKi.Config) {
        this.tableName = tableName;
        this.streamName = streamName;
        this.config = Object.assign({}, DyKi.Config);
        Object.assign(this.config, config);

        this.dynamodb = new AWS.DynamoDB({
            apiVersion: '2012-08-10',
            region,
        });

        this.kinesis = new AWS.Kinesis({
            apiVersion: '2013-12-02',
            region,
        });

        this.lastCapacityUnit = 0;
        this.counter = 0;
        this.EOF = false;
    }

    info() {
        return {
            consumedUnitCapacity: this.lastCapacityUnit,
            total: this.counter,
            lastEvaluatedKey: this.startKey,
        };
    }

    async run(pageSize = 4, startKey = null, progressCallback = null) {
        this.startKey = startKey;
        this.pageSize = pageSize;

        this.lastCapacityUnit = 0;
        this.counter = 0;
        this.EOF = false;

        let progressInterval;

        if ('function' === typeof progressCallback) {
            progressInterval = setInterval(() => {
                progressCallback.call(null, this.info());
            }, this.config.progressCallbackInterval);
        }

        while (!this.EOF && this.lastCapacityUnit <= this.config.dyCapacityUnitLimit) {
            try {
                await this.scan();
            } catch(e) {
                clearInterval(progressInterval);
            }
        }

        clearInterval(progressInterval);
        
        if (this.EOF) {
            return when(this.info());
        }

        if (this.lastCapacityUnit > this.config.dyCapacityUnitLimit) {
            const err = new DyKi.Error(`Scan stoped due to CapacityUnitLimit reach ${this.lastCapacityUnit}`);
            err.code = 'ConsumedCapacityUnitLimitExceeded';

            return when(err).then(e => {
                throw e
            });
        }

        return when(new DyKi.Error('Unknown Internal Error')).then(e => {
            throw e;
        });
    }

    scan() {
        const params = {
            TableName: this.tableName,
            ReturnConsumedCapacity: 'TOTAL',
            Limit: this.pageSize,
        };

        if (this.startKey) {
            params.ExclusiveStartKey = this.startKey;
        }

        return when(params).then(p => {
            this.dynamodb.scan(p, this.scanResult.bind(this));
        }, err => {
            throw err;
        }).delay(this.config.delay);
    }

    scanResult(err, response) {
        if (err) {
            throw err
        }

        let _this = this;
        this.lastCapacityUnit = response.ConsumedCapacity.CapacityUnits;
        this.counter += response.Count;

        if ('LastEvaluatedKey' in response) {
            this.startKey = response.LastEvaluatedKey;
        } else {
            this.EOF = true;
        }

        response.Items.forEach(function(item) {
            _this.putKinesisRecord(item);
        });
    }

    putKinesisRecord(item) {
        const record = {
            eventName: this.dyEventName,
            dynamodb: {
                NewImage: item,
            },
        };

        const params = {
            Data: JSON.stringify(record),
            PartitionKey: item.uuid['S'],
            StreamName: this.streamName,
        };

        this.kinesis.putRecord(params, function(err, data) {
            if (err) {
                throw err;
            }
        });
    }
}

module.exports = DyKi;

