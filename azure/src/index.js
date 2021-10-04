/*
Copyright 2018 VMware, Inc.
SPDX-License-Identifier: MIT
*/

/**
 * Constants
 */
const {
    LIntHttpEnv,
    Collector,
    flattenJson,
    shortenKey,
} = require('./lint');

const BATCH_SIZE_IN_MB = 0.9 * 1024 * 1024;

/**
 * This is the base method that will act as entrypoint for the azure supported trigger.
 * @param context
 * @param eventHubMessages
 * @returns {Promise<void>}
 */
module.exports = async function (context, eventHubMessages) {
    handler(eventHubMessages, context);
};

/**
 * Converts raw json string to json object for blob.
 * @param logText
 * @returns {{}}
 */
const processLogTextAsJson = (logText) => {
    const keys = [];
    const mergedRecords = {};
    try {
        let textJson = JSON.parse(logText);
        textJson = flattenJson(textJson);
        if ((textJson.timestamp) &&
            (typeof textJson.timestamp === 'string')) {
            const numericTimestamp = parseInt(textJson.timestamp, 10);
            textJson.timestamp = numericTimestamp || textJson.timestamp;
        }
        Object.keys(textJson).forEach((key) => {
            let value = textJson[key];
            if (value != null) {
                key = shortenKey(key);
                if (typeof keys[key] !== 'undefined') {
                    value = `${mergedRecords[key]} ${value}`;
                }
                keys.push(key);
            }
            mergedRecords[key] = value;
        });
        return mergedRecords;
    } catch (e) {
        return mergedRecords;
    }
};

/**
 * Processing logs by adding ingest_timestamp,log_type to log json object
 * @param LogRecords
 */
const processLogs = (LogRecords, logSource) => {
    const ingestionTime = Date.now();
    if (typeof LogRecords === 'object') {
        if (LogRecords !== undefined) {
            fetchServiceName(LogRecords);
            LogRecords.ingest_timestamp = ingestionTime;
            LogRecords.log_type = 'azure_log';
            LogRecords.logsource = logSource;
        } else {
            LogRecords.forEach((record) => {
                fetchServiceName(record);
                record.ingest_timestamp = ingestionTime;
                record.log_type = 'azure_log';
                record.logsource = logSource;
            });
        }
    }
};

/**
 * Fetch service name and provider from the resource ID string
 * and adding those properties to event_provider,eventsource.
 * @param LogRecords
 * Example: "resourceId": "/SUBSCRIPTIONS/0E0B74F5-FE07-494D-91BC-8EB65E41438B/RESOURCEGROUPS
 * /TEMPLATE_RESOURCEGROUP/PROVIDERS/MICROSOFT.SEARCH/SEARCHSERVICES/VMWARESEARCH"
 * End Result: event_provider="AZURE_SEARCH" & eventsource="SEARCHSERVICES"
 */
const fetchServiceName = (LogRecords) => {
    var logResourceId = "";
    const activityCategories = ["ADMINISTRATIVE", "SECURITY", "SERVICEHEALTH", "ALERT", "RECOMMENDATION", "POLICY", "AUTOSCALE", "RESOURCEHEALTH"];
    if (LogRecords.resourceId) {
        logResourceId = LogRecords.resourceId;
    } else if (LogRecords.ResourceId) {
        logResourceId = LogRecords.ResourceId;
    } else {
        error('Could not find resourceId for the log record');
    }
    var resourceInfo = logResourceId.substring(1, logResourceId.length);
    var resourceArr = resourceInfo.split('/');
    resourceArr.forEach(resource => {
        if (resource.toUpperCase().startsWith("MICROSOFT.")) {
            LogRecords.event_provider = "AZURE_" + resource.split('.')[1].toUpperCase();
        }
    });
    for (var index = 0; index < activityCategories.length; index++) {
        if (activityCategories[index] === LogRecords.category.toUpperCase()) {
            LogRecords.category = "ACTIVITYLOGS_" + activityCategories[index];
            break;
        }
    }
    if (resourceArr[resourceArr.length - 2].toUpperCase() !== "PROVIDERS") {
        LogRecords.eventsource = resourceArr[resourceArr.length - 2];
    }
};

/**
 *Processing and sending Log to vrli cloud for Event Hub. Logs will be sent in batches.
 * @param ServiceLogs
 * @param collector
 */
const sendServiceLogsFromEventHub = (ServiceLogs, collector, trigger) => {
    var currBatch = [];
    if (ServiceLogs[0].records) {
        ServiceLogs.forEach((message) => {
            message.records.forEach((record) => {
                const data = collector.processLogsJsonFromEventHub(record);
                const sizeInBytes = getBatchSizeInBytes(JSON.stringify(currBatch) + JSON.stringify(data));
                if (sizeInBytes > (BATCH_SIZE_IN_MB)) {
                    collector.postDataToStream("[" + currBatch + "]");
                    currBatch = [];
                }
                currBatch.push(data);
            });
        });
        if (currBatch.length > 0) {
            collector.postDataToStream("[" + currBatch + "]");
        }
    }
};

/**
 * Processing and sending Log to vrli cloud for blob storage.
 * @param serviceLogs
 * @param collector
 * @returns {Promise | Promise<any>}
 */
const sendServiceLogsFromBlobStorage = (serviceLogs, collector, trigger) => {
    var logs;
    var logRecords;
    var logArray = [];
    if (typeof serviceLogs === 'string') {
        logs = serviceLogs.trim().split('\n');
    } else if (Buffer.isBuffer(serviceLogs)) {
        logs = serviceLogs
            .toString('utf8')
            .trim()
            .split('\n');
    } else {
        logs = JSON.stringify(serviceLogs)
            .trim()
            .split('\n');
    }
    logRecords = processLogTextAsJson(logs);
    if (logRecords.records) {
        logArray = logRecords.records;
    } else {
        logs.forEach(log => {
            logArray.push(processLogTextAsJson(log));
        });
    }
    processLogDataForStream(collector, logArray);
};

/**
 * Prepare logs batches and send them to vRLIC
 * @param collector
 * @param logArray
 */
const processLogDataForStream = (collector, logArray) => {
    var currBatch = [];

    logArray.forEach(log => {
        if (log.category == 'NetworkSecurityGroupFlowEvent') {
            var nsgLogs = processNSGLogData(log);
            nsgLogs.forEach(nsg => {
                var data = collector.processLogsJsonFromBlobStorage(nsg);
                const sizeInBytes = getBatchSizeInBytes(JSON.stringify(currBatch) + JSON.stringify(data));
                if (sizeInBytes > (BATCH_SIZE_IN_MB)) {
                    collector.postDataToStream("[" + currBatch + "]");
                    currBatch = [];
                }
                currBatch.push(data);
            });
        } else {
            var data = collector.processLogsJsonFromBlobStorage(log);
            const sizeInBytes = getBatchSizeInBytes(JSON.stringify(currBatch) + JSON.stringify(data));
            if (sizeInBytes > (BATCH_SIZE_IN_MB)) {
                collector.postDataToStream("[" + currBatch + "]");
                currBatch = [];
            }
            currBatch.push(data);
        }
    });
    if (currBatch.length > 0) {
        collector.postDataToStream("[" + currBatch + "]");
    }
}

/**
 *
 * @param batch
 * @returns {*}
 */
const getBatchSizeInBytes = (batch) => {
    const g = batch.replace(/[[\],"]/g, '');
    return g.length;
}

/**
 * When NSG logs will be flowing in, they need to processed and add missing properties in th logs
 * Currently supported versions are 1 & 2. Once logs are processed, it will return the JSON array
 * @param nsgLogs
 * @returns {[]}
 */
const processNSGLogData = (nsgLogs) => {
    //Supported version 1 & 2
    const flowPropertiesName = ["timestamp", "source_ip", "destination_ip", "source_port", "destination_port",
        "protocol", "traffic_flow", "traffic_decision", "flow_state", "packets_source_to_destination",
        "bytes_sent_source_to_destination", "packets_destination_to_source", "bytes_sent_destination_to_source"];
    const legendsName = {
        "protocol": {"T": "TCP", "U": "UDP"}, "traffic_flow": {"I": "Inbound", "O": "Outbound"},
        "traffic_decision": {"A": "Allowed", "D": "Denied"}, "flow_state": {"B": "Begin", "C": "Continuing", "E": "End"}
    };

    var properties = nsgLogs.properties;
    var propertiesData = [];

    if (properties && (properties.Version == 1 || properties.Version == 2)) {
        if (properties.flows && properties.flows.length > 0) {
            properties.flows.forEach(flows1 => {
                var rule = flows1.rule;
                if (flows1.flows && flows1.flows.length > 0) {
                    flows1.flows.forEach(flows2 => {
                        var mac = flows2.mac;
                        if (flows2.flowTuples && flows2.flowTuples.length > 0) {
                            flows2.flowTuples.forEach(flowTuple => {
                                var processedLog = Object.assign({}, nsgLogs);

                                /*removing both keys because these keys are not requires for nsg logs and already
                                getting timestamp with logs
                                 */
                                delete processedLog.properties;
                                delete processedLog.ingest_timestamp;
                                processedLog['rule'] = rule;
                                processedLog['mac'] = mac;
                                processedLog['version'] =
                                    (properties.Version) ? properties.Version : properties.version;

                                var tuples = flowTuple.split(',');
                                for (var l = 0; l < tuples.length; l++) {

                                    //When properties are not blank
                                    if (tuples[l] != '') {
                                        if ((flowPropertiesName[l] == 'timestamp') &&
                                            (typeof tuples[l] === 'string')) {
                                            const timestamp = parseInt(tuples[l], 10);
                                            processedLog[flowPropertiesName[l]] = timestamp || tuples[l];
                                            continue;
                                        }
                                        //Adding legends full name
                                        if (legendsName[flowPropertiesName[l]]) {
                                            processedLog[flowPropertiesName[l]] =
                                                legendsName[flowPropertiesName[l]][tuples[l]];
                                            continue;
                                        }
                                        processedLog[flowPropertiesName[l]] = tuples[l];
                                    }
                                }
                                propertiesData.push(processedLog);
                            });
                        }
                    });
                }
            });
        }
    }
    return propertiesData;
}

class ServiceHttpCollector extends Collector {
    constructor(lintEnv) {
        super('simple', lintEnv);
    }

    //Processing Logs for eventhub
    processLogsJsonFromEventHub(logsJson) {
        if (!logsJson) {
            throw new Error('Event Hub does not have log records. Skip processing the event hub.');
        }
        const logSource = "event_hub";
        processLogs(logsJson, logSource);
        return JSON.stringify(logsJson);
    }

    //Processing logs for blob
    processLogsJsonFromBlobStorage(logsJson) {
        if (!logsJson) {
            throw new Error('JSON blob does not have log records. Skip processing the blob.');
        }
        const logSource = "blob_storage";
        processLogs(logsJson, logSource);
        return JSON.stringify(logsJson);
    }
}

/**
 * Error handeling.
 * @param error
 * @param context
 */
const handleError = (error, context) => {
    console.log(error);
    context.fail(error);
};

/**
 * To invoke appropriate method based on the trigger.
 * @param event
 * @param context
 * @param lintEnv
 */
const activeTrigger = (event, context, lintEnv) => {
    const collector = new ServiceHttpCollector(lintEnv);
    const trigger = findTriggerType();
    switch (trigger) {
        case 'blobTrigger':
            sendServiceLogsFromBlobStorage(event, collector, trigger);
            break;
        case 'eventHubTrigger' :
            sendServiceLogsFromEventHub(event, collector, trigger);
            break;
        default:
            break;
    }
}

/**
 * Fetching the type of trigger.
 * @returns {*}
 */
const findTriggerType = () => {
    let fs = require('fs');
    let rawdata = fs.readFileSync(__dirname + '/function.json', 'utf8');
    let triggerType = JSON.parse(rawdata.replace(/^\ufeff/g, ""));
    return triggerType.bindings[0].type;
};

/**
 * Handler method is used to get the environment variables and raw logs from source
 * and send it ahead for processing.
 * @param event
 * @param context
 */
const handler = (event, context) => {
    const apiToken = process.env.vRealize_Log_Insight_Cloud_API_Token;
    if (!apiToken) {
        handleError('The API token is missing. Please configure it in an environment variable of the function');
        return;
    }

    const ingestionUrl = process.env.vRealize_Log_Insight_Cloud_API_Url;
    if (!ingestionUrl) {
        handleError('The Ingestion Url is missing. Please configure it in an environment variable of the function');
        return;
    }

    const tagRegexMap = new Map();
    Object.getOwnPropertyNames(process.env).forEach((v) => {
        if (v.startsWith('Tag_')) {
            tagRegexMap.set(v.substring(4), new RegExp(process.env[v], 'i'));
        }
    });

    const lintEnv = new LIntHttpEnv(`Bearer ${apiToken}`, ingestionUrl);

    activeTrigger(event, context, lintEnv);
};
